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
import { AddressAutocomplete } from '@/components/ui/AddressAutocomplete';
import type { Job, JobLocation, JobType } from '@/lib/types';
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
  Clock,
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
import { JobActionMenu, type JobMenuAction } from './JobActionMenu';
import { MarkCompleteDialog } from './MarkCompleteDialog';
import { useTrucks } from '@/hooks/useTrucks';
import { useSendDayPriorBulk, useSendSmsForJob } from '@/hooks/useSms';
import { useCustomers, useUpdateJob } from '@/hooks/useSupabaseData';
import { useJobHistory, useAppendJobHistory } from '@/hooks/useJobHistory';
import { usePricingRates } from '@/hooks/usePricingRates';
import { useRepeatCustomerLookup } from '@/hooks/useRepeatCustomer';
import { calculateQuote, formatAud } from '@/lib/pricing';
import { customerDisplay } from '@/lib/jobDisplay';
import { exportJobProofZip, jobZipName, triggerDownload } from '@/lib/export';
import { toast } from 'sonner';
import { cn, sanitiseDecimal } from '@/lib/utils';

interface JobDetailDialogProps {
  job: Job | null;
  onClose: () => void;
  /** V5 P5: shell-level callback that opens the StorageDialog seeded
   *  from this job. Optional — nothing happens if not provided. */
  onConvertToStorage?: (job: Job) => void;
}

