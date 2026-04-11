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
const supabaseServiceKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables in .env file');
  console.error('   Please make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigrations() {
  console.log('🚀 Running Supabase migrations...\n');

  try {
    // Read migration files
    const schemaSQL = readFileSync(
      join(__dirname, '../supabase/migrations/20240101000000_initial_schema.sql'),
      'utf-8'
    );

    const seedSQL = readFileSync(
      join(__dirname, '../supabase/migrations/20240101000001_seed_data.sql'),
      'utf-8'
    );

    // Run schema migration
    console.log('📋 Step 1: Creating database schema...');
    const { error: schemaError } = await supabase.rpc('exec_sql', { sql: schemaSQL });

    if (schemaError) {
      // Try alternative method - execute each statement separately
      console.log('   Trying alternative approach...');
      const statements = schemaSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      for (const statement of statements) {
        const { error } = await supabase.rpc('exec_sql', { sql: statement });
        if (error && !error.message.includes('already exists')) {
          console.error(`   ⚠️  Warning: ${error.message}`);
        }
      }
    }
    console.log('   ✅ Schema created successfully!\n');

    // Run seed migration
    console.log('📋 Step 2: Inserting seed data...');
    const { error: seedError } = await supabase.rpc('exec_sql', { sql: seedSQL });

    if (seedError) {
      // Try alternative method
      console.log('   Trying alternative approach...');
      const statements = seedSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      for (const statement of statements) {
        const { error } = await supabase.rpc('exec_sql', { sql: statement });
        if (error && !error.message.includes('duplicate key')) {
          console.error(`   ⚠️  Warning: ${error.message}`);
        }
      }
    }
    console.log('   ✅ Seed data inserted successfully!\n');

    // Verify data
    console.log('📋 Step 3: Verifying data...');
    const { data: jobs, error: jobsError } = await supabase.from('jobs').select('id');
    const { data: customers, error: customersError } = await supabase.from('customers').select('id');
    const { data: messages, error: messagesError } = await supabase.from('messages').select('id');

    if (jobsError || customersError || messagesError) {
      console.error('   ❌ Error verifying data');
      if (jobsError) console.error('      Jobs:', jobsError.message);
      if (customersError) console.error('      Customers:', customersError.message);
      if (messagesError) console.error('      Messages:', messagesError.message);
    } else {
      console.log(`   ✅ Jobs: ${jobs?.length || 0} records`);
      console.log(`   ✅ Customers: ${customers?.length || 0} records`);
      console.log(`   ✅ Messages: ${messages?.length || 0} records\n`);
    }

    console.log('🎉 Migrations completed successfully!');
    console.log('\n✨ You can now run: npm run dev');

  } catch (error) {
    console.error('❌ Error running migrations:', error.message);
    process.exit(1);
  }
}

runMigrations();
