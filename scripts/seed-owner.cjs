// Seed the first owner account by signing up via the Supabase anon client.
// The first-user-wins trigger on auth.users in the Phase 8a migration will
// auto-create a profile row with role='owner' for this user.
//
// Usage:
//   node scripts/seed-owner.cjs <email> <password>
//
// Prerequisites:
//   1. Phase 8a migration must already be applied to the database.
//   2. Supabase dashboard → Authentication → Providers → Email → Confirm email
//      must be toggled OFF, otherwise the account cannot sign in until the
//      confirmation link is clicked.
//
// The script does NOT persist the password anywhere. It lives in shell
// history only. Clear shell history after running if you care.

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

function parseEnv(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, 'utf8');
  const env = {};
  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

const email = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
  console.error('Usage: node scripts/seed-owner.cjs <email> <password>');
  process.exit(1);
}

const envPath = path.join(__dirname, '..', '.env');
const env = parseEnv(envPath);
const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env');
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

(async () => {
  console.log(`Signing up ${email}…`);
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    console.error('SIGNUP FAILED:', error.message);
    if (error.message?.toLowerCase().includes('already registered')) {
      console.error(
        '\nIf this account already exists, sign in with it at /login. ' +
        'If you need to start over, delete the user from Supabase dashboard → ' +
        'Authentication → Users and re-run this script.'
      );
    }
    if (error.message?.toLowerCase().includes('confirm')) {
      console.error(
        '\nEmail confirmation appears to be enabled. Go to Supabase dashboard → ' +
        'Authentication → Providers → Email and toggle OFF "Confirm email", ' +
        'then re-run this script.'
      );
    }
    process.exit(2);
  }

  if (!data.user) {
    console.error('No user returned from signUp; something unexpected happened.');
    process.exit(3);
  }

  console.log('\nSUCCESS');
  console.log('  user id:', data.user.id);
  console.log('  email:', data.user.email);
  console.log(
    '\nThe first-user-wins trigger has created a profile row with role=owner.'
  );
  console.log('You can now sign in at http://localhost:3000/login');
})();
