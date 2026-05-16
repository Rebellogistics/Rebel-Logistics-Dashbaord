// GET /api/r?slug=<slug>
//
// V5 Phase 4: brand-owned URL shortener. Looks the slug up in short_links
// and 301-redirects to its target_url. Public endpoint (no auth) — links
// land in customer SMS templates and need to resolve without a session.
//
// hit_count is incremented best-effort and never blocks the redirect.

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from './_lib/supabase-admin.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const slug = typeof req.query.slug === 'string' ? req.query.slug.trim() : '';
  if (!slug) {
    return res.status(400).json({ error: 'Missing slug query parameter' });
  }

  const admin = supabaseAdmin();
  const { data, error } = await admin
    .from('short_links')
    .select('target_url, hit_count')
    .eq('slug', slug)
    .maybeSingle();

  if (error) {
    return res.status(500).json({ error: 'Lookup failed' });
  }
  if (!data?.target_url) {
    return res.status(404).json({ error: 'Link not found' });
  }

  // Fire-and-forget hit-count bump. Awaiting would add latency to a
  // customer-facing redirect — the count is best-effort analytics.
  void admin
    .from('short_links')
    .update({ hit_count: (data.hit_count ?? 0) + 1 })
    .eq('slug', slug);

  res.setHeader('Cache-Control', 'no-store');
  res.statusCode = 301;
  res.setHeader('Location', data.target_url);
  res.end();
}
