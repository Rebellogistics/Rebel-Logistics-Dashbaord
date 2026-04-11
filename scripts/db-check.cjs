const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const configPath = process.argv[2];
if (!configPath) {
  console.error('Usage: node rebel-db-check.cjs <mcp-config-path>');
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const connectionString = config.mcpServers.supabase.args.find((a) =>
  typeof a === 'string' && a.startsWith('postgresql://')
);

if (!connectionString) {
  console.error('No postgres connection string found in config');
  process.exit(1);
}

const client = new Client({ connectionString });

(async () => {
  try {
    await client.connect();
    console.log('CONNECTED');

    // 1. Check which jobs columns actually exist
    const jobsCols = await client.query(
      `SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='jobs' ORDER BY ordinal_position`
    );
    console.log('\n--- public.jobs columns ---');
    jobsCols.rows.forEach((r) => console.log('  ' + r.column_name));

    // 2. Check which customers columns actually exist
    const custCols = await client.query(
      `SELECT column_name, is_nullable FROM information_schema.columns WHERE table_schema='public' AND table_name='customers' ORDER BY ordinal_position`
    );
    console.log('\n--- public.customers columns ---');
    custCols.rows.forEach((r) => console.log('  ' + r.column_name + ' (nullable=' + r.is_nullable + ')'));

    // 3. Check if sms_log table exists
    const tables = await client.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name`
    );
    console.log('\n--- public tables ---');
    tables.rows.forEach((r) => console.log('  ' + r.table_name));

    // 4. Force PostgREST schema reload
    await client.query(`NOTIFY pgrst, 'reload schema'`);
    console.log('\nNOTIFY pgrst sent');

    // 5. Also try the config-reload form
    await client.query(`NOTIFY pgrst, 'reload config'`);
    console.log('NOTIFY pgrst reload config sent');

    await client.end();
    console.log('DONE');
  } catch (err) {
    console.error('ERROR:', err.message);
    process.exit(2);
  }
})();
