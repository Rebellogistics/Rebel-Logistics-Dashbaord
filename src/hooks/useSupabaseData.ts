import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { upsertCustomerByPhone } from '../lib/customerUpsert';
import { apiPostJson } from '../lib/apiClient';
import type { Job, Customer, Message } from '../lib/types';

/**
 * Best-effort calendar sync. Server decides create/update/delete based on
 * the job's current state. Failures are swallowed so a broken integration
 * doesn't break job updates.
 */
function fireCalendarSync(jobId: string) {
  apiPostJson('/api/calendar/sync', { jobId }).catch((err) => {
    console.warn('Calendar sync failed', err);
  });
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && (value as any).constructor === Object;
}

function toCamelCase<T>(obj: any): T {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) {
    return obj.map((v) => toCamelCase(v)) as any;
  }
  if (isPlainObject(obj)) {
    return Object.keys(obj).reduce((result, key) => {
      const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
      result[camelKey] = toCamelCase(obj[key]);
      return result;
    }, {} as any);
  }
  return obj;
}

function toSnakeCase(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) {
    return obj.map((v) => toSnakeCase(v));
  }
  if (isPlainObject(obj)) {
    return Object.keys(obj).reduce((result, key) => {
      const value = obj[key];
      if (value === undefined) return result;
      const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
      result[snakeKey] = toSnakeCase(value);
      return result;
    }, {} as any);
  }
  return obj;
}

/**
 * Normalise an update payload so explicit `undefined` values become SQL NULL.
 *
 * `toSnakeCase` strips undefined keys (correct on inserts, where missing keys
 * fall back to column defaults). On UPDATE that's wrong: a key the caller
 * explicitly passed with `undefined` means "clear this field," not "skip."
 * Stripping it leaves the old DB value in place, which is how the May 2
 * Truck-Runs duplicate-on-drag bug appeared — `assignedTruck: undefined`
 * was silently dropped, so the row still had its old `assigned_truck` after
 * the move and rendered in two columns.
 *
 * Convention going forward: omit a key to mean "skip"; pass `undefined`
 * (or `null`) to mean "clear." Keep this paired with every UPDATE mutation.
 */
function normaliseUpdates(updates: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(updates)) {
    const value = updates[key];
    out[key] = value === undefined ? null : value;
  }
  return out;
}

// Jobs hooks
export function useJobs() {
  return useQuery<Job[]>({
    queryKey: ['jobs'],
    queryFn: async () => {
      // Phase 14: filter out soft-deleted rows. The Trash view uses a separate
      // query (`useTrashedJobs`) keyed under ['trashed_jobs'].
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return toCamelCase<Job[]>(data || []);
    },
  });
}

export function useCreateJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (job: Omit<Job, 'id' | 'createdAt'>) => {
      // Phase 19: if the caller already linked an existing customer
      // (CustomerCombobox pick), trust their customerId and skip the
      // upsert. Otherwise fall back to find-or-create by phone.
      let customerId = job.customerId ?? null;
      if (!customerId) {
        customerId = await upsertCustomerByPhone({
          name: job.customerName,
          phone: job.customerPhone ?? undefined,
          source: 'phone',
        });
      }

      const payload: Partial<Job> & { id?: string } = { ...job };
      if (customerId) payload.customerId = customerId;

      const jobData = toSnakeCase(payload);
      const { data, error } = await supabase
        .from('jobs')
        .insert([jobData])
        .select()
        .single();

      if (error) throw error;
      return toCamelCase<Job>(data);
    },
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      // Phase 20: new jobs are syncable too. The endpoint decides
      // create-vs-noop based on the job's current state (only Accepted+
      // truck triggers an event), so pushing for every create is safe.
      if (created?.id) fireCalendarSync(created.id);
    },
  });
}

export function useUpdateJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Job> & { id: string }) => {
      const jobData = toSnakeCase(normaliseUpdates(updates as Record<string, unknown>));
      const { data, error } = await supabase
        .from('jobs')
        .update(jobData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return toCamelCase<Job>(data);
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      // Push the updated job into the connected Google Calendar. Server
      // decides the action based on the row (create / update / delete).
      if (vars?.id) fireCalendarSync(vars.id);
    },
  });
}

export function useDeleteJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Phase 14: soft-delete by stamping deleted_at. Main queries filter
      // by `deleted_at IS NULL`, so the row immediately disappears from the
      // dashboard — but lives for ~30 days in Trash for restore.
      // We still ping the calendar sync first so its event is detached
      // (the sync reads assigned_truck and decides to delete when it's gone;
      // we deliberately leave assigned_truck alone here).
      await apiPostJson('/api/calendar/sync', { jobId: id }).catch(() => {
        /* swallow — not blocking the delete */
      });
      const { error } = await supabase
        .from('jobs')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['trashed_jobs'] });
    },
  });
}

