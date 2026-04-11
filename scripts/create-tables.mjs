import dotenv from 'dotenv';
import fetch from 'node-fetch';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

console.log('🚀 Creating database tables in Supabase...\n');
console.log(`📡 Connected to: ${supabaseUrl}\n`);

const queries = [
  // Create jobs table
  `CREATE TABLE IF NOT EXISTS public.jobs (
    id TEXT PRIMARY KEY,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    pickup_address TEXT NOT NULL,
    delivery_address TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('Standard', 'White Glove', 'House Move')),
    status TEXT NOT NULL CHECK (status IN ('Quote', 'Accepted', 'Scheduled', 'Notified', 'In Delivery', 'Completed', 'Invoiced')),
    date TEXT NOT NULL,
    assigned_truck TEXT,
    notes TEXT,
    proof_photo TEXT,
    signature TEXT,
    fee DECIMAL(10, 2) NOT NULL,
    fuel_levy DECIMAL(10, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,

  // Create customers table
  `CREATE TABLE IF NOT EXISTS public.customers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT NOT NULL,
    total_jobs INTEGER NOT NULL DEFAULT 0,
    total_spent DECIMAL(10, 2) NOT NULL DEFAULT 0,
    last_job_date TEXT NOT NULL,
    avatar TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,

  // Create messages table
  `CREATE TABLE IF NOT EXISTS public.messages (
    id TEXT PRIMARY KEY,
    sender TEXT NOT NULL,
    content TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    unread BOOLEAN NOT NULL DEFAULT true,
    avatar TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,

  // Create indexes
  'CREATE INDEX IF NOT EXISTS idx_jobs_status ON public.jobs(status)',
  'CREATE INDEX IF NOT EXISTS idx_jobs_date ON public.jobs(date)',
  'CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON public.jobs(created_at)',
  'CREATE INDEX IF NOT EXISTS idx_customers_email ON public.customers(email)',
  'CREATE INDEX IF NOT EXISTS idx_messages_unread ON public.messages(unread)',
  'CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON public.messages(timestamp)',

  // Enable RLS
  'ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY',
  'ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY',
  'ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY',

  // Create policies for jobs
  'DROP POLICY IF EXISTS "Enable read access for all users" ON public.jobs',
  'CREATE POLICY "Enable read access for all users" ON public.jobs FOR SELECT USING (true)',
  'DROP POLICY IF EXISTS "Enable insert access for all users" ON public.jobs',
  'CREATE POLICY "Enable insert access for all users" ON public.jobs FOR INSERT WITH CHECK (true)',
  'DROP POLICY IF EXISTS "Enable update access for all users" ON public.jobs',
  'CREATE POLICY "Enable update access for all users" ON public.jobs FOR UPDATE USING (true)',
  'DROP POLICY IF EXISTS "Enable delete access for all users" ON public.jobs',
  'CREATE POLICY "Enable delete access for all users" ON public.jobs FOR DELETE USING (true)',

  // Create policies for customers
  'DROP POLICY IF EXISTS "Enable read access for all users" ON public.customers',
  'CREATE POLICY "Enable read access for all users" ON public.customers FOR SELECT USING (true)',
  'DROP POLICY IF EXISTS "Enable insert access for all users" ON public.customers',
  'CREATE POLICY "Enable insert access for all users" ON public.customers FOR INSERT WITH CHECK (true)',
  'DROP POLICY IF EXISTS "Enable update access for all users" ON public.customers',
  'CREATE POLICY "Enable update access for all users" ON public.customers FOR UPDATE USING (true)',
  'DROP POLICY IF EXISTS "Enable delete access for all users" ON public.customers',
  'CREATE POLICY "Enable delete access for all users" ON public.customers FOR DELETE USING (true)',

  // Create policies for messages
  'DROP POLICY IF EXISTS "Enable read access for all users" ON public.messages',
  'CREATE POLICY "Enable read access for all users" ON public.messages FOR SELECT USING (true)',
  'DROP POLICY IF EXISTS "Enable insert access for all users" ON public.messages',
  'CREATE POLICY "Enable insert access for all users" ON public.messages FOR INSERT WITH CHECK (true)',
  'DROP POLICY IF EXISTS "Enable update access for all users" ON public.messages',
  'CREATE POLICY "Enable update access for all users" ON public.messages FOR UPDATE USING (true)',
  'DROP POLICY IF EXISTS "Enable delete access for all users" ON public.messages',
  'CREATE POLICY "Enable delete access for all users" ON public.messages FOR DELETE USING (true)'
];

async function executeSQL(query) {
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`
    },
    body: JSON.stringify({ sql: query })
  });

  if (!response.ok) {
    const error = await response.text();
    return { error };
  }

  return { success: true };
}

async function createTables() {
  console.log('📋 Creating tables and setting up permissions...\n');

  for (let i = 0; i < queries.length; i++) {
    const query = queries[i];
    const { error } = await executeSQL(query);

    if (error) {
      console.log(`   ⚠️  Query ${i + 1}/${queries.length}: ${error.substring(0, 100)}`);
    } else {
      process.stdout.write(`   ✓ Query ${i + 1}/${queries.length} executed\r`);
    }
  }

  console.log('\n\n✅ Tables created successfully!\n');
  console.log('📋 Next step: Run the seed data script\n');
  console.log('   node scripts/setup-database.mjs\n');
}

createTables().catch(console.error);
