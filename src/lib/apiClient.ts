import { supabase } from './supabase';

/**
 * Wrapper around fetch() that attaches the current Supabase access token as
 * a Bearer credential so server endpoints under /api/* can identify the user.
 *
 * Server endpoints are responsible for verifying the token via
 * supabase.auth.getUser(token) — see api/_lib/supabase-admin.ts.
 */
export async function apiFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const headers = new Headers(init.headers ?? {});
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  return fetch(path, { ...init, headers });
}

export async function apiPostJson<T>(path: string, body: unknown): Promise<T> {
  const res = await apiFetch(path, { method: 'POST', body: JSON.stringify(body ?? {}) });
  const text = await res.text();
  if (!res.ok) {
    let message = text || `HTTP ${res.status}`;
    try {
      const parsed = JSON.parse(text) as { error?: string };
      if (parsed?.error) message = parsed.error;
    } catch {
      /* keep raw text */
    }
    throw new Error(message);
  }
  return text ? (JSON.parse(text) as T) : ({} as T);
}
