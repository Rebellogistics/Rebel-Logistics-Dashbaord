const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const configPath = process.argv[2];
const sqlFilePaths = process.argv.slice(3);

if (!configPath || sqlFilePaths.length === 0) {
  console.error('Usage: node db-migrate.cjs <mcp-config> <sql-file> [sql-file...]');
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const directUrl = config.mcpServers.supabase.args.find(
  (a) => typeof a === 'string' && a.startsWith('postgresql://')
);

// Parse the direct URL to extract project ref and password
const match = directUrl.match(
  /postgresql:\/\/postgres:([^@]+)@db\.([^.]+)\.supabase\.co/
);
if (!match) {
  console.error('Could not parse connection string');
  process.exit(1);
}
const [, password, projectRef] = match;

// Try pooler URLs in several regions — Supabase deprecated direct db.* hosts
// so pooler is the only working path.
const regions = [
  'ap-southeast-2',
  'ap-southeast-1',
  'ap-northeast-1',
  'ap-northeast-2',
  'ap-south-1',
  'us-east-1',
  'us-east-2',
  'us-west-1',
  'us-west-2',
  'ca-central-1',
  'sa-east-1',
  'eu-west-1',
  'eu-west-2',
  'eu-west-3',
  'eu-central-1',
  'eu-north-1',
];

async function tryConnect(region) {
  const url = `postgresql://postgres.${projectRef}:${encodeURIComponent(
    password
  )}@aws-0-${region}.pooler.supabase.com:5432/postgres`;
  const client = new Client({
    connectionString: url,
    connectionTimeoutMillis: 5000,
  });
  try {
    await client.connect();
    return client;
  } catch (err) {
    console.log(`(code=${err.code || 'none'} msg="${err.message}")`);
    try {
      await client.end();
    } catch {}
    return null;
  }
}

(async () => {
  let client = null;
  let workingRegion = null;
  for (const region of regions) {
    process.stdout.write(`Trying ${region}... `);
    const c = await tryConnect(region);
    if (c) {
      console.log('OK');
      client = c;
      workingRegion = region;
      break;
    }
    console.log('failed');
  }

  if (!client) {
    console.error('\nCould not connect via any pooler region.');
    process.exit(2);
  }

  console.log(`\nConnected via ${workingRegion} pooler.\n`);

  try {
    for (const sqlPath of sqlFilePaths) {
      const sql = fs.readFileSync(sqlPath, 'utf8');
      console.log(`--- Running ${path.basename(sqlPath)} ---`);
      await client.query(sql);
      console.log(`OK\n`);
    }

    console.log('--- NOTIFY pgrst reload schema ---');
    await client.query(`NOTIFY pgrst, 'reload schema'`);
    console.log('OK\n');

    console.log('--- Verifying columns ---');
    const jobsCols = await client.query(
      `SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='jobs' AND column_name IN ('customer_id','recipient_name','day_prior_sms_sent_at','pricing_type','distance_km') ORDER BY column_name`
    );
    console.log('jobs phase columns:', jobsCols.rows.map((r) => r.column_name).join(', '));
    const custCols = await client.query(
      `SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='customers' AND column_name IN ('type','vip','company_name','abn','source') ORDER BY column_name`
    );
    console.log('customers phase columns:', custCols.rows.map((r) => r.column_name).join(', '));

    console.log('\nDONE');
  } catch (err) {
    console.error('ERROR:', err.message);
    console.error(err.stack);
    process.exit(3);
  } finally {
    await client.end();
  }
})();
