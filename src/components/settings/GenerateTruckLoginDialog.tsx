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
import { useCreateTruckLogin, truckLoginEmail } from '@/hooks/useTruckLogin';
import type { Truck } from '@/lib/types';
import { Copy, KeyRound, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface GenerateTruckLoginDialogProps {
  truck: Truck | null;
  onClose: () => void;
}

/**
 * Two-step UX:
 *  1. Confirm  — show the synthetic email, explain "you'll see the password
 *                once," let Yamin cancel out before committing.
 *  2. Reveal   — credentials + Copy buttons. Closing the dialog discards the
 *                password from local memory; Yamin can never re-fetch it.
 */
export function GenerateTruckLoginDialog({ truck, onClose }: GenerateTruckLoginDialogProps) {
  const create = useCreateTruckLogin();
  const [credentials, setCredentials] = useState<{ email: string; password: string } | null>(null);

  useEffect(() => {
    if (!truck) setCredentials(null);
  }, [truck]);

  const handleGenerate = async () => {
    if (!truck) return;
    try {
      const result = await create.mutateAsync({ truckId: truck.id, truckName: truck.name });
      setCredentials({ email: result.email, password: result.password });
      toast.success('Login generated');
    } catch (err) {
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Failed to generate login';
      toast.error(message);
    }
  };

  const handleClose = () => {
    setCredentials(null);
    onClose();
  };

  const proposedEmail = truck ? truckLoginEmail(truck.name) : '';

  return (
    <Dialog open={!!truck} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="w-4 h-4" />
            {credentials ? 'Login generated' : 'Generate truck login'}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {credentials
              ? `Save these credentials — the password is shown once and can't be recovered.`
              : `Create a tablet login for ${truck?.name ?? 'this truck'}.`}
          </DialogDescription>
        </DialogHeader>

        {credentials ? (
          <div className="space-y-3 py-2">
            <CredentialRow label="Email" value={credentials.email} />
            <CredentialRow label="Password" value={credentials.password} mono />
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
              <div>
                <p className="font-semibold">Save this now.</p>
                <p>
                  The password isn't stored anywhere recoverable. Closing this dialog discards it
                  from the browser. To rotate later, generate a new login (the old one stays valid
                  until manually revoked in Supabase).
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3 py-2">
            <div className="rounded-lg border border-rebel-border p-3 space-y-1">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                Login email
              </p>
              <p className="text-sm font-mono break-all">{proposedEmail}</p>
              <p className="text-[11px] text-muted-foreground">
                Synthetic — uses Yamin's domain alias. The address doesn't need a real inbox.
              </p>
            </div>
            <div className="rounded-lg border border-rebel-border p-3 space-y-1">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                Password
              </p>
              <p className="text-sm">Auto-generated · revealed once after you click Generate.</p>
            </div>
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
              <p>
                If your Supabase project has{' '}
                <span className="font-semibold">email confirmation</span> turned on, the login
                won't activate until the link is clicked — and that link goes nowhere unless
                you've configured a catch-all on the domain. Turn confirmation off in
                Supabase → Authentication → Providers → Email before generating.
              </p>
            </div>
          </div>
        )}

        <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
          <Button variant="outline" onClick={handleClose} className="w-full sm:w-auto">
            {credentials ? 'Done — I saved them' : 'Cancel'}
          </Button>
          {!credentials && (
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
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
          {label}
        </p>
        <p className={`text-sm break-all ${mono ? 'font-mono' : ''}`}>{value}</p>
      </div>
      <Button
        size="sm"
        variant="outline"
        className="gap-1.5 shrink-0"
        onClick={handleCopy}
        aria-label={`Copy ${label}`}
      >
        {copied ? (
          <>
            <CheckCircle2 className="w-3.5 h-3.5 text-rebel-success" />
            Copied
          </>
        ) : (
          <>
            <Copy className="w-3.5 h-3.5" />
            Copy
          </>
        )}
      </Button>
    </div>
  );
}
