-- ==============================================================
-- COPY EVERYTHING BELOW AND PASTE INTO SUPABASE SQL EDITOR
-- ==============================================================
--
-- Instructions:
-- 1. Go to https://app.supabase.com
-- 2. Open your project
-- 3. Click "SQL Editor" in the left sidebar
-- 4. Click "New query"
-- 5. Copy EVERYTHING below (Cmd+A, Cmd+C)
-- 6. Paste into the SQL editor (Cmd+V)
-- 7. Click "Run" or press Cmd+Enter
-- 8. Come back here and tell me "done"
--
-- ==============================================================

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

-- Create policies for public access
DROP POLICY IF EXISTS "Enable read access for all users" ON public.jobs;
CREATE POLICY "Enable read access for all users" ON public.jobs FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert access for all users" ON public.jobs;
CREATE POLICY "Enable insert access for all users" ON public.jobs FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update access for all users" ON public.jobs;
CREATE POLICY "Enable update access for all users" ON public.jobs FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Enable delete access for all users" ON public.jobs;
CREATE POLICY "Enable delete access for all users" ON public.jobs FOR DELETE USING (true);

DROP POLICY IF EXISTS "Enable read access for all users" ON public.customers;
CREATE POLICY "Enable read access for all users" ON public.customers FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert access for all users" ON public.customers;
CREATE POLICY "Enable insert access for all users" ON public.customers FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update access for all users" ON public.customers;
CREATE POLICY "Enable update access for all users" ON public.customers FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Enable delete access for all users" ON public.customers;
CREATE POLICY "Enable delete access for all users" ON public.customers FOR DELETE USING (true);

DROP POLICY IF EXISTS "Enable read access for all users" ON public.messages;
CREATE POLICY "Enable read access for all users" ON public.messages FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert access for all users" ON public.messages;
CREATE POLICY "Enable insert access for all users" ON public.messages FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update access for all users" ON public.messages;
CREATE POLICY "Enable update access for all users" ON public.messages FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Enable delete access for all users" ON public.messages;
CREATE POLICY "Enable delete access for all users" ON public.messages FOR DELETE USING (true);

-- Insert dummy jobs data
INSERT INTO public.jobs (id, customer_name, customer_phone, pickup_address, delivery_address, type, status, date, assigned_truck, fee, fuel_levy, created_at, proof_photo, signature) VALUES
('ORL20589632LY', 'Epul Rohman', '(485) 813-7***', 'Warehouse A', '513 Gunung Walat', 'Standard', 'Completed', '2026-04-10', 'Truck 1', 3.99, 0, '2026-04-09T00:00:00Z', 'https://picsum.photos/seed/delivery1/400/300', 'Epul R.'),
('ORL20589633LY', 'Riko Sapto Dimo', '(982) 625-0***', 'Warehouse B', '0865 Cibadak Mall', 'White Glove', 'In Delivery', '2026-04-10', 'Truck 2', 5.99, 1.5, '2026-04-09T00:00:00Z', NULL, NULL),
('ORL20589634LY', 'Pandi Atuk Senantiasa', '(688) 813-0***', 'Depot C', 'Jl. Merdeka 45', 'House Move', 'Scheduled', '2026-04-10', 'Truck 1', 1.99, 0, '2026-04-10T00:00:00Z', NULL, NULL),
('ORL20589635LY', 'Dede Inon', '(723) 638-4***', 'Warehouse A', 'Fashion District', 'Standard', 'Completed', '2026-04-09', 'Truck 1', 7.99, 2.0, '2026-04-08T00:00:00Z', NULL, NULL),
('ORL20589636LY', 'Ariq Fikriawan Ramdani', '(642) 541-8***', 'Warehouse B', 'Central Plaza', 'Standard', 'Quote', '2026-04-10', NULL, 2.99, 0, '2026-04-10T00:00:00Z', NULL, NULL),
('ORL20589637LY', 'Nazmi Javier', '(370) 924-9***', 'Depot C', 'Food Court', 'Standard', 'Completed', '2026-04-09', 'Truck 2', 0.99, 0, '2026-04-08T00:00:00Z', NULL, NULL);

-- Insert dummy customers data
INSERT INTO public.customers (id, name, email, phone, total_jobs, total_spent, last_job_date, avatar, created_at) VALUES
('C1', 'Epul Rohman', 'epul@example.com', '(485) 813-7***', 12, 450.50, '2026-04-09', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Epul', NOW()),
('C2', 'Riko Sapto Dimo', 'riko@example.com', '(982) 625-0***', 8, 320.00, '2026-04-10', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Riko', NOW()),
('C3', 'Pandi Atuk', 'pandi@example.com', '(688) 813-0***', 5, 150.00, '2026-04-10', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Pandi', NOW());

-- Insert dummy messages data
INSERT INTO public.messages (id, sender, content, timestamp, unread, avatar, created_at) VALUES
('M1', 'Epul Rohman', 'Is the delivery on track for today?', '2026-04-10T00:00:00Z', true, 'https://api.dicebear.com/7.x/avataaars/svg?seed=Epul', NOW()),
('M2', 'Riko Sapto', 'Thanks for the quick delivery!', '2026-04-09T00:00:00Z', false, 'https://api.dicebear.com/7.x/avataaars/svg?seed=Riko', NOW());
