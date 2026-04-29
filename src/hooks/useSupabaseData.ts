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

// Jobs hooks
export function useJobs() {
  return useQuery<Job[]>({
    queryKey: ['jobs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
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
      const customerId = await upsertCustomerByPhone({
        name: job.customerName,
        phone: job.customerPhone,
        source: 'phone',
      });

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}

export function useUpdateJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Job> & { id: string }) => {
      const jobData = toSnakeCase(updates);
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
      // Best-effort: ask the calendar to remove its event before we drop the
      // row, since the sync endpoint reads `assigned_truck` and decides to
      // delete when it's gone. The job still has its row at this point so
      // the endpoint can find the event id.
      await apiPostJson('/api/calendar/sync', { jobId: id }).catch(() => {
        /* swallow — not blocking the delete */
      });
      const { error } = await supabase
        .from('jobs')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
  });
}

// Customers hooks
export function useCustomers() {
  return useQuery<Customer[]>({
    queryKey: ['customers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
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
      const customerData = toSnakeCase(updates);
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
      const { error } = await supabase.from('customers').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
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
