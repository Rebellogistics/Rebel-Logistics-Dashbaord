import pg from 'pg';
import { readFileSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CONNECTION_STRING =
  'postgresql://postgres.hwqmuiezikvyrmnwxhbf:hX3qAo9z1CJY7Ioi@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres';

const client = new pg.Client({
  connectionString: CONNECTION_STRING,
  ssl: { rejectUnauthorized: false },
});

const migrationsDir = join(__dirname, '..', 'supabase', 'migrations');
const files = readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();

console.log(`Connecting to ${CONNECTION_STRING.replace(/:[^:@]+@/, ':****@')}`);
await client.connect();
console.log('Connected.\n');

for (const file of files) {
  const sql = readFileSync(join(migrationsDir, file), 'utf8');
  console.log(`-> Applying ${file}`);
  try {
    await client.query(sql);
    console.log(`   OK`);
  } catch (err) {
    console.error(`   FAILED: ${err.message}`);
    if (
      err.message.includes('already exists') ||
      err.message.includes('duplicate key')
    ) {
      console.error('   (continuing — this is idempotent)');
    } else {
      await client.end();
      process.exit(1);
    }
  }
}

await client.end();
console.log('\nAll migrations applied.');
