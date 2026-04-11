import { useMemo, useState, type ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Job } from '@/lib/types';
import {
  ClipboardList,
  AlertTriangle,
  Package,
  Camera,
  CheckCircle2,
  Check,
  X,
  PackageCheck,
  Truck,
  Send,
  type LucideIcon,
} from 'lucide-react';
import { AcceptAssignDialog } from '@/components/jobs/AcceptAssignDialog';
import { DeclineDialog } from '@/components/jobs/DeclineDialog';
import { MarkCompleteDialog } from '@/components/jobs/MarkCompleteDialog';
import { RecentPhotosPanel } from './RecentPhotosPanel';
import { useSendSmsForJob } from '@/hooks/useSms';
import { useTrucks } from '@/hooks/useTrucks';
import { addDays, format, isAfter, isBefore, parseISO, subDays } from 'date-fns';
import { toast } from 'sonner';

interface DailyReviewPanelProps {
  jobs: Job[];
}

const ACTIVE_STATUSES: Job['status'][] = [
  'Accepted',
  'Scheduled',
  'Notified',
  'In Delivery',
];

export function DailyReviewPanel({ jobs }: DailyReviewPanelProps) {
  const { data: trucks = [] } = useTrucks();
  const activeTruckNames = useMemo(
    () => trucks.filter((t) => t.active).map((t) => t.name),
    [trucks]
  );
  const [acceptTarget, setAcceptTarget] = useState<Job | null>(null);
  const [declineTarget, setDeclineTarget] = useState<Job | null>(null);
  const [completeTarget, setCompleteTarget] = useState<Job | null>(null);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const todayStr = format(today, 'yyyy-MM-dd');
  const tomorrowStr = format(addDays(today, 1), 'yyyy-MM-dd');
  const sevenDaysAhead = addDays(today, 7);
  const sevenDaysAgo = subDays(today, 7);

  const tomorrowJobs = useMemo(
    () =>
      jobs.filter(
        (j) =>
          j.date === tomorrowStr &&
          ACTIVE_STATUSES.includes(j.status)
      ),
    [jobs, tomorrowStr]
  );

  const outstandingQuotes = useMemo(
    () =>
      jobs
        .filter((j) => j.status === 'Quote')
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [jobs]
  );

  const missingInfo = useMemo(() => {
    return jobs
      .filter((j) => {
        if (j.status === 'Declined' || j.status === 'Completed' || j.status === 'Invoiced') {
          return false;
        }
        if (!j.date) return true;
        const jobDate = parseISO(j.date);
        if (isBefore(jobDate, today) || isAfter(jobDate, sevenDaysAhead)) return false;
        return hasMissingInfo(j);
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [jobs, today, sevenDaysAhead]);

  const todaysLoadup = useMemo(() => {
    const byTruck: Record<string, Job[]> = {};
    for (const name of activeTruckNames) byTruck[name] = [];
    for (const job of jobs) {
      if (job.date !== todayStr) continue;
      if (!ACTIVE_STATUSES.includes(job.status)) continue;
      if (!job.assignedTruck) continue;
      if (!byTruck[job.assignedTruck]) byTruck[job.assignedTruck] = [];
      byTruck[job.assignedTruck].push(job);
    }
    return byTruck;
  }, [jobs, todayStr, activeTruckNames]);

  const loadupCount = useMemo(
    () => Object.values(todaysLoadup).reduce((sum, list) => sum + list.length, 0),
    [todaysLoadup]
  );

  const needsProof = useMemo(() => {
    return jobs
      .filter((j) => {
        if (j.status !== 'Completed' && j.status !== 'Invoiced') return false;
        if (!j.date) return false;
        const jobDate = parseISO(j.date);
        if (isBefore(jobDate, sevenDaysAgo)) return false;
        return !j.proofPhoto || !j.signature;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [jobs, sevenDaysAgo]);

  return (
    <>
      <div className="space-y-4">
        <DayPriorSection jobs={tomorrowJobs} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ReviewSection
            icon={ClipboardList}
            title="Outstanding Quotes"
          count={outstandingQuotes.length}
          accent="slate"
          emptyMessage="No quotes waiting."
        >
          {outstandingQuotes.map((job) => (
            <QuoteRow
              key={job.id}
              job={job}
              onAccept={() => setAcceptTarget(job)}
              onDecline={() => setDeclineTarget(job)}
            />
          ))}
        </ReviewSection>

        <ReviewSection
          icon={AlertTriangle}
          title="Missing Info (next 7 days)"
          count={missingInfo.length}
          accent="amber"
          emptyMessage="All upcoming jobs have complete info."
        >
          {missingInfo.map((job) => (
            <MissingInfoRow key={job.id} job={job} />
          ))}
        </ReviewSection>

        <ReviewSection
          icon={Package}
          title="Warehouse Loadup — Today"
          count={loadupCount}
          accent="teal"
          emptyMessage="Nothing scheduled for today."
        >
          {loadupCount > 0 && (
            <div className="space-y-3">
              {Object.entries(todaysLoadup)
                .filter(([, list]) => list.length > 0)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([truck, truckJobs]) => (
                  <div key={truck} className="space-y-1.5">
                    <div className="flex items-center gap-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      <Truck className="w-3 h-3" />
                      {truck}
                      <span className="text-muted-foreground/70 normal-case font-medium">
                        ({truckJobs.length})
                      </span>
                    </div>
                    {truckJobs.map((job) => (
                      <LoadupRow key={job.id} job={job} />
                    ))}
                  </div>
                ))}
            </div>
          )}
        </ReviewSection>

        <ReviewSection
          icon={Camera}
          title="Needs Proof (last 7 days)"
          count={needsProof.length}
          accent="red"
          emptyMessage="Every completed job has proof on file."
        >
          {needsProof.map((job) => (
            <NeedsProofRow
              key={job.id}
              job={job}
              onComplete={() => setCompleteTarget(job)}
            />
          ))}
        </ReviewSection>
        </div>

        <RecentPhotosPanel />
      </div>

      <AcceptAssignDialog job={acceptTarget} onClose={() => setAcceptTarget(null)} />
      <DeclineDialog job={declineTarget} onClose={() => setDeclineTarget(null)} />
      <MarkCompleteDialog job={completeTarget} onClose={() => setCompleteTarget(null)} />
    </>
  );
}

function hasMissingInfo(job: Job): boolean {
  if (!job.customerPhone?.trim()) return true;
  if (!job.pickupAddress?.trim()) return true;
  if (!job.deliveryAddress?.trim()) return true;
  if (!job.assignedTruck) return true;
  if (!job.date) return true;
  return false;
}

function detectMissingInfo(job: Job): string[] {
  const flags: string[] = [];
  if (!job.customerPhone?.trim()) flags.push('phone');
  if (!job.pickupAddress?.trim()) flags.push('pickup');
  if (!job.deliveryAddress?.trim()) flags.push('delivery');
  if (!job.assignedTruck) flags.push('truck');
  if (!job.date) flags.push('date');
  return flags;
}

type Accent = 'slate' | 'amber' | 'teal' | 'red';

const accentStyles: Record<Accent, { icon: string; badge: string }> = {
  slate: { icon: 'bg-muted text-muted-foreground', badge: 'bg-muted text-muted-foreground' },
  amber: { icon: 'bg-amber-100 text-amber-700', badge: 'bg-amber-100 text-amber-800' },
  teal: { icon: 'bg-rebel-accent-surface text-rebel-accent', badge: 'bg-rebel-accent-surface text-rebel-accent' },
  red: { icon: 'bg-red-100 text-red-700', badge: 'bg-red-100 text-red-800' },
};

interface ReviewSectionProps {
  icon: LucideIcon;
  title: string;
  count: number;
  accent: Accent;
  emptyMessage: string;
  children?: ReactNode;
}

function ReviewSection({
  icon: Icon,
  title,
  count,
  accent,
  emptyMessage,
  children,
}: ReviewSectionProps) {
  const styles = accentStyles[accent];
  const isEmpty = count === 0;

  return (
    <Card className="border-border shadow-none bg-card">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${styles.icon}`}>
              <Icon className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-sm">{title}</h3>
          </div>
          <Badge variant="secondary" className={`border-none ${styles.badge}`}>
            {count}
          </Badge>
        </div>

        {isEmpty ? (
          <div className="flex items-center gap-2 py-4 text-xs text-muted-foreground">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            {emptyMessage}
          </div>
        ) : (
          <div className="max-h-72 overflow-y-auto pr-1">{children}</div>
        )}
      </CardContent>
    </Card>
  );
}

interface QuoteRowProps {
  job: Job;
  onAccept: () => void;
  onDecline: () => void;
}

function QuoteRow({ job, onAccept, onDecline }: QuoteRowProps) {
  const total = job.fee + (job.fuelLevy ?? 0);
  return (
    <div className="flex items-center justify-between gap-2 py-2 border-b last:border-b-0">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold truncate">{job.customerName}</p>
        <p className="text-[10px] text-muted-foreground truncate">
          {job.pickupAddress} → {job.deliveryAddress}
        </p>
      </div>
      <div className="text-xs font-semibold shrink-0 w-16 text-right">
        ${total.toFixed(2)}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Button size="xs" variant="outline" onClick={onAccept} className="gap-1">
          <Check className="w-3 h-3" />
          Accept
        </Button>
        <Button
          size="xs"
          variant="ghost"
          onClick={onDecline}
          className="gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          <X className="w-3 h-3" />
          Decline
        </Button>
      </div>
    </div>
  );
}

interface MissingInfoRowProps {
  job: Job;
}

function MissingInfoRow({ job }: MissingInfoRowProps) {
  const flags = detectMissingInfo(job);
  return (
    <div className="py-2 border-b last:border-b-0 space-y-1">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold truncate">{job.customerName}</p>
        <p className="text-[10px] text-muted-foreground shrink-0">
          {job.date || 'no date'}
        </p>
      </div>
      <p className="text-[10px] text-muted-foreground truncate">
        {job.pickupAddress || '—'} → {job.deliveryAddress || '—'}
      </p>
      <div className="flex flex-wrap gap-1 pt-0.5">
        {flags.map((flag) => (
          <span
            key={flag}
            className="inline-flex items-center gap-1 rounded-md bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.5 font-medium"
          >
            <AlertTriangle className="w-2.5 h-2.5" />
            {flag}
          </span>
        ))}
      </div>
    </div>
  );
}

interface LoadupRowProps {
  job: Job;
}

function LoadupRow({ job }: LoadupRowProps) {
  const weight = job.itemWeightKg ? `${job.itemWeightKg}kg` : null;
  const dims = job.itemDimensions?.trim() || null;
  const details = [weight, dims].filter(Boolean).join(' · ');

  return (
    <div className="pl-5 py-1 text-[11px] leading-tight">
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold truncate">{job.customerName}</span>
        <span className="text-muted-foreground shrink-0">{job.type}</span>
      </div>
      <p className="text-muted-foreground truncate">{job.pickupAddress}</p>
      {details && <p className="text-muted-foreground/80 italic">{details}</p>}
    </div>
  );
}

interface DayPriorSectionProps {
  jobs: Job[];
}

function DayPriorSection({ jobs }: DayPriorSectionProps) {
  const sendSms = useSendSmsForJob();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [bulkSending, setBulkSending] = useState(false);
  const tomorrowLabel = format(addDays(new Date(), 1), 'EEE d MMM');

  const unsent = useMemo(
    () => jobs.filter((j) => !j.dayPriorSmsSentAt && j.customerPhone?.trim()),
    [jobs],
  );

  const handleSend = async (job: Job) => {
    setBusyId(job.id);
    try {
      await sendSms.mutateAsync({ job, type: 'day_prior' });
      toast.success(`Day-prior SMS sent to ${job.customerName}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send SMS';
      toast.error(message);
    } finally {
      setBusyId(null);
    }
  };

  const handleSendAll = async () => {
    if (unsent.length === 0) return;
    if (!confirm(`Send day-prior SMS to ${unsent.length} ${unsent.length === 1 ? 'customer' : 'customers'}?`)) {
      return;
    }
    setBulkSending(true);
    let sent = 0;
    let failed = 0;
    const toastId = toast.loading(`Sending 0 of ${unsent.length}…`);
    for (const job of unsent) {
      try {
        await sendSms.mutateAsync({ job, type: 'day_prior' });
        sent += 1;
      } catch (err) {
        console.error('bulk day-prior send failed', err);
        failed += 1;
      }
      toast.loading(`Sending ${sent + failed} of ${unsent.length}…`, { id: toastId });
    }
    setBulkSending(false);
    if (failed === 0) {
      toast.success(`Sent ${sent} day-prior reminders`, { id: toastId });
    } else if (sent === 0) {
      toast.error(`All ${failed} sends failed`, { id: toastId });
    } else {
      toast.warning(`${sent} sent, ${failed} failed`, { id: toastId });
    }
  };

  return (
    <Card className="border-border shadow-none bg-card">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-rebel-border pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-rebel-accent-surface text-rebel-accent">
              <Send className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Day-prior SMS — Tomorrow</h3>
              <p className="text-[11px] text-muted-foreground">{tomorrowLabel}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {unsent.length > 0 && (
              <Button
                size="xs"
                className="bg-rebel-accent hover:bg-rebel-accent-hover text-white gap-1 h-7"
                disabled={bulkSending}
                onClick={handleSendAll}
              >
                <Send className="w-3 h-3" />
                {bulkSending ? 'Sending…' : `Send all (${unsent.length})`}
              </Button>
            )}
            <Badge variant="secondary" className="border-none bg-rebel-accent-surface text-rebel-accent">
              {jobs.length}
            </Badge>
          </div>
        </div>

        {jobs.length === 0 ? (
          <div className="flex items-center gap-2 py-4 text-xs text-muted-foreground">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            No jobs scheduled for tomorrow.
          </div>
        ) : (
          <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
            {jobs.map((job) => (
              <DayPriorRow
                key={job.id}
                job={job}
                busy={busyId === job.id}
                onSend={() => handleSend(job)}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface DayPriorRowProps {
  job: Job;
  busy: boolean;
  onSend: () => void;
}

function DayPriorRow({ job, busy, onSend }: DayPriorRowProps) {
  const sent = !!job.dayPriorSmsSentAt;
  const hasPhone = !!job.customerPhone?.trim();
  const sentTimeLabel = sent ? format(parseISO(job.dayPriorSmsSentAt!), 'HH:mm') : null;

  return (
    <div className="flex items-center justify-between gap-2 py-2 border-b last:border-b-0">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold truncate">{job.customerName}</p>
        <p className="text-[10px] text-muted-foreground truncate">
          {job.assignedTruck ?? '—'} · {job.pickupAddress} → {job.deliveryAddress}
        </p>
      </div>
      {sent ? (
        <span className="inline-flex items-center gap-1 rounded-md bg-green-100 text-green-800 text-[10px] px-1.5 py-0.5 font-medium shrink-0">
          <CheckCircle2 className="w-2.5 h-2.5" />
          Sent {sentTimeLabel}
        </span>
      ) : (
        <Button
          size="xs"
          variant="outline"
          className="gap-1 shrink-0"
          onClick={onSend}
          disabled={!hasPhone || busy}
          title={hasPhone ? undefined : 'No phone number on file'}
        >
          <Send className="w-3 h-3" />
          {busy ? 'Sending…' : 'Send'}
        </Button>
      )}
    </div>
  );
}

interface NeedsProofRowProps {
  job: Job;
  onComplete: () => void;
}

function NeedsProofRow({ job, onComplete }: NeedsProofRowProps) {
  const missing: string[] = [];
  if (!job.proofPhoto) missing.push('photo');
  if (!job.signature) missing.push('signature');

  return (
    <div className="flex items-center justify-between gap-2 py-2 border-b last:border-b-0">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold truncate">{job.customerName}</p>
        <p className="text-[10px] text-muted-foreground truncate">
          {job.date} · missing {missing.join(' & ')}
        </p>
      </div>
      <Button size="xs" variant="outline" className="gap-1 shrink-0" onClick={onComplete}>
        <PackageCheck className="w-3 h-3" />
        Backfill
      </Button>
    </div>
  );
}
