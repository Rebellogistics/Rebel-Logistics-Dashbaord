import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

for (const table of ['jobs', 'customers', 'messages']) {
  const { data, error } = await supabase.from(table).select('*');
  if (error) {
    console.log(`${table}: ERROR -> ${error.code} ${error.message}`);
  } else {
    console.log(`${table}: OK (${data.length} rows)`);
  }
}
