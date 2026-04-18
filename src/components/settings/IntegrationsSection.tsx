import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Calendar,
  FileText,
  MessageSquare,
  Lock,
  ExternalLink,
  Copy,
  CheckCircle2,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

/**
 * Scaffolding UI for Phase 10 (Google Calendar), Phase 11 (Twilio) and
 * Phase 12 (Xero). Each provider shows its real connection state once the
 * credentials Yamen needs to provide land. Until then, every card is locked
 * with inline setup instructions pulled from DEFERRED.md.
 */

interface ProviderState {
  id: 'google_calendar' | 'twilio' | 'xero';
  name: string;
  description: string;
  icon: typeof Calendar;
  iconClass: string;
  envKeys: string[];
  envHint: string;
  checklist: string[];
  consolePath: string;
  /** Once an integrations row exists for the user + provider, flip this true. */
  connected?: boolean;
}

const PROVIDERS: ProviderState[] = [
  {
    id: 'google_calendar',
    name: 'Google Calendar',
    description:
      "Push Accepted and Scheduled jobs into Yamen's calendar. One-way sync, colour-coded by truck, location set to the delivery address so Maps opens on tap.",
    icon: Calendar,
    iconClass: 'bg-rebel-accent-surface text-rebel-accent',
    envKeys: ['GOOGLE_OAUTH_CLIENT_ID', 'GOOGLE_OAUTH_CLIENT_SECRET'],
    envHint:
      'Set these in Vercel → Project → Settings → Environment Variables (all environments).',
    checklist: [
      'Google Cloud Console → same project as the Maps key, enable Google Calendar API.',
      'APIs & Services → OAuth consent screen → External, publish the app.',
      'Credentials → OAuth 2.0 Client ID → Web application.',
      'Authorised redirect URI: https://<prod-domain>/integrations/google/callback',
      'Copy Client ID + Client Secret into Vercel env vars above.',
      'Decide: use Yamen\'s primary Google account, or a dedicated calendar@rebellogistics.com.au?',
    ],
    consolePath: 'https://console.cloud.google.com/apis/credentials',
  },
  {
    id: 'twilio',
    name: 'Twilio SMS',
    description:
      'Replace the dev stub with real SMS. Day-prior + en-route messages go via a Vercel Edge Function so the auth token never hits the browser.',
    icon: MessageSquare,
    iconClass: 'bg-rebel-success-surface text-rebel-success',
    envKeys: ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_FROM'],
    envHint: 'Store server-side in Vercel — never expose the auth token to the browser.',
    checklist: [
      'Twilio Console → finish AU account setup.',
      'Decide: AU long-code number (can receive replies, ~A$6/mo) or Alphanumeric Sender ID "Rebel Logistics" (free, one-way).',
      'Set ACCOUNT_SID, AUTH_TOKEN, and FROM number in Vercel env.',
      'Set Status callback URL on the purchased number → https://<prod-domain>/api/twilio/status',
    ],
    consolePath: 'https://www.twilio.com/console',
  },
  {
    id: 'xero',
    name: 'Xero invoicing',
    description:
      'Send completed jobs as draft Xero invoices — per-job or batched per customer. Sync invoice status back to the dashboard (Draft / Paid / Overdue).',
    icon: FileText,
    iconClass: 'bg-rebel-warning-surface text-rebel-warning',
    envKeys: ['XERO_CLIENT_ID', 'XERO_CLIENT_SECRET'],
    envHint: 'Paste into Vercel env. Tenant ID comes later, once Yamen connects his org.',
    checklist: [
      'developer.xero.com/app/manage → New app → Web app.',
      'Redirect URI: https://<prod-domain>/integrations/xero/callback',
      'Scopes: offline_access accounting.contacts accounting.transactions',
      'Confirm GL account code for "Sales" in Yamen\'s chart (actionables doc assumed 200).',
      'Confirm tax type for GST on income — OUTPUT is the Xero code for 10% GST.',
    ],
    consolePath: 'https://developer.xero.com/app/manage',
  },
];

export function IntegrationsSection() {
  return (
    <div className="space-y-3">
      <div>
        <h3 className="font-bold text-base">Integrations</h3>
        <p className="text-xs text-muted-foreground">
          Connect the external services Rebel relies on. Every provider below is gated on
          credentials Yamen needs to create — see <code className="font-mono">DEFERRED.md</code> in
          the repo for the complete runbook.
        </p>
      </div>

      <EmbedSnippetCard />

      <div className="grid grid-cols-1 gap-3">
        {PROVIDERS.map((provider) => (
          <ProviderCard key={provider.id} provider={provider} />
        ))}
      </div>
    </div>
  );
}

