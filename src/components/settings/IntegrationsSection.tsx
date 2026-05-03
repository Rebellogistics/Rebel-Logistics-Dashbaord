import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Calendar,
  Lock,
  ExternalLink,
  Copy,
  CheckCircle2,
  LogOut,
  RefreshCw,
  User,
  ArrowRight,
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
import { TwilioTestSendCard } from './TwilioTestSendCard';

// ──────────────────────────────────────────────────────────────────
// Google Calendar — dynamic connect/disconnect/switch
// ──────────────────────────────────────────────────────────────────

// Phase 19: switched from `calendar.events` (sensitive — needs Google
// verification or test-users gating) to `calendar.app.created` (non-
// sensitive — anyone can connect without verification). The app gets a
// dedicated "Rebel Logistics" secondary calendar and can only see / edit
// events it created. Yamin's other appointments are not exposed to us.
const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/calendar.app.created',
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

  const openJobs = useMemo(() => jobs.filter(isOpenSyncable), [jobs]);

  const oauthUrl = buildGoogleOAuthUrl();
  const isConfigured = !!oauthUrl;
  const isConnected = !!integration;

  const handleConnect = () => {
    if (!oauthUrl) {
      toast.error('Google sign-in is unavailable right now.');
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
      toast.error('Google sign-in is unavailable right now.');
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

        {/* Not connected — single, friendly connect CTA */}
        {!isConnected && !isLoading && (
          <div className="space-y-2">
            <Button
              className="bg-rebel-accent hover:bg-rebel-accent-hover text-white gap-1.5 w-full sm:w-auto"
              onClick={handleConnect}
              disabled={!isConfigured}
            >
              <Calendar className="w-3.5 h-3.5" />
              Connect Google Calendar
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
            <p className="text-[10.5px] text-muted-foreground">
              You'll pick which Google account to use on Google's sign-in screen. Switch accounts
              anytime from here.
            </p>
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
      <TwilioTestSendCard />
    </div>
  );
}
