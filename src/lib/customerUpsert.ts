import { supabase } from './supabase';

interface UpsertParams {
  name: string;
  phone?: string;
  email?: string;
  source?: string;
}

export async function upsertCustomerByPhone(params: UpsertParams): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('upsert_customer_by_phone', {
      p_name: params.name,
      p_phone: params.phone ?? null,
      p_email: params.email ?? null,
      p_source: params.source ?? null,
    });
    if (error) {
      console.warn('upsert_customer_by_phone failed', error);
      return null;
    }
    if (typeof data === 'string') return data;
    if (data && typeof data === 'object' && 'id' in (data as any)) {
      return String((data as any).id);
    }
    return null;
  } catch (err) {
    console.warn('upsert_customer_by_phone threw', err);
    return null;
  }
}
