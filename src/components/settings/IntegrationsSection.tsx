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
  CalendarRange,
  Truck as TruckIcon,
  Trash2,
  Sparkles,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  useIntegration,
  useDisconnectIntegration,
  useSetCalendarMode,
  useCleanupLegacyCalendar,
  type CalendarMode,
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
  const cleanup = useCleanupLegacyCalendar();

  // V4 Phase 4 follow-up. Detect the orphan-cleanup state:
  //   per_truck mode + legacy calendar_id still set ⇒ orphan events still
  //   live on the legacy calendar. Surface a tidier "Clean up & sync"
  //   path that does both in one click.
  const calendarMode: CalendarMode =
    (integration.metadata?.calendarMode as CalendarMode | undefined) === 'per_truck'
      ? 'per_truck'
      : 'single';
  const legacyCalendarId = integration.metadata?.calendarId as string | undefined;
  const hasOrphanLegacy = calendarMode === 'per_truck' && !!legacyCalendarId;

  // Internal helper — also used by the "Clean up & sync" action below
  // so we don't duplicate the loop.
  const runBulkSync = async (toastId: string | number, prefix = 'Syncing'): Promise<{ done: number; failed: number }> => {
    const total = openJobs.length;
    let done = 0;
    let failed = 0;
    for (const job of openJobs) {
      try {
        await apiPostJson('/api/calendar/sync', { jobId: job.id });
        done += 1;
      } catch (err) {
        console.warn('Bulk sync row failed', job.id, err);
        failed += 1;
      }
      toast.loading(`${prefix} ${done + failed} of ${total}…`, { id: toastId });
    }
    return { done, failed };
  };

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
    const toastId = toast.loading(`Syncing 0 of ${openJobs.length}…`);
    const { done, failed } = await runBulkSync(toastId);
    setBulkSyncing(false);
    if (failed === 0) {
      toast.success(`${done} job${done === 1 ? '' : 's'} pushed to Google Calendar`, { id: toastId });
    } else if (done === 0) {
      toast.error(`All ${failed} pushes failed — check the integration is still connected`, { id: toastId });
    } else {
      toast.warning(`${done} synced, ${failed} failed`, { id: toastId });
    }
  };

  // V4 Phase 4 follow-up — combined "delete the legacy single calendar
  // (orphan events) AND re-sync the open jobs to per-truck calendars".
  // Two-step but feels like one user action.
  const handleCleanupAndSync = async () => {
    if (
      !confirm(
        'Delete the old single Rebel Logistics calendar and re-sync every open job to its per-truck calendar?\n\n' +
          'Any leftover events on the old calendar will be removed. Open jobs will be re-pushed to Truck 1 / Truck 2 / etc.',
      )
    ) {
      return;
    }
    setBulkSyncing(true);
    const toastId = toast.loading('Deleting legacy calendar…');
    try {
      const result = await cleanup.mutateAsync();
      if (result.action === 'deleted') {
        toast.loading('Legacy calendar deleted — re-syncing open jobs…', { id: toastId });
      } else {
        toast.loading('Nothing to delete — re-syncing open jobs…', { id: toastId });
      }
    } catch (err) {
      console.warn('cleanup-legacy failed', err);
      // Continue to sync regardless — orphan deletion is best-effort.
      toast.loading('Cleanup hiccup, continuing with sync…', { id: toastId });
    }

    if (openJobs.length === 0) {
      setBulkSyncing(false);
      toast.success('Legacy cleaned up · no open jobs to sync', { id: toastId });
      return;
    }
    const { done, failed } = await runBulkSync(toastId, 'Syncing');
    setBulkSyncing(false);
    if (failed === 0) {
      toast.success(`Cleaned up · ${done} job${done === 1 ? '' : 's'} re-synced to per-truck calendars`, {
        id: toastId,
      });
    } else if (done === 0) {
      toast.error(`Legacy cleared but every push failed — check the integration is still connected`, {
        id: toastId,
      });
    } else {
      toast.warning(`Cleaned up · ${done} synced, ${failed} failed`, { id: toastId });
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

      {/* V4 4.1: calendar mode toggle. Single vs per-truck. Switching
          from single to per-truck doesn't move existing events; Yamin
          should click "Sync open jobs" after to backfill. */}
      <CalendarModeToggle integration={integration} />

      {/* V4 Phase 4 follow-up: orphan-cleanup CTA. Only visible after a
          single → per-truck flip when the legacy calendar still exists.
          One button does both: delete the legacy calendar (wipes orphan
          events) AND re-sync open jobs into the per-truck calendars. */}
      {hasOrphanLegacy && (
        <div className="rounded-lg border border-amber-300 bg-amber-50/70 p-3 space-y-2">
          <div className="flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-bold text-amber-900">
                Finish the per-truck migration
              </p>
              <p className="text-[11px] text-amber-800 leading-snug">
                Old single-calendar events are still hanging around in your Google Calendar.
                One click deletes the old <em>Rebel Logistics</em> calendar and re-syncs every
                open job onto its per-truck calendar.
              </p>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 flex-wrap">
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                if (
                  !confirm(
                    'Delete the legacy single calendar without re-syncing? Open jobs will only re-appear after the next reorder/move on Truck Runs.',
                  )
                ) {
                  return;
                }
                try {
                  const r = await cleanup.mutateAsync();
                  if (r.action === 'deleted') {
                    toast.success('Legacy calendar deleted');
                  } else {
                    toast.message('Nothing to delete — already clean.');
                  }
                } catch (err) {
                  const message = err instanceof Error ? err.message : 'Cleanup failed';
                  toast.error(message);
                }
              }}
              disabled={cleanup.isPending || bulkSyncing}
              className="gap-1 text-[11px] text-rebel-danger border-rebel-danger/30 hover:bg-rebel-danger-surface hover:text-rebel-danger"
              title="Delete the legacy calendar only (no re-sync)"
            >
              <Trash2 className="w-3 h-3" />
              {cleanup.isPending ? 'Deleting…' : 'Delete only'}
            </Button>
            <Button
              size="sm"
              onClick={handleCleanupAndSync}
              disabled={bulkSyncing || cleanup.isPending}
              className="gap-1.5 bg-amber-600 hover:bg-amber-700 text-white text-[11px]"
              title="Delete the legacy calendar AND re-sync open jobs to per-truck calendars"
            >
              <Sparkles className="w-3 h-3" />
              {bulkSyncing
                ? 'Working…'
                : `Clean up & sync${openJobs.length ? ` (${openJobs.length})` : ''}`}
            </Button>
          </div>
        </div>
      )}

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

