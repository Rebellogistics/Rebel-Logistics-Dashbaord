import { useEffect, useMemo, useState } from 'react';
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
import { Job } from '@/lib/types';
import {
  MapPin,
  Truck,
  Calendar,
  DollarSign,
  Phone,
  StickyNote,
  PenLine,
  Camera,
  ImageOff,
  AlertCircle,
  MessageSquare,
  Activity,
  Copy,
  Printer,
  Star,
  Navigation,
  FileText,
  CheckCircle2,
  Lock,
  Pencil,
  Save,
  X as XIcon,
  History as HistoryIcon,
} from 'lucide-react';
import { canSendJobToXero } from '@/lib/xero';
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import { JobPhotoGallery } from './JobPhotoGallery';
import { supabase } from '@/lib/supabase';
import { StatusPill } from '@/components/ui/status-pill';
import { SendSmsDialog } from '@/components/sms/SendSmsDialog';
import { JobActivityTimeline } from './JobActivityTimeline';
import { NewQuoteDialog } from './NewQuoteDialog';
import { PrintReceipt } from './PrintReceipt';
import { AssignTruckDialog } from './AssignTruckDialog';
import { useCustomers, useUpdateJob } from '@/hooks/useSupabaseData';
import { useJobHistory, useAppendJobHistory } from '@/hooks/useJobHistory';
import { exportJobProofZip, jobZipName, triggerDownload } from '@/lib/export';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface JobDetailDialogProps {
  job: Job | null;
  onClose: () => void;
}

function looksLikeSignaturePath(jobId: string, value: string | null | undefined): boolean {
  if (!value) return false;
  return value.startsWith(`${jobId}/`) && /\.(png|jpg|jpeg|webp)$/i.test(value);
}

