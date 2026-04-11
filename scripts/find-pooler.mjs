import pg from 'pg';

const PROJECT_REF = 'hwqmuiezikvyrmnwxhbf';
const PASSWORD = 'hX3qAo9z1CJY7Ioi';

const candidates = [];

// New pooler format aws-1-<region>
for (const region of [
  'ap-south-1', 'ap-southeast-1', 'ap-southeast-2', 'ap-northeast-1',
  'ap-northeast-2', 'ap-east-1', 'us-east-1', 'us-west-1',
]) {
  for (const prefix of ['aws-0', 'aws-1']) {
    candidates.push({
      label: `${prefix}-${region} (port 6543)`,
      conn: `postgresql://postgres.${PROJECT_REF}:${encodeURIComponent(PASSWORD)}@${prefix}-${region}.pooler.supabase.com:6543/postgres`,
    });
    candidates.push({
      label: `${prefix}-${region} (port 5432)`,
      conn: `postgresql://postgres.${PROJECT_REF}:${encodeURIComponent(PASSWORD)}@${prefix}-${region}.pooler.supabase.com:5432/postgres`,
    });
  }
}

// Direct IPv6
candidates.push({
  label: 'direct IPv6 db.<ref>.supabase.co',
  conn: `postgresql://postgres:${encodeURIComponent(PASSWORD)}@db.${PROJECT_REF}.supabase.co:5432/postgres`,
});

for (const { label, conn } of candidates) {
  const client = new pg.Client({
    connectionString: conn,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 4000,
  });
  try {
    await client.connect();
    const r = await client.query('SELECT 1 as ok');
    console.log(`[OK] ${label}: ${JSON.stringify(r.rows[0])}`);
    console.log(`\nWORKING CONN:\n${conn}\n`);
    await client.end();
    process.exit(0);
  } catch (err) {
    const msg = err.message.split('\n')[0];
    console.log(`[--] ${label}: ${msg}`);
    try { await client.end(); } catch {}
  }
}
console.log('\nNo connection succeeded.');
process.exit(1);