function CalendarModeToggle({ integration }: { integration: Integration }) {
  const setMode = useSetCalendarMode();
  const currentMode: CalendarMode =
    (integration.metadata?.calendarMode as CalendarMode | undefined) === 'per_truck'
      ? 'per_truck'
      : 'single';
  const truckCalendars = (integration.metadata?.calendars as Record<string, string> | undefined) ?? {};
  const truckCount = Object.keys(truckCalendars).length;

  const handleSwitch = async (mode: CalendarMode) => {
    if (mode === currentMode) return;
    if (mode === 'per_truck') {
      const ok = confirm(
        'Switch to a separate calendar per truck?\n\n' +
          'Each truck gets its own "Rebel Logistics — Truck N" calendar in your Google Calendar app. ' +
          "After switching, click \"Sync open jobs\" so existing events re-file to the right truck calendar.",
      );
      if (!ok) return;
    }
    try {
      await setMode.mutateAsync(mode);
      toast.success(
        mode === 'per_truck'
          ? 'Per-truck calendars enabled — re-sync open jobs to backfill'
          : 'Single calendar mode enabled',
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to switch mode';
      toast.error(message);
    }
  };

  return (
    <div className="rounded-lg bg-card/50 border border-rebel-success/20 px-3 py-2 space-y-2">
      <div className="flex items-center gap-2">
        <CalendarRange className="w-3.5 h-3.5 text-rebel-accent shrink-0" />
        <p className="text-[11px] font-semibold text-rebel-text">Calendar layout</p>
        {currentMode === 'per_truck' && truckCount > 0 && (
          <Badge variant="secondary" className="bg-rebel-accent-surface text-rebel-accent border-none text-[10px]">
            {truckCount} truck calendar{truckCount === 1 ? '' : 's'}
          </Badge>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => handleSwitch('single')}
          disabled={setMode.isPending}
          className={cn(
            'rounded-lg border px-3 py-2 text-left transition-colors',
            currentMode === 'single'
              ? 'border-rebel-accent bg-rebel-accent-surface'
              : 'border-rebel-border bg-card hover:bg-muted',
          )}
        >
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-rebel-accent" />
            <p className="text-[11px] font-bold text-rebel-text">Single calendar</p>
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            All trucks share one Rebel Logistics calendar. Default.
          </p>
        </button>
        <button
          type="button"
          onClick={() => handleSwitch('per_truck')}
          disabled={setMode.isPending}
          className={cn(
            'rounded-lg border px-3 py-2 text-left transition-colors',
            currentMode === 'per_truck'
              ? 'border-rebel-accent bg-rebel-accent-surface'
              : 'border-rebel-border bg-card hover:bg-muted',
          )}
        >
          <div className="flex items-center gap-1.5">
            <TruckIcon className="w-3.5 h-3.5 text-rebel-accent" />
            <p className="text-[11px] font-bold text-rebel-text">Per-truck calendars</p>
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Each truck = its own colour-able calendar (Yamin's May 4 ask).
          </p>
        </button>
      </div>
      {currentMode === 'per_truck' && truckCount === 0 && (
        <p className="text-[10px] text-muted-foreground">
          Truck calendars are auto-created on first sync. Click <strong>Sync open jobs</strong> below to provision them now.
        </p>
      )}
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