export function JobDetailDialog({ job, onClose }: JobDetailDialogProps) {
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
  const [signatureError, setSignatureError] = useState(false);
  const [sendSmsOpen, setSendSmsOpen] = useState(false);
  const [rebookOpen, setRebookOpen] = useState(false);
  const [assignTruckOpen, setAssignTruckOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<{ date: string; pickupAddress: string; deliveryAddress: string }>(
    { date: '', pickupAddress: '', deliveryAddress: '' },
  );
  const [activityTab, setActivityTab] = useState<'activity' | 'history'>('activity');
  const { data: customers = [] } = useCustomers();
  const updateJob = useUpdateJob();
  const appendHistory = useAppendJobHistory();
  const isVip = !!(job?.customerId && customers.find((c) => c.id === job.customerId)?.vip);
  const canReassign =
    !!job &&
    (job.status === 'Accepted' ||
      job.status === 'Scheduled' ||
      job.status === 'Notified');
  const isLocked = !!job && (job.status === 'Completed' || job.status === 'Invoiced');
  const canEditFields = !!job && !isLocked;
  const hasProof = !!(job?.proofPhoto || job?.signature);

  useEffect(() => {
    if (job) {
      setDraft({
        date: job.date ?? '',
        pickupAddress: job.pickupAddress ?? '',
        deliveryAddress: job.deliveryAddress ?? '',
      });
      setEditing(false);
      setActivityTab('activity');
    }
  }, [job?.id]);

  const handleExportProof = async () => {
    if (!job || exporting) return;
    setExporting(true);
    const toastId = toast.loading('Preparing proof export…');
    try {
      const blob = await exportJobProofZip(job, (p) => {
        if (p.phase === 'zipping') toast.loading('Zipping files…', { id: toastId });
      });
      triggerDownload(blob, jobZipName(job));
      toast.success('Proof exported', { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error('Export failed', { id: toastId });
    } finally {
      setExporting(false);
    }
  };

  const xeroConnected = false; // Flip once an integrations row for `xero` exists — Phase 12 go-live.
  const xeroEligible = !!job && canSendJobToXero(job);
  const xeroAlreadySent = !!job?.xeroInvoiceId;

  useEffect(() => {
    let cancelled = false;
    setSignatureError(false);
    setSignatureUrl(null);

    if (!job || !job.signature || !looksLikeSignaturePath(job.id, job.signature)) {
      return;
    }

    (async () => {
      try {
        const { data } = await supabase.storage
          .from('job-proofs')
          .createSignedUrl(job.signature!, 600);
        if (!cancelled) setSignatureUrl(data?.signedUrl ?? null);
      } catch {
        if (!cancelled) setSignatureError(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [job]);

  if (!job) return null;

  const total = job.fee + (job.fuelLevy ?? 0);

  const startEdit = () => {
    setDraft({
      date: job.date ?? '',
      pickupAddress: job.pickupAddress ?? '',
      deliveryAddress: job.deliveryAddress ?? '',
    });
    setEditing(true);
  };

  const cancelEdit = () => {
    setDraft({
      date: job.date ?? '',
      pickupAddress: job.pickupAddress ?? '',
      deliveryAddress: job.deliveryAddress ?? '',
    });
    setEditing(false);
  };

  const saveEdit = async () => {
    if (!job) return;

    const changes: Partial<Job> = {};
    const historyEntries: Array<{ field: string; oldValue: string | null; newValue: string | null }> = [];

    if (draft.date && draft.date !== job.date) {
      changes.date = draft.date;
      historyEntries.push({ field: 'date', oldValue: job.date ?? null, newValue: draft.date });
    }
    if (draft.pickupAddress.trim() !== (job.pickupAddress ?? '')) {
      changes.pickupAddress = draft.pickupAddress.trim();
      historyEntries.push({
        field: 'pickup_address',
        oldValue: job.pickupAddress ?? null,
        newValue: draft.pickupAddress.trim(),
      });
    }
    if (draft.deliveryAddress.trim() !== (job.deliveryAddress ?? '')) {
      changes.deliveryAddress = draft.deliveryAddress.trim();
      historyEntries.push({
        field: 'delivery_address',
        oldValue: job.deliveryAddress ?? null,
        newValue: draft.deliveryAddress.trim(),
      });
    }

    if (Object.keys(changes).length === 0) {
      setEditing(false);
      return;
    }

    try {
      await updateJob.mutateAsync({ id: job.id, ...changes } as any);
      try {
        await appendHistory.mutateAsync(
          historyEntries.map((e) => ({ jobId: job.id, ...e })),
        );
      } catch (histErr) {
        // History is best-effort; the main update succeeded.
        console.warn('history append failed', histErr);
      }
      toast.success('Job updated');
      setEditing(false);
    } catch (err) {
      console.error(err);
      toast.error('Failed to save changes');
    }
  };
  const hasSignaturePath = looksLikeSignaturePath(job.id, job.signature);
  const legacySignatureText =
    job.signature && !hasSignaturePath ? job.signature : null;

  return (
    <Dialog open={!!job} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[95dvh] w-[95vw] sm:w-auto p-4 sm:p-6">
        <DialogHeader>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-3">
            <div className="min-w-0 flex-1">
              <DialogTitle className="flex items-center gap-2 flex-wrap">
                <span className="truncate min-w-0 max-w-full">{job.customerName}</span>
                {isVip && (
                  <span
                    className="inline-flex items-center gap-1 h-5 px-1.5 rounded-full bg-amber-400 text-white text-[10px] font-bold uppercase tracking-wider shrink-0"
                    title="VIP customer — handle with care"
                  >
                    <Star className="w-2.5 h-2.5 fill-white" />
                    VIP
                  </span>
                )}
                <StatusPill status={job.status} size="sm" />
              </DialogTitle>
              <DialogDescription className="text-xs flex items-center gap-2 flex-wrap">
                <span>{job.id}</span>
                {job.quoteNumber && (
                  <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-muted text-foreground">
                    {job.quoteNumber}
                  </span>
                )}
              </DialogDescription>
            </div>
            {canEditFields && !editing && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 shrink-0 self-start"
                onClick={startEdit}
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit
              </Button>
            )}
            {editing && (
              <div className="flex gap-1.5 shrink-0 self-start">
                <Button size="sm" variant="outline" className="gap-1.5 flex-1 sm:flex-initial" onClick={cancelEdit}>
                  <XIcon className="w-3.5 h-3.5" />
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="bg-rebel-accent hover:bg-rebel-accent-hover text-white gap-1.5 flex-1 sm:flex-initial"
                  onClick={saveEdit}
                  disabled={updateJob.isPending}
                >
                  <Save className="w-3.5 h-3.5" />
                  {updateJob.isPending ? 'Saving…' : 'Save'}
                </Button>
              </div>
            )}
          </div>
        </DialogHeader>

        <div className="grid gap-4 py-2 max-h-[60dvh] sm:max-h-[65vh] overflow-y-auto pr-1 -mr-1">
          <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <DetailRow icon={MapPin} label="Pickup">
              {editing ? (
                <Input
                  value={draft.pickupAddress}
                  onChange={(e) => setDraft((d) => ({ ...d, pickupAddress: e.target.value }))}
                  placeholder="Pickup address"
                  className="h-10 sm:h-8 text-sm"
                />
              ) : (
                <AddressWithMaps address={job.pickupAddress} />
              )}
            </DetailRow>
            <DetailRow icon={MapPin} label="Delivery">
              {editing ? (
                <Input
                  value={draft.deliveryAddress}
                  onChange={(e) => setDraft((d) => ({ ...d, deliveryAddress: e.target.value }))}
                  placeholder="Delivery address"
                  className="h-10 sm:h-8 text-sm"
                />
              ) : (
                <AddressWithMaps address={job.deliveryAddress} />
              )}
            </DetailRow>
            <DetailRow icon={Truck} label="Truck">
              <span className="inline-flex items-start gap-1.5 min-w-0 flex-col">
                <span className="inline-flex items-center gap-1.5 min-w-0 w-full">
                  <span className="truncate">{job.assignedTruck ?? '—'}</span>
                  {canReassign && (
                    <button
                      type="button"
                      onClick={() => setAssignTruckOpen(true)}
                      className="shrink-0 inline-flex items-center gap-0.5 h-5 px-1.5 rounded-md bg-rebel-accent-surface text-rebel-accent text-[10px] font-bold uppercase tracking-wider hover:bg-rebel-accent hover:text-white transition-colors"
                      title={job.assignedTruck ? 'Change truck' : 'Assign a truck'}
                    >
                      {job.assignedTruck ? 'Change' : 'Assign'}
                    </button>
                  )}
                </span>
                {job.completedByDriverName && (
                  <span className="text-[10px] text-muted-foreground font-normal normal-case truncate w-full">
                    Driver: {job.completedByDriverName}
                  </span>
                )}
              </span>
            </DetailRow>
            <DetailRow icon={Calendar} label="Date">
              {editing ? (
                <Input
                  type="date"
                  value={draft.date}
                  onChange={(e) => setDraft((d) => ({ ...d, date: e.target.value }))}
                  className="h-10 sm:h-8 text-sm"
                />
              ) : (
                job.date ? format(parseISO(job.date), 'd MMM yyyy') : '—'
              )}
            </DetailRow>
            <DetailRow icon={Phone} label="Phone">
              {job.customerPhone ? (
                <a href={`tel:${job.customerPhone}`} className="text-rebel-accent hover:underline">
                  {job.customerPhone}
                </a>
              ) : (
                '—'
              )}
            </DetailRow>
            <DetailRow icon={DollarSign} label="Total">
              ${total.toFixed(2)}
              {job.fuelLevy && job.fuelLevy > 0 ? (
                <span className="text-[10px] text-muted-foreground ml-1">
                  (incl ${job.fuelLevy.toFixed(2)} levy)
                </span>
              ) : null}
            </DetailRow>
          </section>

          {job.notes && (
            <section className="space-y-1">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <StickyNote className="w-3 h-3" />
                Notes
              </h3>
              <p className="text-xs whitespace-pre-wrap bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-900">
                {job.notes}
              </p>
            </section>
          )}

          <section className="space-y-2">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setActivityTab('activity')}
                className={cn(
                  'inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-semibold uppercase tracking-wider transition-colors',
                  activityTab === 'activity'
                    ? 'bg-rebel-accent-surface text-rebel-accent'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Activity className="w-3 h-3" />
                Activity
              </button>
              <button
                type="button"
                onClick={() => setActivityTab('history')}
                className={cn(
                  'inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-semibold uppercase tracking-wider transition-colors',
                  activityTab === 'history'
                    ? 'bg-rebel-accent-surface text-rebel-accent'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <HistoryIcon className="w-3 h-3" />
                History
              </button>
            </div>
            <div className="rounded-xl border border-rebel-border bg-card p-3">
              {activityTab === 'activity' ? (
                <JobActivityTimeline job={job} />
              ) : (
                <JobHistoryList jobId={job.id} />
              )}
            </div>
          </section>

          <section className="space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Camera className="w-3 h-3" />
              Proof photos
            </h3>
            <JobPhotoGallery jobId={job.id} />
          </section>

          <section className="space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <PenLine className="w-3 h-3" />
              Customer signature
            </h3>
            {hasSignaturePath && signatureUrl && (
              <div className="border rounded-lg bg-muted p-2 flex items-center justify-center">
                <img
                  src={signatureUrl}
                  alt="Customer signature"
                  className="max-h-32 w-auto object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
            )}
            {hasSignaturePath && !signatureUrl && !signatureError && (
              <div className="flex items-center gap-2 py-3 text-xs text-muted-foreground justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-rebel-accent"></div>
                Loading signature…
              </div>
            )}
            {hasSignaturePath && signatureError && (
              <div className="border border-red-200 rounded-lg bg-red-50 p-3 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <p className="text-xs text-red-800">Couldn't load the signature preview.</p>
              </div>
            )}
            {legacySignatureText && (
              <div className="border rounded-lg bg-amber-50 border-amber-200 p-3">
                <p className="text-[10px] text-amber-900 font-semibold uppercase tracking-wider">
                  Legacy typed signature
                </p>
                <p className="text-sm text-amber-900 mt-0.5">{legacySignatureText}</p>
              </div>
            )}
            {!job.signature && (
              <div className="flex flex-col items-center gap-2 py-4 text-xs text-muted-foreground">
                <ImageOff className="w-5 h-5 text-muted-foreground/40" />
                No signature on file.
              </div>
            )}
          </section>
        </div>

        <DialogFooter className="flex-col sm:flex-row sm:justify-between gap-2 pt-3 border-t">
          <div className="flex items-center gap-1.5 flex-wrap w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 flex-1 sm:flex-initial min-w-0"
              onClick={() => setSendSmsOpen(true)}
              disabled={!job.customerPhone?.trim()}
              title={job.customerPhone ? undefined : 'No phone number on file'}
            >
              <MessageSquare className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Send </span>SMS
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 flex-1 sm:flex-initial min-w-0"
              onClick={() => setRebookOpen(true)}
              title="Create a new quote prefilled from this job"
            >
              <Copy className="w-3.5 h-3.5 shrink-0" />
              Rebook
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 flex-1 sm:flex-initial min-w-0 hidden sm:inline-flex"
              onClick={() => window.print()}
              title="Print or save as PDF"
            >
              <Printer className="w-3.5 h-3.5 shrink-0" />
              Print
            </Button>
            {hasProof && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 flex-1 sm:flex-initial min-w-0"
                onClick={handleExportProof}
                disabled={exporting}
                title="Download photos + signature as a zip, named by customer / address / date"
              >
                <Camera className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{exporting ? 'Exporting…' : 'Export proof'}</span>
              </Button>
            )}
            {(xeroEligible || xeroAlreadySent) && (
              <Button
                variant="outline"
                size="sm"
                className={
                  'gap-1.5 flex-1 sm:flex-initial min-w-0 ' +
                  (xeroAlreadySent
                    ? 'text-rebel-success border-rebel-success/40 hover:bg-rebel-success-surface'
                    : '')
                }
                disabled={!xeroAlreadySent && !xeroConnected}
                title={
                  xeroAlreadySent
                    ? `Already sent to Xero (invoice ${job.xeroInvoiceId})`
                    : xeroConnected
                      ? 'Send a draft invoice to Xero'
                      : 'Connect Xero from Settings → Integrations to enable. See DEFERRED.md.'
                }
              >
                {xeroAlreadySent ? (
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                ) : xeroConnected ? (
                  <FileText className="w-3.5 h-3.5 shrink-0" />
                ) : (
                  <Lock className="w-3.5 h-3.5 shrink-0" />
                )}
                <span className="truncate">{xeroAlreadySent ? 'Sent to Xero' : 'Send to Xero'}</span>
              </Button>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={onClose} className="w-full sm:w-auto">
            Close
          </Button>
        </DialogFooter>
        <PrintReceipt job={job} />
      </DialogContent>
      <SendSmsDialog
        open={sendSmsOpen}
        onClose={() => setSendSmsOpen(false)}
        job={job}
      />
      <NewQuoteDialog
        open={rebookOpen}
        onOpenChange={(open) => {
          setRebookOpen(open);
          if (!open) onClose();
        }}
        prefillJob={rebookOpen ? job : null}
      />
      <AssignTruckDialog
        job={assignTruckOpen ? job : null}
        onClose={() => setAssignTruckOpen(false)}
        setScheduled={job?.status === 'Accepted'}
      />
    </Dialog>
  );
}

function DetailRow({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof MapPin;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
        <p className="text-sm font-medium truncate">{children}</p>
      </div>
    </div>
  );
}

function AddressWithMaps({ address }: { address: string | undefined }) {
  if (!address) return <>—</>;
  const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
  return (
    <span className="inline-flex items-center gap-1.5 min-w-0">
      <span className="truncate">{address}</span>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Open in Google Maps"
        title="Open directions in Google Maps"
        className="shrink-0 inline-flex items-center justify-center h-5 w-5 rounded text-rebel-accent hover:bg-rebel-accent-surface"
      >
        <Navigation className="w-3 h-3" />
      </a>
    </span>
  );
}

function fieldLabel(field: string): string {
  switch (field) {
    case 'date':
      return 'Date';
    case 'pickup_address':
      return 'Pickup address';
    case 'delivery_address':
      return 'Delivery address';
    default:
      return field.replace(/_/g, ' ');
  }
}

function JobHistoryList({ jobId }: { jobId: string }) {
  const { data: entries = [], isLoading } = useJobHistory(jobId);
  const formatted = useMemo(
    () =>
      entries.map((e) => ({
        ...e,
        when: (() => {
          try {
            return formatDistanceToNow(parseISO(e.changedAt), { addSuffix: true });
          } catch {
            return e.changedAt;
          }
        })(),
      })),
    [entries],
  );

  if (isLoading) {
    return <p className="text-xs text-muted-foreground py-3 text-center">Loading history…</p>;
  }
  if (formatted.length === 0) {
    return (
      <p className="text-xs text-muted-foreground py-3 text-center">
        No edits yet. Changes to date or addresses will be recorded here.
      </p>
    );
  }
  return (
    <ul className="space-y-2.5">
      {formatted.map((e) => (
        <li key={e.id} className="text-xs">
          <p className="font-semibold text-foreground">
            {fieldLabel(e.field)} <span className="font-normal text-muted-foreground">· {e.when}</span>
          </p>
          <p className="text-muted-foreground mt-0.5">
            <span className="line-through opacity-70">{e.oldValue || '—'}</span>{' '}
            <span className="text-rebel-accent">→ {e.newValue || '—'}</span>
          </p>
        </li>
      ))}
    </ul>
  );
}
