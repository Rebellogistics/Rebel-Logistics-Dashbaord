import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { sendSms, currentSmsProviderName } from '@/lib/sms';
import { MessageSquare, Send, Info } from 'lucide-react';
import { toast } from 'sonner';

const DEFAULT_BODY = 'Test from Rebel Logistics — please ignore.';

/**
 * Phase 14: a minimal "send a real SMS now" button so Yamin can verify
 * Twilio end-to-end before going live with customer-facing messages.
 *
 * - Uses the existing `sendSms` wrapper which routes through the
 *   `/api/sms/send` Vercel function (auth token stays server-side).
 * - When VITE_SMS_PROVIDER is unset / not "twilio", `sendSms` falls back
 *   to the stub provider; the card surfaces this so a "successful" send
 *   isn't misread as a real message landing.
 * - On Vite-only dev (no `/api/*` runtime), the POST 404s and we surface
 *   the error inline.
 */
export function TwilioTestSendCard() {
  const [to, setTo] = useState('');
  const [body, setBody] = useState(DEFAULT_BODY);
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState<{ ok: boolean; message: string } | null>(null);

  const provider = currentSmsProviderName();
  const isLive = provider === 'twilio';

  const send = async () => {
    if (!to.trim()) {
      toast.error('Enter a phone number first');
      return;
    }
    if (!body.trim()) {
      toast.error('Message body is required');
      return;
    }
    setBusy(true);
    setLast(null);
    try {
      const result = await sendSms({ to: to.trim(), body: body.trim() });
      if (result.status === 'sent') {
        const note = isLive
          ? `Sent via Twilio${result.providerMessageId ? ` (${result.providerMessageId})` : ''}`
          : 'Sent via the dev STUB provider — no real SMS left the dashboard.';
        setLast({ ok: true, message: note });
        toast.success(isLive ? 'SMS sent' : 'Stub send (no real SMS)');
      } else {
        setLast({ ok: false, message: result.errorMessage ?? 'Unknown error' });
        toast.error(result.errorMessage ?? 'Failed to send');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Network error';
      setLast({ ok: false, message: msg });
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="border-rebel-border shadow-none bg-card">
      <CardContent className="p-5 space-y-3">
        <div className="flex items-start gap-3">
          <div className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0 bg-rebel-success-surface text-rebel-success">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-bold text-sm text-rebel-text">Test SMS send</h4>
              <span
                className={
                  'inline-flex items-center gap-1 h-5 px-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider ' +
                  (isLive
                    ? 'bg-rebel-success-surface text-rebel-success'
                    : 'bg-amber-100 text-amber-800')
                }
                title={
                  isLive
                    ? 'VITE_SMS_PROVIDER=twilio — sends will hit your Twilio account.'
                    : 'VITE_SMS_PROVIDER unset — sends are stubbed and never leave the dashboard.'
                }
              >
                {isLive ? 'Twilio live' : 'Stub'}
              </span>
            </div>
            <p className="text-[11.5px] text-muted-foreground mt-1">
              Fire a real SMS to verify the Twilio wiring before going live to customers. Uses the
              existing <code className="text-[10.5px]">/api/sms/send</code> endpoint, so the auth
              token stays server-side. <span className="font-semibold">Requires <code>vercel dev</code></span>{' '}
              locally — plain Vite returns 404 here.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
              Recipient phone (E.164 or AU local)
            </Label>
            <Input
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="04xx xxx xxx or +61 4xx xxx xxx"
              inputMode="tel"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
              Message body
            </Label>
            <Input value={body} onChange={(e) => setBody(e.target.value)} />
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 flex-wrap">
          <p className="text-[10.5px] text-muted-foreground inline-flex items-start gap-1.5">
            <Info className="w-3 h-3 mt-0.5 shrink-0" />
            On the Twilio trial number, you can only send to <span className="font-semibold">verified</span> phone numbers.
          </p>
          <Button
            className="bg-rebel-accent hover:bg-rebel-accent-hover text-white gap-1.5"
            onClick={send}
            disabled={busy}
          >
            <Send className="w-3.5 h-3.5" />
            {busy ? 'Sending…' : 'Send test SMS'}
          </Button>
        </div>

        {last && (
          <div
            className={
              'rounded-lg p-3 text-xs ' +
              (last.ok
                ? 'bg-rebel-success-surface text-rebel-success border border-rebel-success/30'
                : 'bg-rose-50 text-rose-700 border border-rose-200')
            }
          >
            {last.message}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
