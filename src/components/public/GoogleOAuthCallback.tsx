import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Logo } from '@/components/ui/logo';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, AlertCircle, Copy, ExternalLink } from 'lucide-react';
import { apiPostJson } from '@/lib/apiClient';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

/**
 * OAuth callback page for Google Calendar integration.
 *
 * Flow:
 *   1. Google redirects here with `?code=...&state=rebel_gcal`
 *   2. We exchange the code for tokens via a server-side endpoint
 *      (`/api/auth/google/exchange`) — this keeps the client secret safe.
 *   3. The server returns the refresh token + the user's email.
 *   4. We store { provider: 'google_calendar', accountLabel: email }
 *      in the integrations table and redirect back to Settings.
 *
 * Until the server-side exchange endpoint exists, step 2 will fail
 * gracefully and show a clear message. The UI is fully wired.
 */

type CallbackState = 'processing' | 'success' | 'error';
type ErrorKind = 'redirect_mismatch' | 'access_denied' | 'invalid_callback' | 'exchange' | 'other';

export function GoogleOAuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [state, setState] = useState<CallbackState>('processing');
  const [errorMsg, setErrorMsg] = useState('');
  const [errorKind, setErrorKind] = useState<ErrorKind>('other');

  const code = searchParams.get('code');
  const stateParam = searchParams.get('state');
  const errorParam = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  const expectedRedirectUri = useMemo(
    () => `${window.location.origin}/integrations/google/callback`,
    [],
  );

  const classify = (msg: string): ErrorKind => {
    const lower = msg.toLowerCase();
    if (lower.includes('redirect_uri_mismatch') || lower.includes('redirect uri mismatch')) {
      return 'redirect_mismatch';
    }
    if (lower.includes('access_denied') || lower.includes('access denied')) return 'access_denied';
    return 'exchange';
  };

  useEffect(() => {
    if (errorParam) {
      const kind = classify(errorParam + ' ' + (errorDescription ?? ''));
      setErrorKind(kind);
      setErrorMsg(errorDescription || `Google denied access: ${errorParam}`);
      setState('error');
      return;
    }

    if (!code || stateParam !== 'rebel_gcal') {
      setErrorKind('invalid_callback');
      setErrorMsg('Invalid callback — missing authorization code.');
      setState('error');
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        // Exchange the auth code for tokens via our own server endpoint.
        // The endpoint holds the client secret, exchanges the code with
        // Google, and writes the refresh token directly into Supabase. The
        // refresh token NEVER reaches the browser — only the connected
        // account's email comes back.
        const { email } = await apiPostJson<{ email: string }>(
          '/api/auth/google/exchange',
          {
            code,
            redirectUri: `${window.location.origin}/integrations/google/callback`,
          },
        );

        if (cancelled) return;

        // Refresh integrations list so Settings → Integrations reflects the new connection.
        queryClient.invalidateQueries({ queryKey: ['integrations'] });

        setState('success');
        toast.success(`Connected Google Calendar as ${email}`);

        // Redirect back to Settings → Integrations after a beat
        setTimeout(() => {
          if (!cancelled) navigate('/?tab=settings', { replace: true });
        }, 2000);
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : 'Something went wrong during the connection.';
        setErrorKind(classify(message));
        setErrorMsg(message);
        setState('error');
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, stateParam, errorParam]);

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans text-rebel-text">
      <header className="glass border-b border-rebel-border">
        <div className="max-w-lg mx-auto px-4 py-4">
          <Logo variant="full" height={40} className="max-h-[40px]" />
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4">
        <Card className="w-full max-w-md border-border shadow-none bg-card">
          <CardContent className="p-8 text-center space-y-4">
            {state === 'processing' && (
              <>
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-rebel-accent mx-auto" />
                <h2 className="text-lg font-bold">Connecting Google Calendar…</h2>
                <p className="text-sm text-muted-foreground">
                  Exchanging your authorization with Google. This takes a moment.
                </p>
              </>
            )}

            {state === 'success' && (
              <>
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-lg font-bold">Connected</h2>
                <p className="text-sm text-muted-foreground">
                  Google Calendar is linked. Redirecting you back to Settings…
                </p>
              </>
            )}

            {state === 'error' && (
              <>
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                  <AlertCircle className="w-8 h-8 text-red-600" />
                </div>
                <h2 className="text-lg font-bold text-red-900">
                  {errorKind === 'redirect_mismatch'
                    ? 'Redirect URI not registered'
                    : errorKind === 'access_denied'
                      ? 'You cancelled the connection'
                      : 'Connection failed'}
                </h2>

                {errorKind === 'redirect_mismatch' ? (
                  <div className="space-y-3 text-left">
                    <p className="text-sm text-red-800">
                      Google rejected the redirect URL because it isn't on the OAuth client's
                      allow-list. You need to add <span className="font-semibold">this exact URL</span> to
                      your Google Cloud Console OAuth client and try again:
                    </p>
                    <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-2.5 py-1.5">
                      <code className="font-mono text-[11px] truncate flex-1 min-w-0 text-red-900">
                        {expectedRedirectUri}
                      </code>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard?.writeText(expectedRedirectUri).then(() => {
                            toast.success('Redirect URI copied');
                          });
                        }}
                        className="shrink-0 inline-flex items-center gap-1 text-[10px] font-semibold text-red-700 hover:text-red-900"
                      >
                        <Copy className="w-3 h-3" />
                        Copy
                      </button>
                    </div>
                    <ol className="text-xs text-left text-red-900 list-decimal pl-5 space-y-1">
                      <li>
                        Open{' '}
                        <a
                          href="https://console.cloud.google.com/apis/credentials"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-rebel-accent underline inline-flex items-center gap-0.5"
                        >
                          Google Cloud Console — Credentials
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </li>
                      <li>Click the OAuth 2.0 Client ID for "Rebel Logistics Dashboard" (or whichever you set up)</li>
                      <li>Under <span className="font-semibold">Authorised redirect URIs</span>, click <span className="font-semibold">Add URI</span></li>
                      <li>Paste the URL above (it will say <em>{expectedRedirectUri}</em>) and click Save</li>
                      <li>Wait ~30 seconds for Google to propagate, then come back and click Connect again</li>
                    </ol>
                  </div>
                ) : (
                  <p className="text-sm text-red-800">{errorMsg}</p>
                )}

                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => navigate('/', { replace: true })}
                    className="text-sm font-semibold text-rebel-accent hover:underline"
                  >
                    Back to dashboard
                  </button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