/**
 * Phase 14: bulk soft-delete N jobs in one round-trip. Used by the bulk
 * action bar on Jobs and Board. Calendar sync is best-effort per id.
 */
export function useBulkDeleteJobs() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      if (ids.length === 0) return;
      await Promise.allSettled(
        ids.map((id) => apiPostJson('/api/calendar/sync', { jobId: id })),
      );
      const { error } = await supabase
        .from('jobs')
        .update({ deleted_at: new Date().toISOString() })
        .in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['trashed_jobs'] });
    },
  });
}

/** Phase 14: restore N jobs from Trash by clearing deleted_at. */
export function useRestoreJobs() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      if (ids.length === 0) return;
      const { error } = await supabase
        .from('jobs')
        .update({ deleted_at: null })
        .in('id', ids);
      if (error) throw error;
      return ids;
    },
    onSuccess: (ids) => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['trashed_jobs'] });
      // Phase 20: a restored job that's still on a truck should reappear
      // on the calendar. The sync endpoint reads the job's CURRENT state
      // and recreates the event when shouldSync flips back to true.
      for (const id of ids ?? []) fireCalendarSync(id);
    },
  });
}

/** Phase 14: hard-delete jobs (Trash → permanently delete). Irreversible. */
export function usePurgeJobs() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      if (ids.length === 0) return;
      const { error } = await supabase.from('jobs').delete().in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trashed_jobs'] });
    },
  });
}

/** Phase 14: list of jobs currently in Trash. Sorted newest-deleted first. */
export function useTrashedJobs() {
  return useQuery<Job[]>({
    queryKey: ['trashed_jobs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false });
      if (error) throw error;
      return toCamelCase<Job[]>(data || []);
    },
  });
}

// Customers hooks
export function useCustomers() {
  return useQuery<Customer[]>({
    queryKey: ['customers'],
    queryFn: async () => {
      // Phase 14: filter out soft-deleted rows.
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return toCamelCase<Customer[]>(data || []);
    },
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (customer: Omit<Customer, 'id' | 'createdAt'>) => {
      const customerData = toSnakeCase(customer);
      const { data, error } = await supabase
        .from('customers')
        .insert([customerData])
        .select()
        .single();

      if (error) throw error;
      return toCamelCase<Customer>(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Customer> & { id: string }) => {
      const customerData = toSnakeCase(normaliseUpdates(updates as Record<string, unknown>));
      const { data, error } = await supabase
        .from('customers')
        .update(customerData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return toCamelCase<Customer>(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Phase 14: soft-delete. The customer's jobs keep their denormalised
      // customer_name / phone (the FK is intact but the joined customer
      // row is hidden from the main queries).
      const { error } = await supabase
        .from('customers')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['trashed_customers'] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
  });
}

/** Phase 14: bulk soft-delete N customers. */
export function useBulkDeleteCustomers() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      if (ids.length === 0) return;
      const { error } = await supabase
        .from('customers')
        .update({ deleted_at: new Date().toISOString() })
        .in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['trashed_customers'] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
  });
}

/** Phase 14: restore N customers from Trash. */
export function useRestoreCustomers() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      if (ids.length === 0) return;
      const { error } = await supabase
        .from('customers')
        .update({ deleted_at: null })
        .in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['trashed_customers'] });
    },
  });
}

/** Phase 14: hard-delete customers (Trash → permanently delete). Irreversible. */
export function usePurgeCustomers() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      if (ids.length === 0) return;
      const { error } = await supabase.from('customers').delete().in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trashed_customers'] });
    },
  });
}

/** Phase 14: list of customers currently in Trash. */
export function useTrashedCustomers() {
  return useQuery<Customer[]>({
    queryKey: ['trashed_customers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false });
      if (error) throw error;
      return toCamelCase<Customer[]>(data || []);
    },
  });
}

// Messages hooks
export function useMessages() {
  return useQuery<Message[]>({
    queryKey: ['messages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .order('timestamp', { ascending: false });

      if (error) throw error;
      return toCamelCase<Message[]>(data || []);
    },
  });
}

export function useCreateMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (message: Omit<Message, 'id' | 'createdAt'>) => {
      const messageData = toSnakeCase(message);
      const { data, error } = await supabase
        .from('messages')
        .insert([messageData])
        .select()
        .single();

      if (error) throw error;
      return toCamelCase<Message>(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    },
  });
}

export function useMarkMessageAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('messages')
        .update({ unread: false })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    },
  });
}