function EmbedSnippetCard() {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://your-app.vercel.app';
  const snippet = `<iframe
  src="${origin}/quote?embed=1"
  width="100%"
  height="900"
  frameborder="0"
  style="border:none; max-width:680px; margin:0 auto; display:block;"
  allow="camera; geolocation"
  title="Rebel Logistics — Request a Quote"
></iframe>`;

  return (
    <Card className="border-rebel-border bg-card shadow-card">
      <CardContent className="p-5 space-y-3">
        <div className="flex items-start gap-3">
          <div className="h-11 w-11 rounded-xl bg-rebel-accent-surface flex items-center justify-center shrink-0">
            <ExternalLink className="w-5 h-5 text-rebel-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-sm text-rebel-text">Website embed</h4>
              <Badge
                variant="secondary"
                className="bg-rebel-success-surface text-rebel-success border-none gap-1 text-[10px]"
              >
                <CheckCircle2 className="w-3 h-3" />
                Ready
              </Badge>
            </div>
            <p className="text-[11.5px] text-muted-foreground mt-1">
              Paste this snippet into any Wordpress page (or any HTML site) to embed the public quote form.
              The <code className="font-mono text-[10px]">?embed=1</code> flag hides the header and footer for a clean fit.
            </p>
          </div>
        </div>

        <div className="relative">
          <pre className="rounded-xl bg-muted border border-rebel-border p-3 text-[10.5px] font-mono leading-relaxed overflow-x-auto whitespace-pre-wrap text-rebel-text-secondary">
            {snippet}
          </pre>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard?.writeText(snippet).then(() => {
                toast.success('Embed snippet copied');
              });
            }}
            className="absolute top-2 right-2 inline-flex items-center gap-1 h-6 px-2 rounded-md bg-card border border-rebel-border text-[10px] font-semibold text-rebel-text-secondary hover:text-rebel-accent hover:border-rebel-accent/40 transition-colors"
          >
            <Copy className="w-3 h-3" />
            Copy
          </button>
        </div>

        <p className="text-[10.5px] text-muted-foreground">
          The form is already live at{' '}
          <a
            href={`${origin}/quote`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-rebel-accent hover:underline font-mono"
          >
            /quote
          </a>
          {' '}— preview it there before embedding. Once embedded, submissions land in your Jobs tab as new quotes.
        </p>
      </CardContent>
    </Card>
  );
}

function ProviderCard({ provider }: { provider: ProviderState }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = provider.icon;
  const connected = !!provider.connected;

  return (
    <Card
      className={cn(
        'border shadow-none bg-card transition-colors',
        connected ? 'border-rebel-success/40' : 'border-rebel-border',
      )}
    >
      <CardContent className="p-5 space-y-3">
        <div className="flex items-start gap-3">
          <div className={cn('h-11 w-11 rounded-xl flex items-center justify-center shrink-0', provider.iconClass)}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-bold text-sm text-rebel-text truncate">{provider.name}</h4>
              {connected ? (
                <Badge
                  variant="secondary"
                  className="bg-rebel-success-surface text-rebel-success border-none gap-1 text-[10px]"
                >
                  <CheckCircle2 className="w-3 h-3" />
                  Connected
                </Badge>
              ) : (
                <Badge
                  variant="secondary"
                  className="bg-muted text-muted-foreground border-none gap-1 text-[10px]"
                >
                  <Lock className="w-3 h-3" />
                  Not connected
                </Badge>
              )}
            </div>
            <p className="text-[11.5px] text-muted-foreground mt-1">{provider.description}</p>
          </div>
          <div className="shrink-0 flex flex-col gap-1.5">
            <Button
              variant="outline"
              size="sm"
              disabled
              className="gap-1.5 cursor-not-allowed"
              title="Blocked on credentials — see DEFERRED.md"
            >
              <Lock className="w-3.5 h-3.5" />
              Connect
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded((v) => !v)}
              className="text-[11px] font-semibold text-muted-foreground hover:text-rebel-text"
            >
              {expanded ? 'Hide setup' : 'Setup steps'}
            </Button>
          </div>
        </div>

        {expanded && (
          <div className="rounded-xl bg-muted/60 border border-rebel-border p-4 space-y-3 text-[11.5px]">
            <div>
              <p className="font-bold uppercase tracking-wider text-[9.5px] text-rebel-text-tertiary mb-1.5">
                Steps
              </p>
              <ol className="list-decimal pl-4 space-y-1 text-rebel-text-secondary">
                {provider.checklist.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            </div>

            <div>
              <p className="font-bold uppercase tracking-wider text-[9.5px] text-rebel-text-tertiary mb-1.5">
                Env vars
              </p>
              <div className="space-y-1">
                {provider.envKeys.map((key) => (
                  <div
                    key={key}
                    className="flex items-center justify-between gap-2 rounded-lg bg-card border border-rebel-border px-2.5 py-1.5 font-mono text-[10.5px]"
                  >
                    <code className="truncate">{key}</code>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(key).then(() => {
                          toast.success(`Copied ${key}`);
                        });
                      }}
                      className="shrink-0 inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-rebel-accent"
                      aria-label={`Copy ${key}`}
                    >
                      <Copy className="w-3 h-3" />
                      Copy
                    </button>
                  </div>
                ))}
              </div>
              <p className="mt-1.5 text-[10.5px] text-muted-foreground">{provider.envHint}</p>
            </div>

            <a
              href={provider.consolePath}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-rebel-accent hover:underline"
            >
              Open console
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
