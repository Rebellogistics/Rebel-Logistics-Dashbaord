import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  useCreateTruckLogin,
  useResetTruckPassword,
  useTruckCredential,
  truckLoginEmail,
} from '@/hooks/useTruckLogin';
import type { Truck } from '@/lib/types';
import {
  Copy,
  KeyRound,
  CheckCircle2,
  Eye,
  EyeOff,
  RotateCw,
  Pencil,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';

interface GenerateTruckLoginDialogProps {
  truck: Truck | null;
  onClose: () => void;
}

/**
 * Phase 11B + 18 manage-login dialog. Two modes, auto-selected:
 *
 * - **Generate** (truck.userId is null): mints an auth.users account,
 *   sets trucks.user_id, persists the password into truck_credentials,
 *   reveals it once with copy buttons.
 *
 * - **Manage** (truck.userId is set): reveal the persisted password,
 *   rotate to a fresh random one, or set a custom password. All three
 *   go through /api/trucks/reset-password (admin auth update + mirror).
 */
export function GenerateTruckLoginDialog({ truck, onClose }: GenerateTruckLoginDialogProps) {
  const isProvisioned = !!truck?.userId;
  const create = useCreateTruckLogin();
  const reset = useResetTruckPassword();
  // Only fetch the credential when the dialog is open AND the truck has a
  // login — keeps sensitive data off the wire on the Settings list view.
  const credentialQuery = useTruckCredential(truck?.id ?? null, { enabled: !!truck && isProvisioned });

  const [credentials, setCredentials] = useState<{ email: string; password: string } | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [customMode, setCustomMode] = useState(false);
  const [customPassword, setCustomPassword] = useState('');

  useEffect(() => {
    if (!truck) {
      setCredentials(null);
      setRevealed(false);
      setCustomMode(false);
      setCustomPassword('');
    }
  }, [truck]);

  const handleGenerate = async () => {
    if (!truck) return;
    try {
      const result = await create.mutateAsync({ truckId: truck.id, truckName: truck.name });
      setCredentials({ email: result.email, password: result.password });
      setRevealed(true);
      toast.success('Login generated');
    } catch (err) {
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Failed to generate login';
      toast.error(message);
    }
  };

  const handleResetRandom = async () => {
    if (!truck) return;
    if (!confirm('Generate a fresh random password? The current one will stop working immediately on every device.')) return;
    try {
      const result = await reset.mutateAsync({ truckId: truck.id });
      setCredentials({ email: truckLoginEmail(truck.name), password: result.password });
      setRevealed(true);
      toast.success('Password reset');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to reset password';
      toast.error(message);
    }
  };

  const handleSetCustom = async () => {
    if (!truck) return;
    const trimmed = customPassword.trim();
    if (trimmed.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    if (!confirm(`Set the truck's password to the value you typed? The current password will stop working immediately.`)) return;
    try {
      const result = await reset.mutateAsync({ truckId: truck.id, password: trimmed });
      setCredentials({ email: truckLoginEmail(truck.name), password: result.password });
      setRevealed(true);
      setCustomMode(false);
      setCustomPassword('');
      toast.success('Password updated');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to set password';
      toast.error(message);
    }
  };

  const handleClose = () => {
    setCredentials(null);
    setRevealed(false);
    setCustomMode(false);
    setCustomPassword('');
    onClose();
  };

  const proposedEmail = truck ? truckLoginEmail(truck.name) : '';
  // Effective password to render: freshly-set credentials win, otherwise
  // the persisted credential from the DB.
  const livePassword = credentials?.password ?? credentialQuery.data?.password ?? null;
  const passwordUpdatedAt = credentialQuery.data?.updatedAt ?? null;
  const dialogTitle = isProvisioned
    ? `Manage login · ${truck?.name ?? ''}`
    : `Generate truck login`;

  return (
    <Dialog open={!!truck} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="w-4 h-4" />
            {dialogTitle}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {isProvisioned
              ? 'View, rotate, or change the password for this truck.'
              : `Create a tablet login for ${truck?.name ?? 'this truck'}.`}
          </DialogDescription>
        </DialogHeader>

        {!isProvisioned && !credentials && (
          <div className="space-y-3 py-2">
            <div className="rounded-lg border border-rebel-border p-3 space-y-1">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                Login email
              </p>
              <p className="text-sm font-mono break-all">{proposedEmail}</p>
            </div>
            <div className="rounded-lg border border-rebel-border p-3 space-y-1">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                Password
              </p>
              <p className="text-sm">A 14-character random password will be generated and shown once you click below. You can reveal or rotate it later from this dialog.</p>
            </div>
          </div>
        )}

        {isProvisioned && (
          <div className="space-y-3 py-2">
            <CredentialRow label="Email" value={proposedEmail} mono />
            <PasswordRow
              password={livePassword}
              revealed={revealed}
              setRevealed={setRevealed}
              loading={credentialQuery.isLoading}
              missing={!credentialQuery.isLoading && !livePassword}
              updatedAt={credentials ? null : passwordUpdatedAt}
            />

            {customMode ? (
              <div className="rounded-lg border border-rebel-accent bg-rebel-accent-surface/40 p-3 space-y-2">
                <p className="text-[11px] font-semibold text-rebel-accent uppercase tracking-wider">
                  Set a custom password
                </p>
                <Input
                  type="text"
                  value={customPassword}
                  onChange={(e) => setCustomPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="font-mono"
                  autoFocus
                />
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="ghost" onClick={() => { setCustomMode(false); setCustomPassword(''); }}>
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="bg-rebel-accent hover:bg-rebel-accent-hover text-white"
                    onClick={handleSetCustom}
                    disabled={reset.isPending || customPassword.trim().length < 8}
                  >
                    {reset.isPending ? 'Saving…' : 'Set password'}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  className="gap-1.5"
                  onClick={handleResetRandom}
                  disabled={reset.isPending}
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  {reset.isPending ? 'Rotating…' : 'Reset to random'}
                </Button>
                <Button variant="outline" className="gap-1.5" onClick={() => setCustomMode(true)}>
                  <Pencil className="w-3.5 h-3.5" />
                  Set custom password
                </Button>
              </div>
            )}

            {!credentialQuery.isLoading && !livePassword && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900">
                <p>
                  No saved password for this truck. Hit{' '}
                  <span className="font-semibold">Reset to random</span> to set a new one.
                </p>
              </div>
            )}
          </div>
        )}

        {!isProvisioned && credentials && (
          <div className="space-y-3 py-2">
            <CredentialRow label="Email" value={credentials.email} mono />
            <PasswordRow
              password={credentials.password}
              revealed={true}
              setRevealed={() => {/* always shown post-generate */}}
              loading={false}
              missing={false}
              updatedAt={null}
            />
            <div className="rounded-lg bg-rebel-success-surface border border-rebel-success/30 p-3 text-xs text-rebel-success flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <p>Login saved. Reveal or rotate it anytime from this dialog.</p>
            </div>
          </div>
        )}

        <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
          <Button variant="outline" onClick={handleClose} className="w-full sm:w-auto">
            {credentials || isProvisioned ? 'Done' : 'Cancel'}
          </Button>
          {!isProvisioned && !credentials && (
            <Button
              className="bg-rebel-accent hover:bg-rebel-accent-hover text-white w-full sm:w-auto"
              disabled={create.isPending || !truck}
              onClick={handleGenerate}
            >
              {create.isPending ? 'Generating…' : 'Generate login'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CredentialRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Copy failed — select and copy manually');
    }
  };
  return (
    <div className="rounded-lg border border-rebel-border p-3 flex items-center justify-between gap-2">
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
        <p className={cn('text-sm break-all', mono && 'font-mono')}>{value}</p>
      </div>
      <Button size="sm" variant="outline" className="gap-1.5 shrink-0" onClick={handleCopy} aria-label={`Copy ${label}`}>
        {copied ? <><CheckCircle2 className="w-3.5 h-3.5 text-rebel-success" />Copied</> : <><Copy className="w-3.5 h-3.5" />Copy</>}
      </Button>
    </div>
  );
}

function PasswordRow({
  password,
  revealed,
  setRevealed,
  loading,
  missing,
  updatedAt,
}: {
  password: string | null;
  revealed: boolean;
  setRevealed: (next: boolean) => void;
  loading: boolean;
  missing: boolean;
  updatedAt: string | null;
}) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    if (!password) return;
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Copy failed — select and copy manually');
    }
  };
  const updatedLabel = (() => {
    if (!updatedAt) return null;
    try {
      return format(parseISO(updatedAt), 'd MMM yyyy, HH:mm');
    } catch {
      return null;
    }
  })();

  return (
    <div className="rounded-lg border border-rebel-border p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Password</p>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : missing ? (
            <p className="text-sm text-muted-foreground italic">No saved password</p>
          ) : revealed && password ? (
            <p className="text-sm font-mono break-all">{password}</p>
          ) : (
            <p className="text-sm font-mono tracking-widest">••••••••••••••</p>
          )}
          {updatedLabel && (
            <p className="text-[10px] text-muted-foreground mt-0.5">Last updated {updatedLabel}</p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {!missing && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setRevealed(!revealed)}
              aria-label={revealed ? 'Hide password' : 'Reveal password'}
              disabled={loading || !password}
              className="gap-1.5"
            >
              {revealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              {revealed ? 'Hide' : 'Reveal'}
            </Button>
          )}
          {revealed && password && (
            <Button size="sm" variant="outline" onClick={handleCopy} aria-label="Copy password" className="gap-1.5">
              {copied ? <><CheckCircle2 className="w-3.5 h-3.5 text-rebel-success" />Copied</> : <><Copy className="w-3.5 h-3.5" />Copy</>}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
