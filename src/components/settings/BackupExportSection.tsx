import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Download,
  HardDrive,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Camera,
  Clock,
  Users,
} from 'lucide-react';
import { useJobs, useCustomers, useUpdateJob } from '@/hooks/useSupabaseData';
import { useStorageUsage, type StorageUsage } from '@/hooks/useStorageUsage';
import {
  exportBulkProofZip,
  triggerDownload,
  getLastBackupDate,
  setLastBackupDate,
} from '@/lib/export';
import { Job } from '@/lib/types';
import { parseISO, format, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function BackupExportSection() {
  const { data: jobs = [] } = useJobs();
  const { data: customers = [] } = useCustomers();
  const { data: usage } = useStorageUsage();
  const updateJob = useUpdateJob();
  const [exporting, setExporting] = useState(false);
  const [cleanupDays, setCleanupDays] = useState(90);

  const lastBackup = getLastBackupDate();

  const eligibleJobs = useMemo(() => {
    const since = lastBackup ? parseISO(lastBackup) : new Date(0);
    return jobs.filter((j) => {
      if (j.status !== 'Completed' && j.status !== 'Invoiced') return false;
      if (!j.proofPhoto && !j.signature) return false;
      try {
        return parseISO(j.createdAt) > since;
      } catch {
        return true;
      }
    });
  }, [jobs, lastBackup]);

  const handleBulkExport = async () => {
    if (exporting || eligibleJobs.length === 0) return;
    setExporting(true);
    const toastId = toast.loading(`Exporting ${eligibleJobs.length} jobs…`);
    try {
      const blob = await exportBulkProofZip(eligibleJobs, ({ total, done, currentJob }) => {
        toast.loading(`${done}/${total} · ${currentJob}`, { id: toastId });
      });
      const dateLabel = format(new Date(), 'yyyy-MM-dd');
      triggerDownload(blob, `rebel-backup-${dateLabel}.zip`);
      setLastBackupDate(new Date().toISOString());
      toast.success(`Backup exported — ${eligibleJobs.length} jobs`, { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error('Backup failed', { id: toastId });
    } finally {
      setExporting(false);
    }
  };

  const oldJobs = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - cleanupDays);
    return jobs.filter((j) => {
      if (j.status !== 'Completed' && j.status !== 'Invoiced') return false;
      if (!j.proofPhoto && !j.signature) return false;
      try {
        return parseISO(j.date) < cutoff;
      } catch {
        return false;
      }
    });
  }, [jobs, cleanupDays]);

  const handleCleanup = async () => {
    if (oldJobs.length === 0) return;
    if (
      !confirm(
        `This will remove photo/signature references from ${oldJobs.length} jobs older than ${cleanupDays} days. The job data + metadata stays. Are you sure?`,
      )
    )
      return;
    const toastId = toast.loading(`Clearing proofs on ${oldJobs.length} jobs…`);
    let cleared = 0;
    for (const job of oldJobs) {
      try {
        await updateJob.mutateAsync({
          id: job.id,
          proofPhoto: undefined,
          signature: undefined,
        });
        cleared++;
      } catch {
        // best effort
      }
    }
    toast.success(`Cleared ${cleared} jobs`, { id: toastId });
  };

  // 13.4 — per-customer photo counts + oldest photo + runway
  const perCustomer = useMemo(() => {
    const map = new Map<string, { name: string; count: number }>();
    for (const j of jobs) {
      if (!j.proofPhoto && !j.signature) continue;
      const key = j.customerId ?? j.customerName;
      const existing = map.get(key);
      if (existing) {
        existing.count++;
      } else {
        map.set(key, {
          name: customers.find((c) => c.id === j.customerId)?.name ?? j.customerName,
          count: 1,
        });
      }
    }
    return [...map.values()].sort((a, b) => b.count - a.count).slice(0, 10);
  }, [jobs, customers]);

  const oldestProofDate = useMemo(() => {
    let oldest: Date | null = null;
    for (const j of jobs) {
      if (!j.proofPhoto && !j.signature) continue;
      try {
        const d = parseISO(j.date);
        if (!oldest || d < oldest) oldest = d;
      } catch {
        // ignore
      }
    }
    return oldest;
  }, [jobs]);

  const runwayLabel = usage ? estimateRunway(usage, jobs) : null;

  return (
    <div className="space-y-4">
      {/* Storage meter (enhanced 7.10 → 13.4) */}
      <StorageDashboard
        usage={usage ?? null}
        perCustomer={perCustomer}
        oldestProofDate={oldestProofDate}
        runwayLabel={runwayLabel}
      />

      {/* Bulk export */}
      <Card className="border-rebel-border bg-card shadow-card">
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rebel-accent-surface flex items-center justify-center shrink-0">
              <Download className="w-5 h-5 text-rebel-accent" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-sm text-rebel-text">Back up photos since last export</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {lastBackup
                  ? `Last backup: ${formatDistanceToNow(parseISO(lastBackup), { addSuffix: true })}`
                  : 'No backup yet — all completed jobs with proof will be included.'}
                {' · '}
                {eligibleJobs.length} job{eligibleJobs.length === 1 ? '' : 's'} ready.
              </p>
            </div>
          </div>
          <Button
            className="bg-rebel-accent hover:bg-rebel-accent-hover text-white gap-1.5 w-full sm:w-auto"
            onClick={handleBulkExport}
            disabled={exporting || eligibleJobs.length === 0}
          >
            <Download className="w-3.5 h-3.5" />
            {exporting ? 'Exporting…' : `Export ${eligibleJobs.length} jobs`}
          </Button>
        </CardContent>
      </Card>

      {/* Cleanup */}
      <Card className="border-rebel-border bg-card shadow-card">
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rebel-danger-surface flex items-center justify-center shrink-0">
              <Trash2 className="w-5 h-5 text-rebel-danger" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-sm text-rebel-text">Clean up old proof photos</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Remove photo/signature references from jobs older than N days. Job data stays — only
                the proof links are cleared to free storage space.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-xs text-muted-foreground font-medium">
              Older than
              <select
                value={cleanupDays}
                onChange={(e) => setCleanupDays(Number(e.target.value))}
                className="ml-2 h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
              >
                <option value={30}>30 days</option>
                <option value={60}>60 days</option>
                <option value={90}>90 days</option>
                <option value={180}>180 days</option>
                <option value={365}>1 year</option>
              </select>
            </label>
            <Button
              variant="outline"
              className="gap-1.5 text-rebel-danger border-rebel-danger/30 hover:bg-rebel-danger-surface hover:text-rebel-danger"
              onClick={handleCleanup}
              disabled={oldJobs.length === 0}
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear {oldJobs.length} job{oldJobs.length === 1 ? '' : 's'}
            </Button>
          </div>
          {oldJobs.length > 0 && (
            <p className="text-[10.5px] text-rebel-warning flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              Back up first — cleared photos cannot be recovered from this app.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StorageDashboard({
  usage,
  perCustomer,
  oldestProofDate,
  runwayLabel,
}: {
  usage: StorageUsage | null;
  perCustomer: { name: string; count: number }[];
  oldestProofDate: Date | null;
  runwayLabel: string | null;
}) {
  const pct = usage?.pct ?? 0;
  const warning = pct >= 80;
  const critical = pct >= 95;
  const barColor = critical
    ? 'bg-rebel-danger'
    : warning
      ? 'bg-rebel-warning'
      : 'bg-rebel-accent';

  return (
    <Card className="border-rebel-border bg-card shadow-card">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rebel-accent-surface flex items-center justify-center shrink-0">
            <HardDrive className="w-5 h-5 text-rebel-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-sm text-rebel-text">Storage overview</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Estimated usage on the Supabase free tier (500 MB).
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[13px] font-bold tabular-nums text-rebel-text">
              {usage
                ? `${usage.estimatedMb.toFixed(0)} / ${usage.quotaMb} MB`
                : '…'}
            </p>
            <p className="text-[10px] text-muted-foreground tabular-nums">
              {usage
                ? `${usage.photoCount} photos · ${usage.signatureCount} sigs`
                : ''}
            </p>
          </div>
        </div>

        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className={cn('h-full transition-all', barColor)}
            style={{ width: `${Math.max(2, pct)}%` }}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="rounded-lg bg-muted p-3 space-y-1">
            <div className="flex items-center gap-1.5 text-rebel-text-tertiary">
              <Clock className="w-3 h-3" />
              <span className="font-bold uppercase tracking-wider text-[9px]">Oldest proof</span>
            </div>
            <p className="font-semibold text-rebel-text">
              {oldestProofDate
                ? formatDistanceToNow(oldestProofDate, { addSuffix: true })
                : 'None'}
            </p>
          </div>
          <div className="rounded-lg bg-muted p-3 space-y-1">
            <div className="flex items-center gap-1.5 text-rebel-text-tertiary">
              <HardDrive className="w-3 h-3" />
              <span className="font-bold uppercase tracking-wider text-[9px]">Runway</span>
            </div>
            <p className="font-semibold text-rebel-text">{runwayLabel ?? '—'}</p>
          </div>
          <div className="rounded-lg bg-muted p-3 space-y-1">
            <div className="flex items-center gap-1.5 text-rebel-text-tertiary">
              <Camera className="w-3 h-3" />
              <span className="font-bold uppercase tracking-wider text-[9px]">Total photos</span>
            </div>
            <p className="font-semibold text-rebel-text">{usage?.photoCount ?? '—'}</p>
          </div>
        </div>

        {perCustomer.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-rebel-text-tertiary text-[9px] font-bold uppercase tracking-wider">
              <Users className="w-3 h-3" />
              Top customers by photo count
            </div>
            <div className="space-y-1">
              {perCustomer.map((c) => (
                <div
                  key={c.name}
                  className="flex items-center justify-between gap-2 text-[11px] py-1 border-b border-rebel-border last:border-0"
                >
                  <span className="truncate font-medium">{c.name}</span>
                  <span className="tabular-nums text-muted-foreground shrink-0">
                    {c.count} job{c.count === 1 ? '' : 's'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {warning && (
          <div className="flex items-start gap-2 rounded-xl bg-rebel-warning-surface px-3 py-2 text-[11px] text-rebel-warning ring-1 ring-rebel-warning/20">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>
              {critical
                ? 'Storage almost full — new photos may fail. Back up and clear old proofs now.'
                : 'Over 80% of the free-tier quota used. Consider backing up and cleaning older proofs.'}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function estimateRunway(usage: StorageUsage, jobs: Job[]): string {
  if (usage.photoCount === 0) return 'No photos yet';
  const remaining = usage.quotaMb - usage.estimatedMb;
  if (remaining <= 0) return 'Full';
  // Average MB per photo
  const avgMb = usage.estimatedMb / (usage.photoCount + usage.signatureCount || 1);
  if (avgMb <= 0) return '—';
  const photosLeft = Math.floor(remaining / avgMb);

  // Estimate days until full based on recent pace (last 30 days)
  const cutoff = Date.now() - 30 * 86400000;
  const recentCount = jobs.filter((j) => {
    if (!j.proofPhoto && !j.signature) return false;
    try {
      return Date.parse(j.createdAt) > cutoff;
    } catch {
      return false;
    }
  }).length;

  if (recentCount === 0) return `~${photosLeft} photos of space left`;
  const dailyRate = recentCount / 30;
  const daysLeft = Math.floor(photosLeft / dailyRate);
  if (daysLeft > 365) return `~${photosLeft} photos (~1yr+)`;
  return `~${photosLeft} photos (~${daysLeft}d at current pace)`;
}
