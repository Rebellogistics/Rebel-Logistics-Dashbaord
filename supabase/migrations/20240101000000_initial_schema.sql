-- Create jobs table
CREATE TABLE IF NOT EXISTS public.jobs (
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
);

-- Create customers table
CREATE TABLE IF NOT EXISTS public.customers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT NOT NULL,
    total_jobs INTEGER NOT NULL DEFAULT 0,
    total_spent DECIMAL(10, 2) NOT NULL DEFAULT 0,
    last_job_date TEXT NOT NULL,
    avatar TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create messages table
CREATE TABLE IF NOT EXISTS public.messages (
    id TEXT PRIMARY KEY,
    sender TEXT NOT NULL,
    content TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    unread BOOLEAN NOT NULL DEFAULT true,
    avatar TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_jobs_status ON public.jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_date ON public.jobs(date);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON public.jobs(created_at);
CREATE INDEX IF NOT EXISTS idx_customers_email ON public.customers(email);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON public.messages(unread);
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON public.messages(timestamp);

-- Enable Row Level Security (RLS)
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (you can modify these later for authentication)
CREATE POLICY "Enable read access for all users" ON public.jobs
    FOR SELECT USING (true);

CREATE POLICY "Enable insert access for all users" ON public.jobs
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for all users" ON public.jobs
    FOR UPDATE USING (true);

CREATE POLICY "Enable delete access for all users" ON public.jobs
    FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON public.customers
    FOR SELECT USING (true);

CREATE POLICY "Enable insert access for all users" ON public.customers
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for all users" ON public.customers
    FOR UPDATE USING (true);

CREATE POLICY "Enable delete access for all users" ON public.customers
    FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON public.messages
    FOR SELECT USING (true);

CREATE POLICY "Enable insert access for all users" ON public.messages
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for all users" ON public.messages
    FOR UPDATE USING (true);

CREATE POLICY "Enable delete access for all users" ON public.messages
    FOR DELETE USING (true);
