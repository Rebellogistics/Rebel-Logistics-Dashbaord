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
  LogOut,
  RefreshCw,
  User,
  ArrowRight,
  AlertTriangle,
  CalendarPlus,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  useIntegration,
  useDisconnectIntegration,
  type Integration,
} from '@/hooks/useIntegrations';
import { useJobs } from '@/hooks/useSupabaseData';
import { apiPostJson } from '@/lib/apiClient';
import { Job } from '@/lib/types';

// ──────────────────────────────────────────────────────────────────
// Google Calendar — dynamic connect/disconnect/switch
// ──────────────────────────────────────────────────────────────────

const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/userinfo.email',
].join(' ');

function buildGoogleOAuthUrl(): string | null {
  const clientId = (import.meta as { env?: Record<string, string | undefined> }).env
    ?.VITE_GOOGLE_OAUTH_CLIENT_ID;
  if (!clientId) return null;

  const origin = window.location.origin;
  const redirectUri = `${origin}/integrations/google/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: GOOGLE_SCOPES,
    access_type: 'offline',
    prompt: 'consent select_account',
    state: 'rebel_gcal',
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

// Statuses whose jobs get a Google Calendar event when assignedTruck is set.
// Mirrors api/calendar/sync.ts. Kept duplicated here so the count badge on
// the Sync Open Jobs button stays accurate without a server round-trip.
const SYNCABLE_STATUSES: Job['status'][] = ['Accepted', 'Scheduled', 'Notified', 'In Delivery'];

function isOpenSyncable(j: Job): boolean {
  return !!j.assignedTruck && SYNCABLE_STATUSES.includes(j.status);
}

function GoogleCalendarCard() {
  const { data: integration, isLoading } = useIntegration('google_calendar');
  const disconnect = useDisconnectIntegration();
  const { data: jobs = [] } = useJobs();
  const [showSetup, setShowSetup] = useState(false);

  const openJobs = useMemo(() => jobs.filter(isOpenSyncable), [jobs]);

  // The exact redirect URI this app will send to Google. Must be whitelisted
  // in Google Cloud Console → APIs & Services → Credentials → OAuth client
  // → Authorised redirect URIs, EXACTLY (http/https, port, no trailing slash).
  const redirectUri = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}/integrations/google/callback`;
  }, []);

  const copyRedirect = () => {
    navigator.clipboard
      ?.writeText(redirectUri)
      .then(() => toast.success('Redirect URI copied'))
      .catch(() => toast.error('Could not copy'));
  };

  const oauthUrl = buildGoogleOAuthUrl();
  const isConfigured = !!oauthUrl;
  const isConnected = !!integration;

  const handleConnect = () => {
    if (!oauthUrl) {
      toast.error(
        'Google OAuth client not configured. Add VITE_GOOGLE_OAUTH_CLIENT_ID to your environment variables.',
      );
      return;
    }
    window.location.href = oauthUrl;
  };

  const handleDisconnect = async () => {
    if (!integration) return;
    if (!confirm('Disconnect this Google account? Calendar sync will stop until you reconnect.'))
      return;
    try {
      await disconnect.mutateAsync(integration.id);
      toast.success('Google Calendar disconnected');
    } catch {
      toast.error('Failed to disconnect');
    }
  };

  const handleSwitch = () => {
    if (!oauthUrl) {
      toast.error('Google OAuth client not configured.');
      return;
    }
    window.location.href = oauthUrl;
  };

  return (
    <Card
      className={cn(
        'border shadow-none bg-card transition-colors',
        isConnected ? 'border-rebel-success/40' : 'border-rebel-border',
      )}
    >
      <CardContent className="p-5 space-y-3">
        <div className="flex items-start gap-3">
          <div className="h-11 w-11 rounded-xl bg-rebel-accent-surface flex items-center justify-center shrink-0">
            <Calendar className="w-5 h-5 text-rebel-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-bold text-sm text-rebel-text truncate">Google Calendar</h4>
              {isLoading ? (
                <Badge
                  variant="secondary"
                  className="bg-muted text-muted-foreground border-none text-[10px]"
                >
                  Loading…
                </Badge>
              ) : isConnected ? (
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
            <p className="text-[11.5px] text-muted-foreground mt-1">
              Push Accepted and Scheduled jobs into your Google Calendar. One-way sync, colour-coded
              by truck, location set to the delivery address so Maps opens on tap.
            </p>
          </div>
        </div>

        {/* Connected state — shows account + actions */}
        {isConnected && integration && (
          <ConnectedAccountStrip
            integration={integration}
            openJobs={openJobs}
            onSwitch={handleSwitch}
            onDisconnect={handleDisconnect}
            disconnecting={disconnect.isPending}
            canSwitch={isConfigured}
          />
        )}

        {/* Not connected — connect button + always-visible redirect URI */}
        {!isConnected && !isLoading && (
          <div className="space-y-3">
            {/* Prominent redirect-URI panel. Common cause of the
                Error 400: redirect_uri_mismatch — this URL must EXACTLY match
                what's in the Google Cloud Console OAuth client. We surface it
                here so it can be copied with one tap. */}
            {isConfigured && (
              <div className="rounded-xl border border-rebel-border bg-muted/40 p-3 space-y-2">
                <p className="text-[11px] font-semibold inline-flex items-center gap-1.5">
                  <AlertTriangle className="w-3 h-3 text-amber-600" />
                  Before you click Connect — add this exact URL to Google
                </p>
                <div className="flex items-center gap-2 rounded-lg bg-card border border-rebel-border px-2.5 py-1.5">
                  <code className="font-mono text-[10.5px] truncate flex-1 min-w-0">
                    {redirectUri}
                  </code>
                  <button
                    type="button"
                    onClick={copyRedirect}
                    className="shrink-0 inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-rebel-accent"
                  >
                    <Copy className="w-3 h-3" />
                    Copy
                  </button>
                </div>
                <p className="text-[10.5px] text-muted-foreground">
                  Paste it into Google Cloud Console → APIs & Services → Credentials → your OAuth
                  client → <span className="font-semibold">Authorised redirect URIs</span> →
                  Save. If you skip this, Google will reject the connect with
                  <em> redirect_uri_mismatch</em>.{' '}
                  <a
                    href="https://console.cloud.google.com/apis/credentials"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-rebel-accent hover:underline inline-flex items-center gap-0.5"
                  >
                    Open the credentials page
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </p>
              </div>
            )}

            {isConfigured ? (
              <Button
                className="bg-rebel-accent hover:bg-rebel-accent-hover text-white gap-1.5 w-full sm:w-auto"
                onClick={handleConnect}
              >
                <Calendar className="w-3.5 h-3.5" />
                Connect Google Calendar
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  className="gap-1.5 w-full sm:w-auto"
                  disabled
                  title="Add VITE_GOOGLE_OAUTH_CLIENT_ID to your env vars first"
                >
                  <Lock className="w-3.5 h-3.5" />
                  Connect Google Calendar
                </Button>
                <div className="flex items-start gap-2 rounded-xl bg-rebel-warning-surface px-3 py-2 text-[11px] text-rebel-warning ring-1 ring-rebel-warning/20">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>
                    OAuth client not configured. Add{' '}
                    <code className="font-mono text-[10px]">VITE_GOOGLE_OAUTH_CLIENT_ID</code> to
                    your Vercel environment variables. See setup steps below.
                  </span>
                </div>
              </>
            )}
            <p className="text-[10.5px] text-muted-foreground">
              You'll choose which Google account to connect on Google's sign-in screen. You can
              switch accounts anytime from here.
            </p>
          </div>
        )}

        {/* Setup steps toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowSetup((v) => !v)}
          className="text-[11px] font-semibold text-muted-foreground hover:text-rebel-text"
        >
          {showSetup ? 'Hide setup steps' : 'Setup steps (one-time)'}
        </Button>

        {showSetup && (
          <div className="rounded-xl bg-muted/60 border border-rebel-border p-4 space-y-3 text-[11.5px]">
            <div>
              <p className="font-bold uppercase tracking-wider text-[9.5px] text-rebel-text-tertiary mb-1.5">
                One-time app setup (Google Cloud Console)
              </p>
              <ol className="list-decimal pl-4 space-y-1 text-rebel-text-secondary">
                <li>Go to Google Cloud Console → create or reuse a project.</li>
                <li>Enable the <strong>Google Calendar API</strong>.</li>
                <li>
                  APIs & Services → OAuth consent screen → External, publish the app.
                </li>
                <li>
                  Credentials → OAuth 2.0 Client ID → Web application.
                </li>
                <li>
                  Authorised redirect URI:{' '}
                  <code className="font-mono text-[10px] bg-card px-1 rounded">
                    {typeof window !== 'undefined' ? window.location.origin : 'https://…'}
                    /integrations/google/callback
                  </code>
                </li>
                <li>
                  Copy the <strong>Client ID</strong> into Vercel as{' '}
                  <code className="font-mono text-[10px]">VITE_GOOGLE_OAUTH_CLIENT_ID</code>
                </li>
                <li>
                  Copy the <strong>Client Secret</strong> into Vercel as{' '}
                  <code className="font-mono text-[10px]">GOOGLE_OAUTH_CLIENT_SECRET</code>{' '}
                  (server-side only)
                </li>
                <li>Redeploy. The Connect button above will activate.</li>
              </ol>
            </div>

            <div className="space-y-1">
              {['VITE_GOOGLE_OAUTH_CLIENT_ID', 'GOOGLE_OAUTH_CLIENT_SECRET'].map((key) => (
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
                  >
                    <Copy className="w-3 h-3" />
                    Copy
                  </button>
                </div>
              ))}
            </div>

            <a
              href="https://console.cloud.google.com/apis/credentials"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-rebel-accent hover:underline"
            >
              Open Google Cloud Console
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ConnectedAccountStrip({
  integration,
  openJobs,
  onSwitch,
  onDisconnect,
  disconnecting,
  canSwitch,
}: {
  integration: Integration;
  openJobs: Job[];
  onSwitch: () => void;
  onDisconnect: () => void;
  disconnecting: boolean;
  canSwitch: boolean;
}) {
  const label = integration.accountLabel || 'Google account';
  const syncLabel = integration.lastSyncAt
    ? `Last sync: ${new Date(integration.lastSyncAt).toLocaleString()}`
    : `Connected ${new Date(integration.connectedAt).toLocaleDateString()}`;

  const [bulkSyncing, setBulkSyncing] = useState(false);

  // The total count we'll attempt — captured at click time so the toast
  // doesn't shift if a job changes during the loop.
  const handleBulkSync = async () => {
    if (openJobs.length === 0) {
      toast.message('No open jobs to sync', {
        description: 'A job is "open" when it has a truck assigned and is Accepted, Scheduled, Notified, or In Delivery.',
      });
      return;
    }
    if (
      !confirm(
        `Push ${openJobs.length} open job${openJobs.length === 1 ? '' : 's'} to Google Calendar now? Existing events will be updated, missing ones created.`,
      )
    ) {
      return;
    }
    setBulkSyncing(true);
    const total = openJobs.length;
    let done = 0;
    let failed = 0;
    const toastId = toast.loading(`Syncing 0 of ${total}…`);
    for (const job of openJobs) {
      try {
        await apiPostJson('/api/calendar/sync', { jobId: job.id });
        done += 1;
      } catch (err) {
        console.warn('Bulk sync row failed', job.id, err);
        failed += 1;
      }
      toast.loading(`Syncing ${done + failed} of ${total}…`, { id: toastId });
    }
    setBulkSyncing(false);
    if (failed === 0) {
      toast.success(`${done} job${done === 1 ? '' : 's'} pushed to Google Calendar`, { id: toastId });
    } else if (done === 0) {
      toast.error(`All ${failed} pushes failed — check the integration is still connected`, { id: toastId });
    } else {
      toast.warning(`${done} synced, ${failed} failed`, { id: toastId });
    }
  };

  return (
    <div className="rounded-xl bg-rebel-success-surface/50 border border-rebel-success/20 p-3 space-y-3">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-full bg-rebel-success/20 flex items-center justify-center shrink-0">
          <User className="w-4 h-4 text-rebel-success" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[12.5px] font-semibold text-rebel-text truncate">{label}</p>
          <p className="text-[10.5px] text-muted-foreground">{syncLabel}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
          {canSwitch && (
            <Button
              variant="outline"
              size="sm"
              onClick={onSwitch}
              className="gap-1 text-[11px]"
              title="Sign in with a different Google account"
            >
              <RefreshCw className="w-3 h-3" />
              Switch
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={onDisconnect}
            disabled={disconnecting}
            className="gap-1 text-[11px] text-rebel-danger border-rebel-danger/30 hover:bg-rebel-danger-surface hover:text-rebel-danger"
            title="Disconnect this Google account"
          >
            <LogOut className="w-3 h-3" />
            {disconnecting ? '…' : 'Disconnect'}
          </Button>
        </div>
      </div>

      {/* Bulk-sync row — visible whenever the integration is connected */}
      <div className="flex items-center gap-2 flex-wrap rounded-lg bg-card/50 border border-rebel-success/20 px-3 py-2">
        <CalendarPlus className="w-3.5 h-3.5 text-rebel-accent shrink-0" />
        <p className="text-[11px] text-muted-foreground flex-1 min-w-0">
          {openJobs.length === 0
            ? 'No open jobs need syncing right now.'
            : `${openJobs.length} open job${openJobs.length === 1 ? '' : 's'} ready to push (truck assigned, not yet completed).`}
        </p>
        <Button
          size="sm"
          variant="outline"
          onClick={handleBulkSync}
          disabled={bulkSyncing || openJobs.length === 0}
          className="gap-1.5 text-[11px] shrink-0"
          title="One-time backfill — re-pushes every open job's current state to Google Calendar"
        >
          <CalendarPlus className="w-3 h-3" />
          {bulkSyncing ? 'Syncing…' : 'Sync open jobs'}
        </Button>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// Twilio + Xero — static cards (same pattern as before, blocked on creds)
// ──────────────────────────────────────────────────────────────────

interface StaticProviderDef {
  id: string;
  name: string;
  description: string;
  icon: typeof Calendar;
  iconClass: string;
  envKeys: string[];
  envHint: string;
  checklist: string[];
  consolePath: string;
}

const STATIC_PROVIDERS: StaticProviderDef[] = [
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

function StaticProviderCard({ provider }: { provider: StaticProviderDef }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = provider.icon;

  return (
    <Card className="border-rebel-border shadow-none bg-card">
      <CardContent className="p-5 space-y-3">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              'h-11 w-11 rounded-xl flex items-center justify-center shrink-0',
              provider.iconClass,
            )}
          >
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-bold text-sm text-rebel-text truncate">{provider.name}</h4>
              <Badge
                variant="secondary"
                className="bg-muted text-muted-foreground border-none gap-1 text-[10px]"
              >
                <Lock className="w-3 h-3" />
                Not connected
              </Badge>
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
            <ol className="list-decimal pl-4 space-y-1 text-rebel-text-secondary">
              {provider.checklist.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
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
                  >
                    <Copy className="w-3 h-3" />
                    Copy
                  </button>
                </div>
              ))}
            </div>
            <p className="mt-1 text-[10.5px] text-muted-foreground">{provider.envHint}</p>
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

// ──────────────────────────────────────────────────────────────────
// Embed snippet (unchanged)
// ──────────────────────────────────────────────────────────────────

function EmbedSnippetCard() {
  const origin =
    typeof window !== 'undefined' ? window.location.origin : 'https://your-app.vercel.app';
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
              Paste this snippet into any Wordpress page (or any HTML site) to embed the public
              quote form. The <code className="font-mono text-[10px]">?embed=1</code> flag hides the
              header and footer for a clean fit.
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
          {' '}— preview it there before embedding.
        </p>
      </CardContent>
    </Card>
  );
}

// ──────────────────────────────────────────────────────────────────
// Root
// ──────────────────────────────────────────────────────────────────

export function IntegrationsSection() {
  return (
    <div className="space-y-3">
      <div>
        <h3 className="font-bold text-base">Integrations</h3>
        <p className="text-xs text-muted-foreground">
          Connect external services to Rebel Logistics. You choose which account to use for each
          service — switch anytime from here.
        </p>
      </div>

      <EmbedSnippetCard />
      <GoogleCalendarCard />

      {STATIC_PROVIDERS.map((p) => (
        <StaticProviderCard key={p.id} provider={p} />
      ))}
    </div>
  );
}
