import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { DEFAULT_TEMPLATES, SmsTemplateDefinition } from '@/lib/sms';
import { SmsType } from '@/lib/types';

export interface SmsTemplate {
  id: string;
  key: string;
  label: string;
  body: string;
  type: SmsType;
  active: boolean;
  sortOrder: number;
  updatedAt?: string;
}

const FALLBACK: SmsTemplate[] = DEFAULT_TEMPLATES.map((t, i) => ({
  id: `fallback-${t.key}`,
  key: t.key,
  label: t.label,
  body: t.body,
  type: t.type,
  active: true,
  sortOrder: (i + 1) * 10,
}));

export function useSmsTemplates() {
  return useQuery<SmsTemplate[]>({
    queryKey: ['sms_templates'],
    staleTime: 1000 * 60 * 10,
    queryFn: async () => {
      // The table is optional — if the migration hasn't been run, fall back to defaults.
      // Cast to any because the Supabase generated types don't include this table yet.
      const client = supabase as any;
      const { data, error } = await client
        .from('sms_templates')
        .select('*')
        .eq('active', true)
        .order('sort_order', { ascending: true });

      if (error) {
        // Most common: table doesn't exist yet ("relation does not exist").
        // Other errors get logged but we still return defaults so the UI works.
        if (
          error.code === '42P01' ||
          error.message?.includes('does not exist') ||
          error.message?.toLowerCase().includes('relation')
        ) {
          return FALLBACK;
        }
        console.warn('Failed to load SMS templates, using defaults', error);
        return FALLBACK;
      }

      if (!data || data.length === 0) return FALLBACK;

      return data.map((row: Record<string, unknown>) => ({
        id: row.id as string,
        key: row.key as string,
        label: row.label as string,
        body: row.body as string,
        type: row.type as SmsType,
        active: (row.active as boolean) ?? true,
        sortOrder: (row.sort_order as number) ?? 100,
        updatedAt: row.updated_at as string | undefined,
      }));
    },
  });
}

export interface SaveTemplateInput {
  id?: string;
  key: string;
  label: string;
  body: string;
  type: SmsType;
  active?: boolean;
  sortOrder?: number;
}

export function useSaveSmsTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: SaveTemplateInput) => {
      const payload = {
        key: input.key,
        label: input.label,
        body: input.body,
        type: input.type,
        active: input.active ?? true,
        sort_order: input.sortOrder ?? 100,
      };

      const client = supabase as any;
      const { data, error } = input.id && !input.id.startsWith('fallback-')
        ? await client
            .from('sms_templates')
            .update(payload)
            .eq('id', input.id)
            .select()
            .single()
        : await client
            .from('sms_templates')
            .upsert(payload, { onConflict: 'key' })
            .select()
            .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sms_templates'] });
    },
  });
}

/** Pick the right template body for an SmsType, preferring DB rows over defaults. */
export function bodyFor(templates: SmsTemplate[] | undefined, type: SmsType): string {
  if (templates) {
    const match = templates.find((t) => t.type === type && t.active);
    if (match) return match.body;
  }
  const fallback = FALLBACK.find((t) => t.type === type);
  return fallback?.body ?? '';
}
