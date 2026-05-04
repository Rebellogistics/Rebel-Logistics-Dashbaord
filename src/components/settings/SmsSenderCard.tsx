import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, ArrowDown, Info, Sparkles } from 'lucide-react';
import { useSmsConfig } from '@/hooks/useSmsConfig';

/**
 * V4 Phase 7.2 — read-only "current SMS sender" indicator on Settings →
 * Integrations. Tells Yamin whether outbound is currently going from his
 * AU number or the alphanumeric "REBEL" sender (post-AU-bundle approval).
 *
 * Drives off the new GET /api/sms/config endpoint. Hidden silently when
 * the endpoint is unavailable (e.g. plain Vite without the api-handlers
 * plugin restart) — no point spamming an error in a status panel.
 */
export function SmsSenderCard() {
  const { data: config, isLoading } = useSmsConfig();
  if (isLoading) {
    return (
      <Card className="border-rebel-border shadow-none bg-card">
        <CardContent className="p-5">
          <p className="text-xs text-muted-foreground">Loading SMS sender…</p>
        </CardContent>
      </Card>
    );
  }
  if (!config) return null;

  const { sender, isAlphanumeric, inboundNumber, overrideActive } = config;

  return (
    <Card
      className={
        'border shadow-none ' +
        (overrideActive
          ? 'border-rebel-accent/40 bg-rebel-accent-surface/20'
          : 'border-rebel-border bg-card')
      }
    >
      <CardContent className="p-5 space-y-3">
        <div className="flex items-start gap-3">
          <div
            className={
              'h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ' +
              (overrideActive ? 'bg-rebel-accent text-white' : 'bg-rebel-accent-surface text-rebel-accent')
            }
          >
            <MessageSquare className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-bold text-sm text-rebel-text">SMS sender</h4>
              {overrideActive && (
                <Badge
                  variant="secondary"
                  className="bg-rebel-accent text-white border-none gap-1 text-[10px]"
                >
                  <Sparkles className="w-3 h-3" />
                  Alphanumeric
                </Badge>
              )}
            </div>
            <p className="text-[11.5px] text-muted-foreground mt-1">
              What customers see when an SMS lands in their inbox.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-lg border border-rebel-border bg-card/60 p-3">
            <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
              Outbound from
            </p>
            <p className="font-mono text-sm font-bold text-rebel-text mt-1 truncate">
              {sender || '— not configured —'}
            </p>
            <p className="text-[10.5px] text-muted-foreground mt-1">
              {isAlphanumeric
                ? '11-char alphanumeric — outbound only.'
                : 'AU phone number — customers can text back here.'}
            </p>
          </div>
          <div className="rounded-lg border border-rebel-border bg-card/60 p-3">
            <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground inline-flex items-center gap-1">
              <ArrowDown className="w-3 h-3" />
              Inbound to
            </p>
            <p className="font-mono text-sm font-bold text-rebel-text mt-1 truncate">
              {inboundNumber || '— not configured —'}
            </p>
            <p className="text-[10.5px] text-muted-foreground mt-1">
              Where customer replies land. Webhook → /api/sms/inbound.
            </p>
          </div>
        </div>

        {isAlphanumeric && (
          <div className="rounded-lg bg-amber-50/60 border border-amber-200 px-3 py-2 text-[11px] text-amber-900 inline-flex items-start gap-2">
            <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-700" />
            <span>
              Customers see <strong className="font-bold">{sender}</strong> on outbound but
              cannot reply directly to alphanumeric senders in AU. Replies route to
              the inbound number above instead — Yamin's auto-reply surfaces it via{' '}
              <code className="font-mono text-[10px] bg-amber-100 px-1 rounded">{'{{owner.phone}}'}</code>.
            </span>
          </div>
        )}

        {!overrideActive && (
          <div className="rounded-lg bg-muted/60 border border-rebel-border px-3 py-2 text-[11px] text-muted-foreground inline-flex items-start gap-2">
            <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>
              Set <code className="font-mono text-[10px] bg-card px-1 rounded">TWILIO_SENDER_ID=REBEL</code> on
              Vercel once the AU sender bundle approves to flip every outbound
              SMS to the alphanumeric brand. No redeploy needed.
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