function looksLikeSignaturePath(jobId: string, value: string | null | undefined): boolean {
  if (!value) return false;
  return value.startsWith(`${jobId}/`) && /\.(png|jpg|jpeg|webp)$/i.test(value);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// Snapshot a job into the editable draft shape. Used both on dialog open
// and when the user cancels an edit.
function buildDraftFromJob(job: Job) {
  return {
    customerName: job.customerName ?? '',
    customerCompanyName: job.customerCompanyName ?? '',
    date: job.date ?? '',
    pickupAddress: job.pickupAddress ?? '',
    deliveryAddress: job.deliveryAddress ?? '',
    customerPhone: job.customerPhone ?? '',
    type: (job.type ?? 'Standard') as JobType,
    location: (job.location ?? 'Metro') as JobLocation,
    cubicMetres: job.cubicMetres != null ? String(job.cubicMetres) : '',
    estimatedHours: job.hoursEstimated != null ? String(job.hoursEstimated) : '',
    fee: job.fee != null ? job.fee.toFixed(2) : '',
    priceIsManual: job.priceIsManual ?? false,
    notes: job.notes ?? '',
    // V5 Phase 1: tri-toggle defaults. Undefined on legacy rows that
    // pre-date the migration is treated as ON to preserve existing
    // behaviour ("send unless I say otherwise").
    sendDayPrior: job.sendDayPrior ?? true,
    sendEnRoute: job.sendEnRoute ?? true,
    sendComplete: job.sendComplete ?? true,
  };
}

export function JobDetailDialog({ job, onClose, onConvertToStorage }: JobDetailDialogProps) {
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
  const [signatureError, setSignatureError] = useState(false);
  const [sendSmsOpen, setSendSmsOpen] = useState(false);
  const [rebookOpen, setRebookOpen] = useState(false);
  const [assignTruckOpen, setAssignTruckOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [editing, setEditing] = useState(false);
  // Expanded edit draft (Phase 10): every field on the form except customerName,
  // status, and audit-trail data is editable until the job is Completed/Invoiced.
  // priceIsManual mirrors the DB column — flips to true the moment the user
  // types in the price field directly so subsequent type/cubes/hours edits
  // don't silently overwrite their override.
  const [draft, setDraft] = useState({
    customerName: '',
    customerCompanyName: '',
    date: '',
    pickupAddress: '',
    deliveryAddress: '',
    customerPhone: '',
    type: 'Standard' as JobType,
    location: 'Metro' as JobLocation,
    cubicMetres: '',
    estimatedHours: '',
    fee: '',
    priceIsManual: false,
    notes: '',
    sendDayPrior: true,
    sendEnRoute: true,
    sendComplete: true,
  });
  const [activityTab, setActivityTab] = useState<'activity' | 'history'>('activity');
  // V4 2.5: 3-dots menu inside the dialog header. Local mark-complete state
  // so the menu can trigger the proof flow without round-tripping to the
  // shell-level instance via a parent callback.
  const [menuMarkCompleteTarget, setMenuMarkCompleteTarget] = useState<Job | null>(null);
  const { data: customers = [] } = useCustomers();
  const { data: trucks = [] } = useTrucks();
  const { data: rates } = usePricingRates();
  const { info: repeatInfo } = useRepeatCustomerLookup(job?.customerPhone ?? '');
  const updateJob = useUpdateJob();
  const sendDayPriorBulk = useSendDayPriorBulk();
  const sendSmsForJob = useSendSmsForJob();
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
      setDraft(buildDraftFromJob(job));
      setEditing(false);
      setActivityTab('activity');
    }
  }, [job?.id]);

  // V4 2.5: 3-dots menu handler. Mirrors the menu on Truck Runs cards so
  // Yamin can change status / move trucks / mark complete from inside the
  // job dialog (especially in edit mode, which previously had no quick
  // action surface). Re-uses existing mutations + dialogs.
  const handleMenuAction = async (j: Job, action: JobMenuAction) => {
    if (action.type === 'view') {
      // Already viewing — no-op. Surface as the trigger for keyboard users.
      return;
    }
    if (action.type === 'mark_complete') {
      setMenuMarkCompleteTarget(j);
      return;
    }
    if (action.type === 'set_status') {
      if (action.status === 'Declined' && !confirm(`Decline ${j.customerName}?`)) return;
      try {
        await updateJob.mutateAsync({ id: j.id, status: action.status });
        toast.success(`${j.customerName} → ${action.status}`);
      } catch {
        toast.error('Failed to update status');
      }
      return;
    }
    if (action.type === 'assign_truck') {
      try {
        await updateJob.mutateAsync({
          id: j.id,
          assignedTruck: action.truck,
          date: j.date || new Date().toISOString().slice(0, 10),
          status: 'Scheduled',
        });
        toast.success(`${j.customerName} → ${action.truck}`);
      } catch {
        toast.error('Failed to assign truck');
      }
      return;
    }
    if (action.type === 'unassign_truck') {
      try {
        // Mirror TruckRunsView: clear sequence too — V4 1.1.
        await updateJob.mutateAsync({
          id: j.id,
          assignedTruck: undefined,
          status: 'Accepted',
          sequence: undefined,
        });
        toast.success(`${j.customerName} → Accepted pool`);
      } catch {
        toast.error('Failed to unassign');
      }
      return;
    }
    if (action.type === 'send_day_prior') {
      try {
        const result = await sendDayPriorBulk.mutateAsync([j]);
        if (result.sent > 0) toast.success(`Day-prior SMS sent to ${j.customerName}`);
        else toast.error(result.failures[0]?.reason ?? 'Send failed');
      } catch (err) {
        console.error(err);
        toast.error('Send failed');
      }
      return;
    }
    if (action.type === 'send_review_request') {
      try {
        const result = await sendSmsForJob.mutateAsync({ job: j, type: 'review_request' });
        if (result.status === 'sent') {
          toast.success(`Review request sent to ${j.customerName}`);
        } else {
          toast.error(result.errorMessage ?? 'Send failed');
        }
      } catch (err) {
        console.error(err);
        toast.error('Send failed');
      }
      return;
    }
    if (action.type === 'convert_to_storage') {
      if (onConvertToStorage) {
        onConvertToStorage(j);
        onClose();
      }
      return;
    }
  };

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

  // Live recompute against the rate book based on whatever's in the draft
  // right now. Used in two places:
  //   1. Edit mode — the price input auto-tracks this value while the user
  //      hasn't manually typed in it (priceIsManual = false).
  //   2. Read-mode footer — to show Subtotal / GST / Total breakdown using
  //      the saved fee, falling back to a recompute for legacy quotes that
  //      were created before Phase 1 stored gst_amount.
  const draftBreakdown = useMemo(() => {
    if (!rates) return null;
    return calculateQuote({
      type: draft.type,
      location: draft.location,
      cubicMetres: parseFloat(draft.cubicMetres) || 0,
      estimatedHours: parseFloat(draft.estimatedHours) || 0,
      rates,
      overrideMetroRate: repeatInfo.overrideMetroRate,
      overrideHourlyRate: repeatInfo.overrideHourlyRate,
    });
  }, [draft, rates, repeatInfo]);

  // Auto-track the recomputed price when the user edits inputs and hasn't
  // manually overridden the fee. The check on `editing` keeps this from
  // running in read mode.
  useEffect(() => {
    if (!editing || !draftBreakdown || draft.priceIsManual) return;
    const next = draftBreakdown.subtotal.toFixed(2);
    if (next !== draft.fee) {
      setDraft((prev) => ({ ...prev, fee: next }));
    }
  }, [editing, draftBreakdown, draft.priceIsManual, draft.fee]);

  if (!job) return null;

  // For pre-Phase-1 jobs gst_amount is null. Show the legacy "Total" line
  // (no synthetic GST split). For everything else, show Subtotal / GST / Total.
  const showLegacyTotal = job.gstAmount == null;
  const savedTotal = job.fee + (job.fuelLevy ?? 0) + (job.gstAmount ?? 0);

  const isHouseMove = draft.type === 'House Move';
  const isMetro = !isHouseMove && draft.location === 'Metro';
  const isRegional = !isHouseMove && draft.location === 'Regional';

  const startEdit = () => {
    setDraft(buildDraftFromJob(job));
    setEditing(true);
  };

  const cancelEdit = () => {
    setDraft(buildDraftFromJob(job));
    setEditing(false);
  };

  const applyRateBookPrice = () => {
    if (!draftBreakdown) return;
    setDraft((prev) => ({
      ...prev,
      fee: draftBreakdown.subtotal.toFixed(2),
      priceIsManual: false,
    }));
  };

  const saveEdit = async () => {
    if (!job) return;

    const changes: Record<string, unknown> = {};
    const historyEntries: Array<{ field: string; oldValue: string | null; newValue: string | null }> = [];

    const pushChange = <K extends keyof Job>(
      key: K,
      newValue: Job[K] | null,
      historyField: string,
      formatHistory: (v: Job[K] | null) => string | null = (v) =>
        v == null ? null : String(v),
    ) => {
      const before = job[key] ?? null;
      if ((before ?? null) === (newValue ?? null)) return;
      changes[key as string] = newValue ?? undefined;
      historyEntries.push({
        field: historyField,
        oldValue: formatHistory(before as Job[K] | null),
        newValue: formatHistory(newValue),
      });
    };

    // Customer name — text NOT NULL on jobs. Either the company name or the
    // contact name must be present (mirrors the new-quote rule). Editing is
    // local to this job; the linked customer record on Customers tab is not
    // touched here.
    const newName = draft.customerName.trim();
    const newCompany = draft.customerCompanyName.trim();
    if (!newName && !newCompany) {
      toast.error('Customer name or company name is required');
      return;
    }
    if (newName !== (job.customerName ?? '')) {
      // customer_name stays NOT NULL — fall back to company name if blank.
      const persisted = newName || newCompany;
      changes.customerName = persisted;
      historyEntries.push({
        field: 'customer_name',
        oldValue: job.customerName ?? null,
        newValue: persisted,
      });
    }
    if (newCompany !== (job.customerCompanyName ?? '')) {
      changes.customerCompanyName = newCompany || undefined;
      historyEntries.push({
        field: 'customer_company_name',
        oldValue: job.customerCompanyName ?? null,
        newValue: newCompany || null,
      });
    }

    // Date
    if (draft.date && draft.date !== job.date) {
      changes.date = draft.date;
      historyEntries.push({ field: 'date', oldValue: job.date ?? null, newValue: draft.date });
    }

    // Addresses
    const newPickup = draft.pickupAddress.trim();
    if (newPickup !== (job.pickupAddress ?? '')) {
      changes.pickupAddress = newPickup;
      historyEntries.push({
        field: 'pickup_address',
        oldValue: job.pickupAddress ?? null,
        newValue: newPickup,
      });
    }
    const newDelivery = draft.deliveryAddress.trim();
    if (newDelivery !== (job.deliveryAddress ?? '')) {
      changes.deliveryAddress = newDelivery;
      historyEntries.push({
        field: 'delivery_address',
        oldValue: job.deliveryAddress ?? null,
        newValue: newDelivery,
      });
    }

    // Phone — text NOT NULL in schema, so empty is '', not null.
    const newPhone = draft.customerPhone.trim();
    if (newPhone !== (job.customerPhone ?? '')) {
      changes.customerPhone = newPhone;
      historyEntries.push({
        field: 'customer_phone',
        oldValue: job.customerPhone || null,
        newValue: newPhone || null,
      });
    }

    // Notes — nullable text, empty = clear (becomes SQL NULL via the
    // useUpdateJob normaliser when undefined is passed; we pass undefined
    // explicitly when blank).
    const newNotes = draft.notes.trim();
    if (newNotes !== (job.notes ?? '')) {
      changes.notes = newNotes || undefined;
      historyEntries.push({
        field: 'notes',
        oldValue: job.notes || null,
        newValue: newNotes || null,
      });
    }

    // Type
    pushChange('type', draft.type as JobType, 'type');

    // Location is null on House Move jobs.
    const nextLocation: JobLocation | null = isHouseMove ? null : draft.location;
    pushChange('location', nextLocation as Job['location'], 'location');

    // Cubic metres only applies to Metro Standard / White Glove.
    const nextCubicMetres: number | null = isMetro && draft.cubicMetres
      ? parseFloat(draft.cubicMetres)
      : null;
    if ((nextCubicMetres ?? null) !== (job.cubicMetres ?? null)) {
      changes.cubicMetres = nextCubicMetres ?? undefined;
      historyEntries.push({
        field: 'cubic_metres',
        oldValue: job.cubicMetres != null ? String(job.cubicMetres) : null,
        newValue: nextCubicMetres != null ? String(nextCubicMetres) : null,
      });
    }

    // Hours estimated only applies to House Move.
    const nextHours: number | null = isHouseMove && draft.estimatedHours
      ? parseFloat(draft.estimatedHours)
      : null;
    if ((nextHours ?? null) !== (job.hoursEstimated ?? null)) {
      changes.hoursEstimated = nextHours ?? undefined;
      historyEntries.push({
        field: 'hours_estimated',
        oldValue: job.hoursEstimated != null ? String(job.hoursEstimated) : null,
        newValue: nextHours != null ? String(nextHours) : null,
      });
    }

    // pricingType is structurally derived from `type` — always reflect a
    // type change here so downstream code (Phase 1 quote builder, Xero
    // export, etc.) sees a coherent row.
    const nextPricingType = isHouseMove ? 'hourly' : 'fixed';
    if ((job.pricingType ?? null) !== nextPricingType) {
      changes.pricingType = nextPricingType;
    }

    // Hourly rate snapshot tracks the live rate when not manual; otherwise
    // we leave job.hourlyRate alone.
    if (isHouseMove && draftBreakdown && !draft.priceIsManual) {
      const nextHourlyRate = draftBreakdown.hourlyRate;
      if ((job.hourlyRate ?? 0) !== nextHourlyRate) {
        changes.hourlyRate = nextHourlyRate;
      }
    }

    // Fee + GST + manual flag.
    const parsedFee = parseFloat(draft.fee);
    const nextFee = isNaN(parsedFee) ? job.fee : Math.max(0, parsedFee);
    const nextGst = rates ? round2(nextFee * (rates.gstPercent / 100)) : job.gstAmount ?? 0;
    if (Math.abs((job.fee ?? 0) - nextFee) > 0.005) {
      changes.fee = nextFee;
      historyEntries.push({
        field: 'fee',
        oldValue: job.fee != null ? job.fee.toFixed(2) : null,
        newValue: nextFee.toFixed(2),
      });
    }
    if (Math.abs((job.gstAmount ?? 0) - nextGst) > 0.005) {
      changes.gstAmount = nextGst;
    }
    if ((job.priceIsManual ?? false) !== draft.priceIsManual) {
      changes.priceIsManual = draft.priceIsManual;
      historyEntries.push({
        field: 'price_is_manual',
        oldValue: (job.priceIsManual ?? false) ? 'manual' : 'auto',
        newValue: draft.priceIsManual ? 'manual' : 'auto',
      });
    }

    // V5 Phase 1: per-job SMS toggles. Stored as bool on jobs; legacy
    // rows read as undefined which we treat as ON.
    const formatOnOff = (v: boolean | null) => (v === false ? 'off' : 'on');
    pushChange('sendDayPrior', draft.sendDayPrior, 'send_day_prior', formatOnOff);
    pushChange('sendEnRoute', draft.sendEnRoute, 'send_en_route', formatOnOff);
    pushChange('sendComplete', draft.sendComplete, 'send_complete', formatOnOff);

    if (Object.keys(changes).length === 0) {
      setEditing(false);
      return;
    }

    try {
      await updateJob.mutateAsync({ id: job.id, ...changes } as Partial<Job> & { id: string });
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
                {editing ? (
                  <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                    <Input
                      value={draft.customerCompanyName}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, customerCompanyName: e.target.value }))
                      }
                      placeholder="Company name (optional)"
                      className="h-9 text-base font-bold"
                    />
                    <Input
                      value={draft.customerName}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, customerName: e.target.value }))
                      }
                      placeholder={
                        draft.customerCompanyName.trim() ? 'Contact person (optional)' : 'Customer name'
                      }
                      className="h-8 text-sm"
                    />
                  </div>
                ) : (
                  (() => {
                    const display = customerDisplay(job);
                    return (
                      <div className="min-w-0 flex-1">
                        <span className="truncate block max-w-full">{display.primary}</span>
                        {display.secondary && (
                          <span className="block text-[11px] font-normal text-muted-foreground truncate max-w-full">
                            Contact: {display.secondary}
                          </span>
                        )}
                      </div>
                    );
                  })()
                )}
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
              {/* Type / location / quantity chips — visible at all times so
                  Yamin can answer "is this white glove?" without scrolling. */}
              <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                <span className="inline-flex items-center gap-1 h-5 px-2 rounded-md bg-rebel-accent-surface text-rebel-accent text-[10px] font-bold uppercase tracking-wider">
                  {job.type}
                </span>
                {job.type !== 'House Move' && job.location && (
                  <span className="inline-flex items-center gap-1 h-5 px-2 rounded-md bg-indigo-100 text-indigo-700 text-[10px] font-semibold">
                    {job.location}
                  </span>
                )}
                {job.type !== 'House Move' && job.cubicMetres != null && (
                  <span className="inline-flex items-center gap-1 h-5 px-2 rounded-md bg-muted text-muted-foreground text-[10px] font-semibold">
                    {job.cubicMetres} m³
                  </span>
                )}
                {job.type === 'House Move' && job.hoursEstimated != null && (
                  <span className="inline-flex items-center gap-1 h-5 px-2 rounded-md bg-muted text-muted-foreground text-[10px] font-semibold">
                    {job.hoursEstimated} hrs
                  </span>
                )}
                {job.priceIsManual && (
                  <span
                    className="inline-flex items-center gap-1 h-5 px-2 rounded-md bg-amber-100 text-amber-800 text-[10px] font-semibold"
                    title="Price was manually set in the dialog (not from the rate book)"
                  >
                    Custom price
                  </span>
                )}
              </div>
            </div>
            {canEditFields && !editing && (
              <div className="flex gap-1.5 shrink-0 self-start items-center">
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={startEdit}
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Edit
                </Button>
                <JobActionMenu
                  job={job}
                  trucks={trucks}
                  size="sm"
                  onAction={(a) => handleMenuAction(job, a)}
                />
              </div>
            )}
            {editing && (
              <div className="flex gap-1.5 shrink-0 self-start items-center">
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
                {/* V4 2.5: same menu in edit mode so Yamin doesn't have to
                    save-and-exit just to mark a status. */}
                <JobActionMenu
                  job={job}
                  trucks={trucks}
                  size="sm"
                  onAction={(a) => handleMenuAction(job, a)}
                />
              </div>
            )}
          </div>
        </DialogHeader>

        <div className="grid gap-4 py-2 max-h-[60dvh] sm:max-h-[65vh] overflow-y-auto pr-1 -mr-1">
          <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <DetailRow icon={MapPin} label="Pickup">
              {editing ? (
                <AddressAutocomplete
                  value={draft.pickupAddress}
                  onChange={(v) => setDraft((d) => ({ ...d, pickupAddress: v }))}
                  placeholder="Pickup address"
                  className="h-10 sm:h-8 text-sm"
                />
              ) : (
                <AddressWithMaps address={job.pickupAddress} />
              )}
            </DetailRow>
            <DetailRow icon={MapPin} label="Delivery">
              {editing ? (
                <AddressAutocomplete
                  value={draft.deliveryAddress}
                  onChange={(v) => setDraft((d) => ({ ...d, deliveryAddress: v }))}
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
              {editing ? (
                <Input
                  value={draft.customerPhone}
                  onChange={(e) => setDraft((d) => ({ ...d, customerPhone: e.target.value }))}
                  placeholder="04xx xxx xxx"
                  className="h-10 sm:h-8 text-sm"
                />
              ) : job.customerPhone ? (
                <a href={`tel:${job.customerPhone}`} className="text-rebel-accent hover:underline">
                  {job.customerPhone}
                </a>
              ) : (
                '—'
              )}
            </DetailRow>
            <DetailRow icon={DollarSign} label="Total inc-GST">
              {showLegacyTotal ? (
                <>
                  ${savedTotal.toFixed(2)}
                  <span className="text-[10px] text-muted-foreground ml-1" title="Pre-Phase-1 quote — no GST stored separately">
                    (legacy)
                  </span>
                </>
              ) : (
                <>${savedTotal.toFixed(2)}</>
              )}
            </DetailRow>
          </section>

          {/* Edit-only: type / location / cubes-or-hours selectors. Mirrors
              the New Quote dialog's morphing form so the price recompute
              logic stays consistent. */}
          {editing && (
            <section className="rounded-xl border border-rebel-border bg-card p-3 space-y-3">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Pricing inputs
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Job type
                  </label>
                  <select
                    value={draft.type}
                    onChange={(e) => {
                      const next = e.target.value as JobType;
                      setDraft((d) => ({
                        ...d,
                        type: next,
                        // Clear inputs that don't apply to the new type so
                        // recompute is honest. Keeps the saved DB null
                        // semantics correct on save.
                        cubicMetres: next === 'House Move' ? '' : d.cubicMetres,
                        estimatedHours:
                          next === 'House Move'
                            ? d.estimatedHours || String(rates?.minimumHours ?? 3)
                            : '',
                      }));
                    }}
                    className="h-9 w-full rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    <option value="Standard">Standard</option>
                    <option value="White Glove">White Glove</option>
                    <option value="House Move">House Move</option>
                  </select>
                </div>

                {!isHouseMove && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Location
                    </label>
                    <div className="flex gap-2">
                      {(['Metro', 'Regional'] as JobLocation[]).map((loc) => (
                        <button
                          key={loc}
                          type="button"
                          onClick={() => setDraft((d) => ({ ...d, location: loc }))}
                          className={cn(
                            'flex-1 h-9 rounded-lg border text-xs font-semibold transition-colors',
                            draft.location === loc
                              ? 'bg-rebel-accent border-rebel-accent text-white'
                              : 'bg-card border-input text-muted-foreground hover:bg-muted',
                          )}
                        >
                          {loc}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {isMetro && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Cubic metres (m³)
                    </label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      pattern="[0-9]*\.?[0-9]*"
                      value={draft.cubicMetres}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, cubicMetres: sanitiseDecimal(e.target.value) }))
                      }
                      placeholder="e.g. 2"
                      className="h-9"
                    />
                  </div>
                )}

                {isHouseMove && rates && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Estimated hours (min {rates.minimumHours})
                    </label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      pattern="[0-9]*\.?[0-9]*"
                      value={draft.estimatedHours}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, estimatedHours: sanitiseDecimal(e.target.value) }))
                      }
                      onBlur={() => {
                        const v = parseFloat(draft.estimatedHours);
                        if (!isNaN(v) && rates && v < rates.minimumHours) {
                          setDraft((d) => ({ ...d, estimatedHours: String(rates.minimumHours) }));
                          toast.message(`Minimum ${rates.minimumHours} hours applied`);
                        }
                      }}
                      className="h-9"
                    />
                  </div>
                )}

                {isRegional && (
                  <div className="rounded-lg bg-muted/40 p-2 text-[11px] text-muted-foreground">
                    Regional jobs use a flat minimum charge of{' '}
                    {rates
                      ? formatAud(
                          draft.type === 'White Glove' ? rates.wgRegionalMinimumAud : rates.regionalMinimumAud,
                        )
                      : '—'}{' '}
                    ({draft.type === 'White Glove' ? 'White Glove rate' : 'Standard rate'}).
                  </div>
                )}
              </div>

              {/* Price input + recompute toggle */}
              <div className="flex flex-col sm:flex-row sm:items-end gap-2 pt-2 border-t border-rebel-border">
                <div className="flex-1 space-y-1">
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Price (ex-GST)
                  </label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    pattern="[0-9]*\.?[0-9]*"
                    value={draft.fee}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, fee: sanitiseDecimal(e.target.value), priceIsManual: true }))
                    }
                    className="h-9"
                  />
                </div>
                {draftBreakdown && draft.priceIsManual && (
                  <div className="flex flex-col gap-1 text-right">
                    <span className="text-[10px] text-muted-foreground">
                      Rate book: {formatAud(draftBreakdown.subtotal)}
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 text-[11px]"
                      onClick={applyRateBookPrice}
                    >
                      Apply rate-book price
                    </Button>
                  </div>
                )}
                {draftBreakdown && !draft.priceIsManual && (
                  <span className="text-[10px] text-muted-foreground sm:pb-2">
                    {draftBreakdown.explainer}
                  </span>
                )}
              </div>
            </section>
          )}

          {/* Pricing breakdown — read-only line items in both modes. */}
          <section className="rounded-xl border border-rebel-border bg-muted/30 p-3 text-xs space-y-1">
            {showLegacyTotal ? (
              <div className="flex justify-between">
                <span className="font-semibold">Total</span>
                <span className="font-bold text-base">${savedTotal.toFixed(2)}</span>
              </div>
            ) : (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {editing && draftBreakdown
                      ? draftBreakdown.explainer
                      : 'Subtotal'}
                  </span>
                  <span className="font-semibold">
                    ${(editing ? parseFloat(draft.fee) || 0 : job.fee).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    GST ({rates?.gstPercent ?? 10}%)
                  </span>
                  <span className="font-semibold">
                    $
                    {(editing && rates
                      ? round2((parseFloat(draft.fee) || 0) * (rates.gstPercent / 100))
                      : job.gstAmount ?? 0
                    ).toFixed(2)}
                  </span>
                </div>
                {!editing && job.fuelLevy && job.fuelLevy > 0 ? (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Fuel levy</span>
                    <span>${job.fuelLevy.toFixed(2)}</span>
                  </div>
                ) : null}
                <div className="flex justify-between pt-1 border-t border-rebel-border">
                  <span className="font-semibold">Total inc. GST</span>
                  <span className="font-bold text-base">
                    $
                    {(editing && rates
                      ? round2(
                          (parseFloat(draft.fee) || 0) * (1 + rates.gstPercent / 100),
                        )
                      : savedTotal
                    ).toFixed(2)}
                  </span>
                </div>
              </>
            )}
          </section>

          {/* V5 P9: clocked-time reconciliation for hourly jobs. Compares
              en-route → complete timestamps against the billed hours so
              Yamin sees mismatches before invoicing. */}
          <ClockedTimeReconciliation
            job={job}
            billedHours={
              editing
                ? (() => {
                    const v = parseFloat(draft.estimatedHours);
                    return isNaN(v) ? null : v;
                  })()
                : job.hoursEstimated ?? null
            }
          />

          {(editing || job.notes) && (
            <section className="space-y-1">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <StickyNote className="w-3 h-3" />
                Notes
              </h3>
              {editing ? (
                <textarea
                  value={draft.notes}
                  onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
                  rows={3}
                  placeholder="Access codes, stairs, fragile items, parking…"
                  className="w-full rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 outline-none focus-visible:border-amber-400 focus-visible:ring-3 focus-visible:ring-amber-200/50"
                />
              ) : (
                <p className="text-xs whitespace-pre-wrap bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-900">
                  {job.notes}
                </p>
              )}
            </section>
          )}

          {/* V5 Phase 1: per-job SMS toggles. En-route / Complete status
              flips always still fire — only the customer text is gated. */}
          <section className="space-y-1">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <MessageSquare className="w-3 h-3" />
              Customer SMS
            </h3>
            {editing ? (
              <div className="space-y-1.5 rounded-lg border border-border bg-muted/30 p-3">
                <label className="flex items-start gap-2 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={draft.sendDayPrior}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, sendDayPrior: e.target.checked }))
                    }
                    className="h-3.5 w-3.5 mt-0.5 rounded border-border"
                  />
                  <span>
                    <span className="font-medium">Day-prior reminder</span>
                    <span className="text-muted-foreground"> — sent the evening before</span>
                  </span>
                </label>
                <label className="flex items-start gap-2 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={draft.sendEnRoute}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, sendEnRoute: e.target.checked }))
                    }
                    className="h-3.5 w-3.5 mt-0.5 rounded border-border"
                  />
                  <span>
                    <span className="font-medium">En-route notice</span>
                    <span className="text-muted-foreground"> — driver still records "en-route" for dispatch</span>
                  </span>
                </label>
                <label className="flex items-start gap-2 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={draft.sendComplete}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, sendComplete: e.target.checked }))
                    }
                    className="h-3.5 w-3.5 mt-0.5 rounded border-border"
                  />
                  <span>
                    <span className="font-medium">Job complete</span>
                    <span className="text-muted-foreground"> — sent after sign-off</span>
                  </span>
                </label>
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    { label: 'Day-prior', on: job.sendDayPrior !== false },
                    { label: 'En-route', on: job.sendEnRoute !== false },
                    { label: 'Complete', on: job.sendComplete !== false },
                  ] as const
                ).map((pill) => (
                  <span
                    key={pill.label}
                    className={cn(
                      'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium',
                      pill.on
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : 'border-border bg-muted text-muted-foreground',
                    )}
                  >
                    {pill.on ? (
                      <CheckCircle2 className="w-3 h-3" />
                    ) : (
                      <XIcon className="w-3 h-3" />
                    )}
                    {pill.label}
                  </span>
                ))}
              </div>
            )}
          </section>

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
            {/* Xero button shows only when connected or already sent — keeps the
                action bar clean for the day-to-day flow. */}
            {(xeroAlreadySent || (xeroEligible && xeroConnected)) && (
              <Button
                variant="outline"
                size="sm"
                className={
                  'gap-1.5 flex-1 sm:flex-initial min-w-0 ' +
                  (xeroAlreadySent
                    ? 'text-rebel-success border-rebel-success/40 hover:bg-rebel-success-surface'
                    : '')
                }
                title={
                  xeroAlreadySent
                    ? `Already sent to Xero (invoice ${job.xeroInvoiceId})`
                    : 'Send a draft invoice to Xero'
                }
              >
                {xeroAlreadySent ? (
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                ) : (
                  <FileText className="w-3.5 h-3.5 shrink-0" />
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
      {/* V4 2.5: triggered when "Mark complete…" is picked from the menu.
          Local instance keeps the flow self-contained inside the dialog. */}
      <MarkCompleteDialog
        job={menuMarkCompleteTarget}
        onClose={() => setMenuMarkCompleteTarget(null)}
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
    case 'customer_name':
      return 'Customer name';
    case 'customer_company_name':
      return 'Company name';
    case 'customer_phone':
      return 'Phone';
    case 'notes':
      return 'Notes';
    case 'type':
      return 'Job type';
    case 'location':
      return 'Location';
    case 'cubic_metres':
      return 'Cubic metres';
    case 'hours_estimated':
      return 'Estimated hours';
    case 'fee':
      return 'Price';
    case 'price_is_manual':
      return 'Pricing source';
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
        No edits yet. Any change to type, price, addresses, date, phone, or notes lands here.
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

// ──────────────────────────────────────────────────────────────────
// V5 Phase 9 — clocked-time reconciliation
// ──────────────────────────────────────────────────────────────────

const RECONCILE_THRESHOLD_HOURS = 0.5; // 30min — Yamin's "I undercharged" tolerance

function ClockedTimeReconciliation({
  job,
  billedHours,
}: {
  job: Job;
  billedHours: number | null;
}) {
  // Hourly jobs only — Standard / White Glove are priced on volume.
  const isHourly = job.type === 'House Move' || job.pricingType === 'hourly';
  if (!isHourly) return null;

  // En-route SMS timestamp is the cleanest "started driving" signal we
  // have today. Falls through to completionSmsSentAt → completedAt for
  // the end. If en-route never fired (driver opted out via V5 P1 or
  // skipped status flip), we have no clock to show.
  const startIso = job.enRouteSmsSentAt ?? null;
  const endIso = job.completionSmsSentAt ?? job.completedAt ?? null;
  if (!startIso || !endIso) return null;

  let start: Date;
  let end: Date;
  try {
    start = parseISO(startIso);
    end = parseISO(endIso);
  } catch {
    return null;
  }
  const ms = end.getTime() - start.getTime();
  if (ms <= 0) return null;
  const clockedHours = ms / (1000 * 60 * 60);

  const clockedStr = clockedHours.toFixed(1);
  const billedKnown = billedHours != null && !isNaN(billedHours);
  const billedStr = billedKnown ? billedHours!.toFixed(1) : '—';
  const overcharge =
    billedKnown && billedHours! - clockedHours > RECONCILE_THRESHOLD_HOURS;
  const undercharge =
    billedKnown && clockedHours - billedHours! > RECONCILE_THRESHOLD_HOURS;
  const mismatch = overcharge || undercharge;

  return (
    <section className="space-y-1">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
        <Clock className="w-3 h-3" />
        Clocked time
      </h3>
      {mismatch ? (
        <div className="rounded-lg border border-amber-300 bg-amber-50/70 p-3 space-y-1">
          <p className="text-xs font-bold text-amber-900">
            {undercharge
              ? `Boys clocked ${clockedStr}h · you billed ${billedStr}h`
              : `You billed ${billedStr}h · boys only clocked ${clockedStr}h`}
          </p>
          <p className="text-[11px] text-amber-800 leading-snug">
            En-route {format(start, 'HH:mm')} → complete {format(end, 'HH:mm')}.
            {' '}
            {undercharge
              ? 'Bump the estimated hours or confirm the bill if intentional.'
              : 'Trim the estimated hours or leave it if you billed a minimum.'}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-rebel-border bg-muted/30 p-2.5 text-[11px] text-muted-foreground">
          Clocked <span className="font-semibold text-foreground">{clockedStr}h</span>
          {' · '}
          billed <span className="font-semibold text-foreground">{billedStr}h</span>
          <span className="ml-1.5">
            ({format(start, 'HH:mm')} → {format(end, 'HH:mm')})
          </span>
        </div>
      )}
    </section>
  );
}
