import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Logo } from '@/components/ui/logo';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { useConnectIntegration } from '@/hooks/useIntegrations';
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

export function GoogleOAuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const connectIntegration = useConnectIntegration();
  const [state, setState] = useState<CallbackState>('processing');
  const [errorMsg, setErrorMsg] = useState('');

  const code = searchParams.get('code');
  const stateParam = searchParams.get('state');
  const errorParam = searchParams.get('error');

  useEffect(() => {
    if (errorParam) {
      setErrorMsg(`Google denied access: ${errorParam}`);
      setState('error');
      return;
    }

    if (!code || stateParam !== 'rebel_gcal') {
      setErrorMsg('Invalid callback — missing authorization code.');
      setState('error');
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        // Exchange the auth code for tokens via our own server endpoint.
        // This endpoint holds the client secret and calls Google's token API.
        const res = await fetch('/api/auth/google/exchange', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, redirectUri: `${window.location.origin}/integrations/google/callback` }),
        });

        if (!res.ok) {
          const text = await res.text().catch(() => '');
          throw new Error(
            text ||
              `Token exchange failed (HTTP ${res.status}). The /api/auth/google/exchange endpoint may not be deployed yet.`,
          );
        }

        const { email, refreshToken } = (await res.json()) as {
          email: string;
          refreshToken: string;
        };

        if (cancelled) return;

        // Store the connection in the integrations table
        await connectIntegration.mutateAsync({
          provider: 'google_calendar',
          accountLabel: email,
          metadata: { refreshToken },
        });

        setState('success');
        toast.success(`Connected Google Calendar as ${email}`);

        // Redirect back to Settings → Integrations after a beat
        setTimeout(() => {
          if (!cancelled) navigate('/?tab=settings', { replace: true });
        }, 2000);
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : 'Something went wrong during the connection.';
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
                <h2 className="text-lg font-bold text-red-900">Connection failed</h2>
                <p className="text-sm text-red-800">{errorMsg}</p>
                <button
                  type="button"
                  onClick={() => navigate('/', { replace: true })}
                  className="mt-2 text-sm font-semibold text-rebel-accent hover:underline"
                >
                  Back to dashboard
                </button>
              </>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
