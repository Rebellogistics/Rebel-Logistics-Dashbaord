import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// The marketing pages are pre-rendered in Node at build time, which imports
// this module through the component graph without ever calling it. Only the
// browser gets to hard-fail on missing config; the build must not.
if (!supabaseUrl || !supabaseAnonKey) {
  if (typeof window !== 'undefined') {
    throw new Error('Missing Supabase environment variables. Please check your .env file.');
  }
  console.warn('[supabase] No credentials in this environment — client is inert.');
}

export const supabase = createClient<Database>(
  supabaseUrl ?? 'https://unconfigured.supabase.co',
  supabaseAnonKey ?? 'unconfigured',
);
