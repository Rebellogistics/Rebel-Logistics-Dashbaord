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
