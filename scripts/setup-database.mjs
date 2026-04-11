import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables in .env file');
  console.error('   Please make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set');
  process.exit(1);
}

console.log('🚀 Setting up Supabase database...\n');
console.log(`📡 Connecting to: ${supabaseUrl}\n`);

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupDatabase() {
  try {
    // Insert jobs data
    console.log('📋 Step 1: Inserting jobs data...');
    const jobs = [
      {
        id: 'ORL20589632LY',
        customer_name: 'Epul Rohman',
        customer_phone: '(485) 813-7***',
        pickup_address: 'Warehouse A',
        delivery_address: '513 Gunung Walat',
        type: 'Standard',
        status: 'Completed',
        date: '2026-04-10',
        assigned_truck: 'Truck 1',
        fee: 3.99,
        fuel_levy: 0,
        created_at: '2026-04-09T00:00:00Z',
        proof_photo: 'https://picsum.photos/seed/delivery1/400/300',
        signature: 'Epul R.'
      },
      {
        id: 'ORL20589633LY',
        customer_name: 'Riko Sapto Dimo',
        customer_phone: '(982) 625-0***',
        pickup_address: 'Warehouse B',
        delivery_address: '0865 Cibadak Mall',
        type: 'White Glove',
        status: 'In Delivery',
        date: '2026-04-10',
        assigned_truck: 'Truck 2',
        fee: 5.99,
        fuel_levy: 1.5,
        created_at: '2026-04-09T00:00:00Z'
      },
      {
        id: 'ORL20589634LY',
        customer_name: 'Pandi Atuk Senantiasa',
        customer_phone: '(688) 813-0***',
        pickup_address: 'Depot C',
        delivery_address: 'Jl. Merdeka 45',
        type: 'House Move',
        status: 'Scheduled',
        date: '2026-04-10',
        assigned_truck: 'Truck 1',
        fee: 1.99,
        fuel_levy: 0,
        created_at: '2026-04-10T00:00:00Z'
      },
      {
        id: 'ORL20589635LY',
        customer_name: 'Dede Inon',
        customer_phone: '(723) 638-4***',
        pickup_address: 'Warehouse A',
        delivery_address: 'Fashion District',
        type: 'Standard',
        status: 'Completed',
        date: '2026-04-09',
        assigned_truck: 'Truck 1',
        fee: 7.99,
        fuel_levy: 2.0,
        created_at: '2026-04-08T00:00:00Z'
      },
      {
        id: 'ORL20589636LY',
        customer_name: 'Ariq Fikriawan Ramdani',
        customer_phone: '(642) 541-8***',
        pickup_address: 'Warehouse B',
        delivery_address: 'Central Plaza',
        type: 'Standard',
        status: 'Quote',
        date: '2026-04-10',
        fee: 2.99,
        fuel_levy: 0,
        created_at: '2026-04-10T00:00:00Z'
      },
      {
        id: 'ORL20589637LY',
        customer_name: 'Nazmi Javier',
        customer_phone: '(370) 924-9***',
        pickup_address: 'Depot C',
        delivery_address: 'Food Court',
        type: 'Standard',
        status: 'Completed',
        date: '2026-04-09',
        assigned_truck: 'Truck 2',
        fee: 0.99,
        fuel_levy: 0,
        created_at: '2026-04-08T00:00:00Z'
      }
    ];

    const { error: jobsError } = await supabase.from('jobs').insert(jobs);
    if (jobsError) {
      if (jobsError.code === '23505') {
        console.log('   ℹ️  Jobs already exist, skipping...');
      } else {
        throw jobsError;
      }
    } else {
      console.log(`   ✅ Inserted ${jobs.length} jobs\n`);
    }

    // Insert customers data
    console.log('📋 Step 2: Inserting customers data...');
    const customers = [
      {
        id: 'C1',
        name: 'Epul Rohman',
        email: 'epul@example.com',
        phone: '(485) 813-7***',
        total_jobs: 12,
        total_spent: 450.50,
        last_job_date: '2026-04-09',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Epul'
      },
      {
        id: 'C2',
        name: 'Riko Sapto Dimo',
        email: 'riko@example.com',
        phone: '(982) 625-0***',
        total_jobs: 8,
        total_spent: 320.00,
        last_job_date: '2026-04-10',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Riko'
      },
      {
        id: 'C3',
        name: 'Pandi Atuk',
        email: 'pandi@example.com',
        phone: '(688) 813-0***',
        total_jobs: 5,
        total_spent: 150.00,
        last_job_date: '2026-04-10',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Pandi'
      }
    ];

    const { error: customersError } = await supabase.from('customers').insert(customers);
    if (customersError) {
      if (customersError.code === '23505') {
        console.log('   ℹ️  Customers already exist, skipping...');
      } else {
        throw customersError;
      }
    } else {
      console.log(`   ✅ Inserted ${customers.length} customers\n`);
    }

    // Insert messages data
    console.log('📋 Step 3: Inserting messages data...');
    const messages = [
      {
        id: 'M1',
        sender: 'Epul Rohman',
        content: 'Is the delivery on track for today?',
        timestamp: '2026-04-10T00:00:00Z',
        unread: true,
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Epul'
      },
      {
        id: 'M2',
        sender: 'Riko Sapto',
        content: 'Thanks for the quick delivery!',
        timestamp: '2026-04-09T00:00:00Z',
        unread: false,
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Riko'
      }
    ];

    const { error: messagesError } = await supabase.from('messages').insert(messages);
    if (messagesError) {
      if (messagesError.code === '23505') {
        console.log('   ℹ️  Messages already exist, skipping...');
      } else {
        throw messagesError;
      }
    } else {
      console.log(`   ✅ Inserted ${messages.length} messages\n`);
    }

    // Verify data
    console.log('📋 Step 4: Verifying data...');
    const { data: jobsData, error: jobsQueryError } = await supabase.from('jobs').select('id');
    const { data: customersData, error: customersQueryError } = await supabase.from('customers').select('id');
    const { data: messagesData, error: messagesQueryError } = await supabase.from('messages').select('id');

    if (jobsQueryError || customersQueryError || messagesQueryError) {
      console.error('   ❌ Error verifying data');
      if (jobsQueryError) console.error('      Jobs:', jobsQueryError.message);
      if (customersQueryError) console.error('      Customers:', customersQueryError.message);
      if (messagesQueryError) console.error('      Messages:', messagesQueryError.message);
    } else {
      console.log(`   ✅ Jobs table: ${jobsData?.length || 0} records`);
      console.log(`   ✅ Customers table: ${customersData?.length || 0} records`);
      console.log(`   ✅ Messages table: ${messagesData?.length || 0} records\n`);
    }

    console.log('🎉 Database setup completed successfully!');
    console.log('\n✨ You can now run: npm run dev\n');

  } catch (error) {
    console.error('\n❌ Error setting up database:', error.message);
    console.error('\n💡 Make sure you have:');
    console.error('   1. Run the schema SQL in Supabase SQL Editor first');
    console.error('   2. Enabled Row Level Security policies');
    console.error('   3. Correct environment variables in .env file\n');
    process.exit(1);
  }
}

setupDatabase();
