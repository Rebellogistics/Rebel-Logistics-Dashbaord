import { useState, type FormEvent } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Truck, LogIn, AlertCircle } from 'lucide-react';
import { useAuth, signInWithPassword } from '@/hooks/useAuth';

export function LoginPage() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isLoading && user) {
    return <Navigate to={from} replace />;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setSubmitting(true);
    setError('');
    try {
      await signInWithPassword(email.trim(), password);
      navigate(from, { replace: true });
    } catch (err) {
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Sign in failed';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-background flex items-center justify-center px-4 font-sans text-rebel-text overflow-hidden">
      {/* Decorative ambient gradients */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -left-24 h-96 w-96 rounded-full blur-3xl opacity-50"
        style={{ background: 'radial-gradient(circle, rgba(45,91,255,0.35), transparent 65%)' }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -right-24 h-[32rem] w-[32rem] rounded-full blur-3xl opacity-40"
        style={{ background: 'radial-gradient(circle, rgba(123,92,255,0.30), transparent 65%)' }}
      />

      <div className="relative w-full max-w-md">
        {/* Brand */}
        <div className="flex items-center justify-center gap-3 mb-7">
          <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-rebel-accent to-rebel-accent-hover flex items-center justify-center text-white shadow-glow">
            <Truck className="w-5 h-5" />
          </div>
          <div className="leading-none">
            <h1 className="font-display font-extrabold text-[20px] tracking-tight text-rebel-text">REBEL</h1>
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-rebel-text-tertiary mt-1">
              Logistics ops
            </p>
          </div>
        </div>

        <div className="rounded-3xl border border-rebel-border bg-card shadow-popover overflow-hidden">
          <div className="px-7 pt-7 pb-2">
            <h2 className="font-display font-bold text-[22px] tracking-tight">Welcome back</h2>
            <p className="text-[12px] text-muted-foreground mt-1.5">
              Sign in with your email and password to open the dashboard.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="px-7 pb-7 pt-5 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-[10px] font-bold uppercase tracking-[0.08em] text-rebel-text-tertiary">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="h-11 text-[13px]"
                autoComplete="username"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-[10px] font-bold uppercase tracking-[0.08em] text-rebel-text-tertiary">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="h-11 text-[13px]"
                autoComplete="current-password"
                required
              />
            </div>

            {error && (
              <div className="rounded-xl bg-rebel-danger-surface ring-1 ring-rebel-danger/20 p-3 flex items-start gap-2 text-[12px] text-rebel-danger">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold">Couldn't sign in</p>
                  <p className="text-[11px] mt-0.5 opacity-90">{error}</p>
                </div>
              </div>
            )}

            <Button
              type="submit"
              disabled={submitting || !email.trim() || !password}
              className="w-full h-11 bg-rebel-accent hover:bg-rebel-accent-hover text-white gap-2 text-[13px] font-semibold shadow-[0_8px_24px_-12px_rgba(45,91,255,0.6)]"
            >
              <LogIn className="w-4 h-4" />
              {submitting ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          <div className="px-7 py-3.5 border-t border-rebel-border bg-muted/40">
            <p className="text-[10.5px] text-center text-rebel-text-tertiary">
              Need help? Contact the owner to get an account.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
