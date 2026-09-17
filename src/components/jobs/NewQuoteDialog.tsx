import { useEffect, useMemo, useState, type ReactNode } from 'react';
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
import { Label } from '@/components/ui/label';
import { AddressAutocomplete } from '@/components/ui/AddressAutocomplete';
import { useCreateJob } from '@/hooks/useSupabaseData';
import { usePricingRates } from '@/hooks/usePricingRates';
import { useRepeatCustomerLookup, type RepeatCustomerInfo } from '@/hooks/useRepeatCustomer';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { CustomerCombobox } from '@/components/customers/CustomerCombobox';
import { useCustomers } from '@/hooks/useSupabaseData';
import type { Customer } from '@/lib/types';
import { isNearDuplicate } from '@/lib/utils';
import {
  Job,
  FuelLevyMode,
  JobLocation,
  JobType,
  StorageRecord,
  DisposalLoad,
  StorageTerm,
  StorageTier,
  TruckSize,
  WarehouseService,
} from '@/lib/types';
import { formatAud } from '@/lib/pricing';
import { priceJob, disposalAllowed, packagingAllowed } from '@/lib/jobPricing';
import { extractPostcode, locationForPostcode } from '@/lib/metroPostcodes';
import { useMetroPostcodes } from '@/hooks/useMetroPostcodes';
import { sanitiseDecimal } from '@/lib/utils';
import { format, addDays } from 'date-fns';
import { toast } from 'sonner';
import { Sparkles, Info, Mic, MicOff, AlertTriangle } from 'lucide-react';

interface NewQuoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefillJob?: Job | null;
  /** V5 P5: when set, the dialog opens seeded as a load-OUT delivery
   *  for a storage record (customer + items pre-filled, pickup defaults
   *  to the warehouse address line in notes). */
  prefillStorage?: StorageRecord | null;
}

function defaultValidUntil() {
  return format(addDays(new Date(), 30), 'yyyy-MM-dd');
}

/**
 * Whether "Job complete" starts ticked, by job type (Yamin, 2026-09-16).
 *
 * Deliveries end with the customer somewhere else, so the completion text
 * doing the review ask is the whole point. Hourly rate ends with the crew
 * standing in the customer's new lounge room, where texting them "your job is
 * complete" reads as odd; Storage ends with their furniture sitting in our
 * warehouse, which is not a completed job from their side at all. Both stay
 * off and are ticked by hand if wanted.
 */
const completeDefaultFor = (type: JobType) => type === 'Standard' || type === 'White Glove';

function formFromJob(job: Job): typeof initial {
  return {
    ...initial,
    customerName: job.customerName ?? '',
    customerCompanyName: job.customerCompanyName ?? '',
    customerPhone: job.customerPhone ?? '',
    customerId: job.customerId ?? '',
    pickupAddress: job.pickupAddress ?? '',
    deliveryAddress: job.deliveryAddress ?? '',
    recipientName: job.recipientName ?? '',
    recipientPhone: job.recipientPhone ?? '',
    sendDayPrior: job.sendDayPrior ?? true,
    sendEnRoute: job.sendEnRoute ?? true,
    sendComplete: job.sendComplete ?? true,
    type: job.type,
    location: (job.location as JobLocation) ?? 'Metro',
    cubicMetres: job.cubicMetres != null ? String(job.cubicMetres) : '',
    itemWeightKg: job.itemWeightKg != null ? String(job.itemWeightKg) : '',
    estimatedHours: job.hoursEstimated != null ? String(job.hoursEstimated) : '',
    notes: job.notes ?? '',
    validUntil: job.validUntil ?? defaultValidUntil(),
  };
}

// V5 P5: turn a storage record into a load-OUT delivery quote. Pickup
// is left blank for Yamin to fill (could be warehouse, could be the
// new destination of the items). Items description carries over to
// notes so the driver knows what they're loading.
function formFromStorage(record: StorageRecord): typeof initial {
  return {
    ...initial,
    customerName: record.customerName,
    customerCompanyName: '',
    customerPhone: '',
    customerId: record.customerId ?? '',
    pickupAddress: '',
    deliveryAddress: '',
    recipientName: '',
    recipientPhone: '',
    sendDayPrior: false,
    sendEnRoute: false,
    sendComplete: completeDefaultFor('Standard'),
    type: 'Standard' as JobType,
    location: 'Metro' as JobLocation,
    cubicMetres: '',
    itemWeightKg: '',
    estimatedHours: '',
    notes: `Load-out from storage: ${record.itemsDescription}`,
    validUntil: defaultValidUntil(),
  };
}

const initial = {
  customerName: '',
  customerCompanyName: '',
  customerPhone: '',
  /** Phase 19: when set, the quote re-uses an existing customer record
   *  instead of triggering upsertCustomerByPhone. Empty = "create new". */
  customerId: '',
  pickupAddress: '',
  deliveryAddress: '',
  recipientName: '',
  recipientPhone: '',
  // Customer SMS toggles — all three default OFF (Yamin, 2026-09-15). He
  // wants to opt each message IN per job rather than remember to opt out:
  // day-prior in particular doesn't yet behave the way he wants, and he was
  // switching it off by hand on every job.
  //
  // Note the `jobs.send_*` column defaults in Postgres are still `true`, so
  // this is a UI-level default for the create dialog only — anything
  // inserting a job by another route is unaffected.
  sendDayPrior: false,
  sendEnRoute: false,
  sendComplete: completeDefaultFor('Standard'),
  type: 'Standard' as JobType,
  location: 'Metro' as JobLocation,
  cubicMetres: '',
  itemWeightKg: '',
  estimatedHours: '',
  notes: '',
  validUntil: defaultValidUntil(),

  // V7. Hourly work picks a truck; Labour and warehouse work pick a crew.
  truckSize: 'standard' as TruckSize,
  labourers: '',

  // Warehousing is three services, never combined on one quote.
  warehouseService: 'storage' as WarehouseService,
  storageTier: 'Standard' as StorageTier,
  storageTerm: 'Long term' as StorageTerm,
  storageDays: '',
  containerSize: '20 ft' as '20 ft' | '40 ft',
  whLabourType: 'outbound' as 'outbound' | 'qc' | 'unload',
  legsHours: '',

  // How this quote treats the fuel levy. 'rate_book' follows the switch as
  // it stands now; the other two are the manual override for a job quoted in
  // one month and carried out in another.
  fuelLevyMode: 'rate_book' as FuelLevyMode,

  // Extras tick onto the job that created them.
  extraLabourOn: false,
  disposalOn: false,
  disposalLoad: 'van' as DisposalLoad,
  disposalAmount: '',
  packagingOn: false,
  packagingAmount: '',
};

export function NewQuoteDialog({
  open,
  onOpenChange,
  prefillJob,
  prefillStorage,
}: NewQuoteDialogProps) {
  const [form, setForm] = useState(initial);
  const { data: metroList } = useMetroPostcodes();
  const [nameTouched, setNameTouched] = useState(false);
  // Once Job complete is ticked or unticked by hand, stop re-deriving it from
  // the job type — an explicit choice outranks the default.
  const [completeTouched, setCompleteTouched] = useState(false);
  // Phase 19: when set, the combobox is showing the user picked an
  // existing customer record. We hold the full Customer here so the
  // "Linked to X" badge has the latest companyName / VIP status.
  const [linkedCustomer, setLinkedCustomer] = useState<Customer | null>(null);
  // The combobox query is the visible "search" string. It's the same as
  // companyName when picked, or whatever the user typed when no match.
  const [searchQuery, setSearchQuery] = useState('');
  const createJob = useCreateJob();
  const { data: rates } = usePricingRates();
  // V4 2.1: pull the customer book so we can flag near-duplicates ("Bayless"
  // vs "Bayleys") before Yamin creates a third copy.
  const { data: existingCustomers = [] } = useCustomers();

  const { info: repeatInfo } = useRepeatCustomerLookup(form.customerPhone);
  const voice = useVoiceInput((transcript) => {
    setForm((prev) => ({ ...prev, notes: transcript }));
  });

  useEffect(() => {
    if (open && prefillJob) {
      const next = formFromJob(prefillJob);
      setForm(next);
      setSearchQuery(next.customerCompanyName || next.customerName);
      setLinkedCustomer(null);
      setNameTouched(true);
      // Rebooking carries the original job's choice; don't re-derive it.
      setCompleteTouched(true);
    } else if (open && prefillStorage) {
      const next = formFromStorage(prefillStorage);
      setForm(next);
      setSearchQuery(next.customerName);
      setLinkedCustomer(null);
      setNameTouched(true);
      setCompleteTouched(false);
    } else if (!open) {
      setForm({ ...initial, validUntil: defaultValidUntil() });
      setSearchQuery('');
      setLinkedCustomer(null);
      setNameTouched(false);
      setCompleteTouched(false);
    }
  }, [open, prefillJob, prefillStorage]);

  const handlePickCustomer = (c: Customer) => {
    setLinkedCustomer(c);
    setSearchQuery(c.companyName ?? c.name);
    // For B2B (company customers), the contact person, phone, and pickup
    // change with every booking — leave them blank for Yamin to fill in
    // per-job. Only the company identity carries across. For individuals,
    // pre-fill name + phone from the customer record as before.
    const isB2B = !!(c.companyName?.trim());
    setForm((prev) => ({
      ...prev,
      customerId: c.id,
      customerCompanyName: c.companyName ?? '',
      customerName: isB2B ? '' : c.name,
      customerPhone: isB2B ? '' : (c.phone ?? ''),
      pickupAddress: isB2B ? '' : prev.pickupAddress,
    }));
    // Mark touched so the phone-based repeat-lookup useEffect doesn't
    // overwrite the intentionally-blank fields after a B2B pick.
    setNameTouched(true);
  };

  const handleClearPick = () => {
    setLinkedCustomer(null);
    setForm((prev) => ({ ...prev, customerId: '' }));
    // We deliberately leave the typed name + phone in the form — the
    // user is editing details to create a fresh customer. They can
    // clear the inputs themselves if they want a blank slate.
  };

  // V5 Phase 3: apply the linked customer's billing preset. For hourly
  // we flip the job type to Hourly rate so the hours input + auto-calc
  // (which already respects overrideHourlyRate) light up. For flat /
  // per-item we can't override the auto-priced fee from this dialog,
  // so we surface the agreed rate via a notes line — Yamin sets the
  // fee in the job dialog after creating with priceIsManual=true.
  const handlePrefillFromCustomer = () => {
    const c = linkedCustomer;
    if (!c) return;
    const basis = c.billingBasis ?? 'none';
    if (basis === 'none') return;
    const rate = c.defaultRate;
    const noteParts: string[] = [];
    if (form.notes.trim()) noteParts.push(form.notes.trim());
    if (c.defaultNotes?.trim()) noteParts.push(c.defaultNotes.trim());
    if (basis !== 'hourly' && rate != null) {
      const unit = basis === 'flat' ? 'flat (ex GST)' : 'per unit (ex GST)';
      noteParts.push(`Agreed rate: $${rate.toFixed(2)} ${unit}`);
    }
    setForm((prev) => {
      const nextType = basis === 'hourly' ? ('Hourly rate' as JobType) : prev.type;
      return {
        ...prev,
        type: nextType,
        ...(completeTouched ? {} : { sendComplete: completeDefaultFor(nextType) }),
        notes: noteParts.join('\n'),
      };
    });
    toast.success(
      `Pre-filled from ${c.companyName ?? c.name}`,
      basis === 'hourly'
        ? undefined
        : {
            description: `Adjust fee in the job dialog after creating — agreed rate is $${rate?.toFixed(2) ?? '—'}.`,
          },
    );
  };

  const handleSearchChange = (next: string) => {
    setSearchQuery(next);
    // Mirror the typed text into the right field so the form-state and
    // the visible combobox stay coherent. If the customer is currently
    // linked, detaching is handled by the combobox via onClearPick.
    setNameTouched(true);
    setForm((prev) => {
      const looksLikeCompany = next.trim().length > 0 && /[A-Z][a-z]+\s+[A-Z]/.test(next);
      // We can't reliably tell "company vs person" from a single string —
      // so on free-text typing we always store it as customerName. The
      // user can move it to the Company field manually if needed.
      return { ...prev, customerName: next };
    });
  };

  useEffect(() => {
    // Skip the auto-fill for B2B — the contact person and pickup change
    // every booking, so reusing the previous values is the bug Yamin hit
    // on the May 4 call.
    if (form.customerCompanyName.trim()) return;
    if (repeatInfo.found && repeatInfo.customerName && !nameTouched && !form.customerName) {
      setForm((prev) => ({
        ...prev,
        customerName: repeatInfo.customerName!,
        pickupAddress: prev.pickupAddress || repeatInfo.lastPickup || '',
      }));
    }
  }, [repeatInfo, nameTouched, form.customerName, form.customerCompanyName]);

  // Default the estimated-hours field to the minimum once rates load.
  useEffect(() => {
    if (form.type === 'Hourly rate' && rates && !form.estimatedHours) {
      setForm((prev) => ({ ...prev, estimatedHours: String(rates.minimumHours) }));
    }
  }, [form.type, rates, form.estimatedHours]);

  const update = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  /** Changing the job type re-derives Job complete, until it is set by hand. */
  const handleTypeChange = (next: JobType) =>
    setForm((prev) => ({
      ...prev,
      type: next,
      ...(completeTouched ? {} : { sendComplete: completeDefaultFor(next) }),
    }));

  // V4 2.1: when no customer is linked, scan the customer book for a near-
  // match on what the user has typed (company name first, then customer
  // name). Returns the closest existing record so we can surface a "Did
  // you mean X?" banner above the combobox.
  const dupCandidate = useMemo<Customer | null>(() => {
    if (linkedCustomer) return null;
    const typedCompany = form.customerCompanyName.trim();
    const typedName = form.customerName.trim();
    if (!typedCompany && !typedName) return null;
    for (const c of existingCustomers) {
      if (c.deletedAt) continue;
      // Company-vs-company is the high-signal match Yamin keeps hitting.
      if (typedCompany && c.companyName && isNearDuplicate(typedCompany, c.companyName)) {
        return c;
      }
      if (typedName && !typedCompany) {
        if (c.companyName && isNearDuplicate(typedName, c.companyName)) return c;
        if (c.name && isNearDuplicate(typedName, c.name)) return c;
      }
    }
    return null;
  }, [linkedCustomer, form.customerCompanyName, form.customerName, existingCustomers]);

  // V7: the delivery postcode decides the zone, and nothing else does. The
  // old Metro/Regional toggle is gone — the list in Settings → Pricing is
  // the only place a suburb moves between bands.
  const deliveryPostcode = extractPostcode(form.deliveryAddress);
  const zone: JobLocation | null =
    deliveryPostcode === null ? null : locationForPostcode(deliveryPostcode, metroList);

  const breakdown = useMemo(() => {
    if (!rates) return null;
    return priceJob({
      type: form.type,
      rates,
      postcode: deliveryPostcode,
      metroPostcodes: metroList,
      cubicMetres: parseFloat(form.cubicMetres) || 0,
      estimatedHours: parseFloat(form.estimatedHours) || 0,
      truckSize: form.truckSize,
      labourers: parseFloat(form.labourers) || 0,
      warehouseService: form.warehouseService,
      storageTier: form.storageTier,
      storageTerm: form.storageTerm,
      storageDays: parseFloat(form.storageDays) || 0,
      containerSize: form.containerSize,
      whLabourType: form.whLabourType,
      legsHours: parseFloat(form.legsHours) || 0,
      extraLabourOn: form.extraLabourOn,
      fuelLevyMode: form.fuelLevyMode,
      disposalLoad: form.disposalOn ? form.disposalLoad : undefined,
      disposalAmount: parseFloat(form.disposalAmount) || 0,
      packagingAmount: form.packagingOn ? parseFloat(form.packagingAmount) || 0 : undefined,
      overrideMetroRate: repeatInfo.overrideMetroRate,
      overrideHourlyRate: repeatInfo.overrideHourlyRate,
    });
  }, [form, rates, repeatInfo, deliveryPostcode, metroList]);

  const isHouseMove = form.type === 'Hourly rate';
  const isLabour = form.type === 'Labour';
  const isWarehousing = form.type === 'Storage';
  const whStoring = isWarehousing && form.warehouseService === 'storage';
  const whContainer = isWarehousing && form.warehouseService === 'container_unload';
  const whLabour = isWarehousing && form.warehouseService === 'labour_work';
  // Crew size is asked for wherever labour is actually priced.
  const extraLabour = (whStoring || whContainer) && form.extraLabourOn;
  const needsCrew = isLabour || whLabour || extraLabour;
  const isDelivery = form.type === 'Standard' || form.type === 'White Glove';
  const canDispose = !!rates && disposalAllowed({
    type: form.type,
    rates,
    cubicMetres: parseFloat(form.cubicMetres) || 0,
    warehouseService: form.warehouseService,
  });
  const canPackage = packagingAllowed(form.type);
  // A job with no readable postcode yet prices per m³, so it needs the
  // volume field — see the note priceJob puts on the line.
  const isMetro = isDelivery && zone !== 'Regional';
  const isRegional = isDelivery && zone === 'Regional';
  const usingOverride =
    (isHouseMove && repeatInfo.overrideHourlyRate != null) ||
    (isMetro && repeatInfo.overrideMetroRate != null);

  // Phase 14/16/V4-1.5: an identity is required. Either the company name
  // (B2B — Yamin's most common case) OR the customer/contact name (B2C).
  // Everything else stays optional per Yamin's "name only" rule. The
  // company-only case is what unlocks the B2B picker flow where the
  // contact person is filled in later per booking.
  const baseValid = !!(form.customerCompanyName.trim() || form.customerName.trim());

  const pricingValid = (() => {
    if (!breakdown) return false;
    // A regional delivery is the flat minimum and needs no volume; every
    // other type has to price to something before it can be quoted.
    if (isRegional) return true;
    if (isDelivery) return (parseFloat(form.cubicMetres) || 0) > 0;
    return breakdown.chargeable > 0;
  })();

  const canSubmit = !!baseValid && pricingValid && !createJob.isPending;
  const canSaveDraft = !!baseValid && !createJob.isPending;

  const buildPayload = (asDraft: boolean) => {
    if (!breakdown) throw new Error('Pricing rates not loaded');
    return {
      id: `RL-${Date.now().toString(36).toUpperCase()}`,
      // Phase 19: skip the customer upsert in useCreateJob when a record
      // was picked from the combobox.
      customerId: form.customerId || undefined,
      customerName: form.customerName.trim(),
      customerCompanyName: form.customerCompanyName.trim() || undefined,
      customerPhone: form.customerPhone.trim() || undefined,
      pickupAddress: form.pickupAddress.trim(),
      deliveryAddress: form.deliveryAddress.trim(),
      recipientName: form.recipientName.trim() || undefined,
      recipientPhone: form.recipientPhone.trim() || undefined,
      sendDayPrior: form.sendDayPrior,
      sendEnRoute: form.sendEnRoute,
      sendComplete: form.sendComplete,
      type: form.type,
      status: 'Quote' as const,
      date: format(new Date(), 'yyyy-MM-dd'),
      fee: breakdown.chargeable,
      fuelLevy: breakdown.levy,
      // Frozen at quote time. The rate book's switch can move afterwards;
      // this job keeps what it was quoted at.
      fuelLevyPctApplied: breakdown.levyPct,
      fuelLevyMode: form.fuelLevyMode,
      gstAmount: breakdown.gst,
      location: isHouseMove ? undefined : (zone ?? undefined),
      cubicMetres: isHouseMove
        ? undefined
        : isMetro
          ? parseFloat(form.cubicMetres) || 0
          : undefined,
      itemWeightKg: form.itemWeightKg ? parseFloat(form.itemWeightKg) : undefined,

      // V7 inputs, stored so the quote can be reread and re-explained later.
      truckSize: isHouseMove ? form.truckSize : undefined,
      labourers: needsCrew ? parseFloat(form.labourers) || 0 : undefined,
      warehouseService: isWarehousing ? form.warehouseService : undefined,
      storageTier: whStoring ? form.storageTier : undefined,
      storageTerm: whStoring ? form.storageTerm : undefined,
      storageDays: whStoring ? parseFloat(form.storageDays) || 0 : undefined,
      containerSize: whContainer ? form.containerSize : undefined,
      whLabourType: whLabour || extraLabour ? form.whLabourType : undefined,
      legsHours: (whStoring || whContainer) && form.legsHours
        ? parseFloat(form.legsHours) || 0
        : undefined,

      // Extras are stored as resolved amounts, not as a rate to look up
      // again, so a later rate change cannot restate a quoted job.
      disposalLoad: form.disposalOn && canDispose ? form.disposalLoad : undefined,
      disposalAmount: form.disposalOn && canDispose
        ? breakdown.lines.find((l) => l.label === 'Rubbish disposal')?.amount
        : undefined,
      disposalTransportAmount: form.disposalOn && canDispose
        ? breakdown.lines.find((l) => l.label === 'Transport fee')?.amount
        : undefined,
      packagingAmount: form.packagingOn && canPackage
        ? parseFloat(form.packagingAmount) || 0
        : undefined,

      pricingType: isHouseMove ? ('hourly' as const) : ('fixed' as const),
      hourlyRate: isHouseMove ? (repeatInfo.overrideHourlyRate ?? rates?.hourlyRateAud) : undefined,
      hoursEstimated: isHouseMove ? parseFloat(form.estimatedHours) || 0 : undefined,
      validUntil: form.validUntil || undefined,
      isDraft: asDraft,
      notes: form.notes.trim() || undefined,
    };
  };

  const handleSubmit = async (asDraft: boolean) => {
    // V4 2.4: delivery address is "always a must" (Yamin's call wording),
    // but soft-required so a phone-call quote can still be captured before
    // the address is known. Confirm before save when missing — drafts skip
    // the confirm because they're explicitly for half-finished quotes.
    if (!asDraft && !form.deliveryAddress.trim()) {
      const proceed = confirm(
        'No delivery address yet — save anyway?\n\n' +
          "You'll need to add one before this job can run.",
      );
      if (!proceed) return;
    }
    try {
      await createJob.mutateAsync(buildPayload(asDraft) as any);
      toast.success(asDraft ? 'Draft saved' : 'Quote created');
      setForm({ ...initial, validUntil: defaultValidUntil() });
      setNameTouched(false);
      onOpenChange(false);
    } catch (err) {
      toast.error(asDraft ? 'Failed to save draft' : 'Failed to create quote');
      console.error(err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{prefillJob ? 'Rebook customer' : 'New Quote'}</DialogTitle>
          <DialogDescription>
            {prefillJob
              ? `Pre-filled from a previous job for ${prefillJob.customerName}. Adjust anything that has changed and submit.`
              : 'Record a customer enquiry as a quote. Pricing follows the rates set in Settings → Pricing.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-2 max-h-[60vh] overflow-y-auto pr-1">
          <Field
            label="Customer"
            hint="Pick an existing customer to auto-fill, or type a new name to create one. Search by name, company, or phone."
          >
            <CustomerCombobox
              value={searchQuery}
              onChange={handleSearchChange}
              onPick={handlePickCustomer}
              onClearPick={handleClearPick}
              linkedCustomer={linkedCustomer}
            />
            {/* V4 2.1: near-duplicate warning. Click the banner to link to
                the existing customer and avoid creating yet another row. */}
            {dupCandidate && (
              <div className="mt-2 flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50/70 p-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1 text-[12px] leading-snug">
                  <p className="font-semibold text-amber-900">
                    Did you mean{' '}
                    <span className="underline decoration-amber-400">
                      {dupCandidate.companyName ?? dupCandidate.name}
                    </span>
                    ?
                  </p>
                  <p className="text-amber-800 text-[11px]">
                    They're already in your customer book
                    {dupCandidate.totalJobs ? ` · ${dupCandidate.totalJobs} previous booking${dupCandidate.totalJobs === 1 ? '' : 's'}` : ''}.
                    Linking avoids a duplicate row.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handlePickCustomer(dupCandidate)}
                  className="shrink-0 inline-flex items-center h-7 px-2.5 rounded-md bg-amber-600 text-white text-[11px] font-bold hover:bg-amber-700 transition-colors"
                >
                  Use existing
                </button>
              </div>
            )}
            {/* V5 Phase 3: pre-fill from the linked customer's pricing
                preset. Only renders when a customer is linked AND they
                have a non-none billingBasis. */}
            {linkedCustomer && (linkedCustomer.billingBasis ?? 'none') !== 'none' && (
              <button
                type="button"
                onClick={handlePrefillFromCustomer}
                className="mt-2 inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md border border-rebel-accent/40 bg-rebel-accent-surface/60 text-rebel-accent text-[11px] font-bold hover:bg-rebel-accent-surface transition-colors"
                title={`Apply ${linkedCustomer.companyName ?? linkedCustomer.name}'s default pricing`}
              >
                <Sparkles className="w-3 h-3" />
                Pre-fill from {linkedCustomer.companyName ?? linkedCustomer.name}
              </button>
            )}
          </Field>

          <Field
            label="Company name (optional)"
            hint="For business customers — e.g. 'Bayliss Rugs'. Leave blank for individuals."
          >
            <Input
              value={form.customerCompanyName}
              onChange={(e) => update('customerCompanyName', e.target.value)}
              placeholder="Bayliss Rugs"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field
              label={form.customerCompanyName.trim() ? 'Contact person' : 'Customer name'}
              hint={
                form.customerCompanyName.trim()
                  ? 'Who at the company is making the booking. Optional.'
                  : 'Required. For individuals, this is them.'
              }
            >
              <Input
                value={form.customerName}
                onChange={(e) => {
                  setNameTouched(true);
                  update('customerName', e.target.value);
                  // Keep the combobox query mirrored unless the user has
                  // an active link (in which case they'd need to detach).
                  if (!linkedCustomer) setSearchQuery(e.target.value);
                }}
                placeholder={form.customerCompanyName.trim() ? 'Jane Smith (optional)' : 'Jane Smith'}
              />
            </Field>
            <Field label="Phone (optional)">
              <Input
                value={form.customerPhone}
                onChange={(e) => update('customerPhone', e.target.value)}
                placeholder="04xx xxx xxx"
              />
            </Field>
          </div>

          {/* V4 2.8: live identity preview. Catches the "I typed the
              contact in the customer field" pattern at-a-glance — what
              you see here is what the driver shell will show. */}
          {(form.customerCompanyName.trim() || form.customerName.trim()) && (
            <div className="rounded-lg border border-rebel-border/50 bg-muted/40 px-3 py-2 text-[11px] leading-snug">
              <p className="text-[9.5px] uppercase tracking-wider font-bold text-muted-foreground mb-0.5">
                Will save as
              </p>
              <p className="font-semibold text-rebel-text truncate">
                {form.customerCompanyName.trim() || form.customerName.trim() || '—'}
              </p>
              {form.customerCompanyName.trim() && form.customerName.trim() && (
                <p className="text-muted-foreground truncate">
                  Contact: {form.customerName.trim()}
                </p>
              )}
              {form.customerPhone.trim() && (
                <p className="text-muted-foreground truncate">
                  {form.customerPhone.trim()}
                </p>
              )}
            </div>
          )}

          <RepeatCustomerBanner info={repeatInfo} />

          <Field label="Pickup address">
            <AddressAutocomplete
              value={form.pickupAddress}
              onChange={(v) => update('pickupAddress', v)}
              placeholder="Start typing — e.g. 'Footscray'"
            />
          </Field>

          <Field label="Delivery address">
            <AddressAutocomplete
              value={form.deliveryAddress}
              onChange={(v) => update('deliveryAddress', v)}
              placeholder="Start typing — e.g. 'Brunswick'"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Recipient"
              hint="Who is at the delivery address. On trade jobs this is not the customer on the account."
            >
              <Input
                value={form.recipientName}
                onChange={(e) => update('recipientName', e.target.value)}
                placeholder="e.g. Tom Burke"
              />
            </Field>
            <Field label="Recipient phone" hint="What the driver rings on the day.">
              <Input
                value={form.recipientPhone}
                onChange={(e) => update('recipientPhone', e.target.value)}
                placeholder="04xx xxx xxx"
              />
            </Field>
          </div>

          <Field
            label="Job type"
            hint="Standard = regular delivery. White Glove = careful handling / inside placement. Hourly rate = charged by the hour, by truck. Labour = crew time on site, no truck. Storage = warehousing: storage by tier and term, a container unload, or labour work."
          >
            <NativeSelect
              value={form.type}
              onChange={(v) => handleTypeChange(v as JobType)}
              options={['Standard', 'White Glove', 'Hourly rate', 'Labour', 'Storage']}
            />
          </Field>

          {isDelivery && (
            <>
              <Field label="Zone">
                <div
                  className={
                    'rounded-md border px-3 py-2 text-xs ' +
                    (zone === 'Metro'
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                      : zone === 'Regional'
                        ? 'border-border bg-muted text-foreground'
                        : 'border-amber-200 bg-amber-50 text-amber-900')
                  }
                >
                  {zone === null ? (
                    <>
                      No postcode in the delivery address yet — priced as{' '}
                      <span className="font-semibold">Metro</span>, per m³. Add one and the zone
                      settles itself.
                    </>
                  ) : (
                    <>
                      <span className="font-mono font-semibold">{deliveryPostcode}</span>{' '}
                      {zone === 'Metro' ? 'is on' : 'is not on'} the metro list →{' '}
                      <span className="font-semibold">{zone}</span>
                      {zone === 'Metro' ? ', per m³.' : ', at the flat minimum.'}
                    </>
                  )}
                </div>
              </Field>

              {isMetro ? (
                <div className="grid grid-cols-2 gap-3">
                  <Field
                    label="Cubic metres (m³)"
                    hint="Total volume of the items. Multiplied by the metro per-cube rate."
                  >
                    <Input
                      type="text"
                      inputMode="decimal"
                      pattern="[0-9]*\.?[0-9]*"
                      value={form.cubicMetres}
                      onChange={(e) => update('cubicMetres', sanitiseDecimal(e.target.value))}
                      placeholder="e.g. 2"
                    />
                  </Field>
                  <Field label="Item weight (kg)" hint="Optional. Useful for marble tables or unusually heavy items.">
                    <Input
                      type="text"
                      inputMode="decimal"
                      pattern="[0-9]*\.?[0-9]*"
                      value={form.itemWeightKg}
                      onChange={(e) => update('itemWeightKg', sanitiseDecimal(e.target.value))}
                      placeholder="Optional"
                    />
                  </Field>
                </div>
              ) : (
                <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground inline-flex items-start gap-2">
                  <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  Regional jobs use a flat minimum charge of{' '}
                  {rates
                    ? formatAud(form.type === 'White Glove' ? rates.wgRegionalMinimumAud : rates.regionalMinimumAud)
                    : '—'}{' '}
                  ({form.type === 'White Glove' ? 'White Glove rate' : 'Standard rate'}).
                </div>
              )}
            </>
          )}

          {isHouseMove && rates && (
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Hourly rate"
                hint={
                  usingOverride
                    ? 'Custom rate for this customer (overrides default).'
                    : 'Default rate from Settings → Pricing.'
                }
              >
                <Input
                  value={`${formatAud(repeatInfo.overrideHourlyRate ?? rates.hourlyRateAud)} / hr${usingOverride ? ' · custom' : ''}`}
                  readOnly
                  className="bg-muted/40"
                />
              </Field>
              <Field
                label={`Estimated hours (min ${rates.minimumHours})`}
                hint={`Minimum ${rates.minimumHours} hours applies. Quotes for fewer hours are bumped up automatically.`}
              >
                <Input
                  type="text"
                  inputMode="decimal"
                  pattern="[0-9]*\.?[0-9]*"
                  value={form.estimatedHours}
                  onChange={(e) => update('estimatedHours', sanitiseDecimal(e.target.value))}
                  onBlur={() => {
                    const v = parseFloat(form.estimatedHours);
                    if (!isNaN(v) && v < rates.minimumHours) {
                      update('estimatedHours', String(rates.minimumHours));
                      toast.message(`Minimum ${rates.minimumHours} hours applied`);
                    }
                  }}
                />
              </Field>
            </div>
          )}

          {isHouseMove && (
            <Field label="Truck" hint="Which truck runs the job. Each has its own hourly rate.">
              <ToggleGroup
                options={[
                  { value: 'standard', label: 'Standard' },
                  { value: 'large', label: 'Large' },
                ]}
                value={form.truckSize}
                onChange={(v) => update('truckSize', v as TruckSize)}
              />
            </Field>
          )}

          {isWarehousing && (
            <Field
              label="Service"
              hint="Three separate services. Storage and a container unload are never combined on one quote — they are billed apart."
            >
              <ToggleGroup
                options={[
                  { value: 'storage', label: 'Storage' },
                  { value: 'container_unload', label: 'Container unload' },
                  { value: 'labour_work', label: 'Labour work' },
                ]}
                value={form.warehouseService}
                onChange={(v) => update('warehouseService', v as WarehouseService)}
              />
            </Field>
          )}

          {whStoring && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Tier">
                  <ToggleGroup
                    options={[
                      { value: 'Standard', label: 'Standard' },
                      { value: 'High end', label: 'High end' },
                      { value: 'Insurance added', label: 'Insured' },
                    ]}
                    value={form.storageTier}
                    onChange={(v) => update('storageTier', v as StorageTier)}
                  />
                </Field>
                <Field label="Term" hint="Short term adds the uplift on top of the tier rate.">
                  <ToggleGroup
                    options={[
                      { value: 'Long term', label: 'Long term' },
                      { value: 'Short term', label: 'Short term' },
                    ]}
                    value={form.storageTerm}
                    onChange={(v) => update('storageTerm', v as StorageTerm)}
                  />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Cubic metres (m³)" hint="Rounded up to the next whole m³.">
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={form.cubicMetres}
                    onChange={(e) => update('cubicMetres', sanitiseDecimal(e.target.value))}
                    placeholder="e.g. 12"
                  />
                </Field>
                <Field
                  label="Days held"
                  hint={
                    rates
                      ? `First ${rates.storageGraceDays} days are free; the rest rounds up to whole months.`
                      : undefined
                  }
                >
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={form.storageDays}
                    onChange={(e) => update('storageDays', sanitiseDecimal(e.target.value))}
                    placeholder="e.g. 45"
                  />
                </Field>
              </div>
            </>
          )}

          {whContainer && (
            <Field
              label="Container size"
              hint={
                rates
                  ? `Flat per container, whatever the volume. Covers ${rates.containerIncludedHours} h of unload time — beyond that, add labour work as its own job.`
                  : undefined
              }
            >
              <ToggleGroup
                options={[
                  { value: '20 ft', label: '20 ft' },
                  { value: '40 ft', label: '40 ft' },
                ]}
                value={form.containerSize}
                onChange={(v) => update('containerSize', v as '20 ft' | '40 ft')}
              />
            </Field>
          )}

          {(whLabour || extraLabour) && (
            <Field
              label="Work"
              hint="Each carries its own rate, and names itself on the invoice line — so a requested quality check never reads as unload overrun."
            >
              <ToggleGroup
                options={[
                  { value: 'outbound', label: 'Outbound' },
                  { value: 'qc', label: 'Quality check' },
                  { value: 'unload', label: 'Extra unload' },
                ]}
                value={form.whLabourType}
                onChange={(v) => update('whLabourType', v as 'outbound' | 'qc' | 'unload')}
              />
            </Field>
          )}

          {needsCrew && rates && (
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Crew"
                hint={
                  isLabour
                    ? `Minimum ${rates.labourMinLabourers} on a Labour job.`
                    : 'No minimum on warehouse work — one labourer bills one.'
                }
              >
                <Input
                  type="text"
                  inputMode="numeric"
                  value={form.labourers}
                  onChange={(e) => update('labourers', sanitiseDecimal(e.target.value))}
                  placeholder={isLabour ? String(rates.labourMinLabourers) : '1'}
                />
              </Field>
              <Field
                label="Hours"
                hint={
                  isLabour
                    ? `Minimum ${rates.labourMinHours} h, rounded up to the nearest ${rates.billingIncrementHours * 60} min.`
                    : `No minimum. Rounded up to the nearest ${rates.billingIncrementHours * 60} min.`
                }
              >
                <Input
                  type="text"
                  inputMode="decimal"
                  value={form.estimatedHours}
                  onChange={(e) => update('estimatedHours', sanitiseDecimal(e.target.value))}
                  placeholder="e.g. 3"
                />
              </Field>
            </div>
          )}

          {(whStoring || whContainer) && (
            <Field
              label="Pick-up & delivery (hours)"
              hint="Optional. Collection and return at the truck's hourly rate, with no minimum — and the only part of a warehousing job the fuel levy touches."
            >
              <Input
                type="text"
                inputMode="decimal"
                value={form.legsHours}
                onChange={(e) => update('legsHours', sanitiseDecimal(e.target.value))}
                placeholder="Leave blank if we are not collecting"
              />
            </Field>
          )}

          {(isDelivery || isHouseMove || (parseFloat(form.legsHours) || 0) > 0) && rates && (
            <Field
              label="Fuel levy on this quote"
              hint={
                rates.fuelLevyOn
                  ? `The rate book has it on at ${rates.fuelLevyPct}%. Whatever is set here is frozen onto the quote — switching the rate book later will not restate it.`
                  : `The rate book has it off. Add it by hand for a job being carried out now that was quoted in a levy-off month.`
              }
            >
              <ToggleGroup
                options={[
                  { value: 'rate_book', label: 'As quoted' },
                  { value: 'on', label: 'Add' },
                  { value: 'off', label: 'Remove' },
                ]}
                value={form.fuelLevyMode}
                onChange={(v) => update('fuelLevyMode', v as FuelLevyMode)}
              />
            </Field>
          )}

          {(canDispose || canPackage || whStoring || whContainer || form.type === 'White Glove') && (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground font-medium">Extras</Label>
              <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
                {(whStoring || whContainer) && (
                  <label className="flex items-center gap-2 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5 accent-rebel-accent"
                      checked={form.extraLabourOn}
                      onChange={(e) => update('extraLabourOn', e.target.checked)}
                    />
                    Additional labour
                    {whContainer && rates && (
                      <span className="text-muted-foreground">
                        — for time beyond the {rates.containerIncludedHours} h included
                      </span>
                    )}
                  </label>
                )}
                {canDispose && (
                  <>
                    <label className="flex items-center gap-2 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        className="h-3.5 w-3.5 accent-rebel-accent"
                        checked={form.disposalOn}
                        onChange={(e) => update('disposalOn', e.target.checked)}
                      />
                      Rubbish disposal
                    </label>
                    {form.disposalOn && (
                      <div className="pl-5 space-y-2">
                        <ToggleGroup
                          options={[
                            { value: 'van', label: 'Van load' },
                            { value: 'trailer', label: 'Trailer load' },
                            { value: 'larger', label: 'Larger' },
                          ]}
                          value={form.disposalLoad}
                          onChange={(v) => update('disposalLoad', v as DisposalLoad)}
                        />
                        {form.disposalLoad === 'larger' && (
                          <Input
                            type="text"
                            inputMode="decimal"
                            value={form.disposalAmount}
                            onChange={(e) => update('disposalAmount', sanitiseDecimal(e.target.value))}
                            placeholder="Disposal charge, measured at the end of the job"
                          />
                        )}
                      </div>
                    )}
                  </>
                )}
                {canPackage && (
                  <>
                    <label className="flex items-center gap-2 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        className="h-3.5 w-3.5 accent-rebel-accent"
                        checked={form.packagingOn}
                        onChange={(e) => update('packagingOn', e.target.checked)}
                      />
                      Packaging materials
                    </label>
                    {form.packagingOn && (
                      <div className="pl-5">
                        <Input
                          type="text"
                          inputMode="decimal"
                          value={form.packagingAmount}
                          onChange={(e) => update('packagingAmount', sanitiseDecimal(e.target.value))}
                          placeholder="What was supplied — entered at the end of the job"
                        />
                      </div>
                    )}
                  </>
                )}
                {form.type === 'White Glove' && !canDispose && (
                  <p className="text-[11px] text-muted-foreground">
                    Rubbish removal is already in the White Glove rate up to{' '}
                    {rates?.wgDisposalThresholdM3 ?? 10} m³. Past that it can be charged.
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground font-medium">Customer SMS</Label>
            <div className="space-y-1.5 rounded-lg border border-border bg-muted/30 p-3">
              {(
                [
                  { key: 'sendDayPrior', label: 'Day-prior reminder', hint: 'sent the evening before' },
                  { key: 'sendEnRoute', label: 'En-route notice', hint: 'driver still records en-route for dispatch' },
                  { key: 'sendComplete', label: 'Job complete', hint: 'sent after sign-off' },
                ] as const
              ).map((row) => (
                <label key={row.key} className="flex items-start gap-2 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form[row.key]}
                    onChange={(e) => {
                      if (row.key === 'sendComplete') setCompleteTouched(true);
                      update(row.key, e.target.checked);
                    }}
                    className="h-3.5 w-3.5 mt-0.5 rounded border-border"
                  />
                  <span>
                    <span className="font-medium">{row.label}</span>
                    <span className="text-muted-foreground"> — {row.hint}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground font-medium inline-flex items-center gap-1">
                {isHouseMove ? 'Job description' : 'Notes'}
                <span
                  tabIndex={0}
                  role="img"
                  aria-label={
                    isHouseMove
                      ? 'Stairs, easy access, fragile items, lift available, parking instructions… Visible to the driver.'
                      : 'Visible to the driver on their job card. Use for access codes, stairs, fragile items, parking instructions, etc.'
                  }
                  title={
                    isHouseMove
                      ? 'Stairs, easy access, fragile items, lift available, parking instructions… Visible to the driver.'
                      : 'Visible to the driver on their job card. Use for access codes, stairs, fragile items, parking instructions, etc.'
                  }
                  className="inline-flex items-center justify-center text-muted-foreground/70 hover:text-rebel-accent cursor-help"
                >
                  <Info className="w-3 h-3" />
                </span>
              </Label>
              {voice.supported && (
                <button
                  type="button"
                  onClick={() => (voice.listening ? voice.stop() : voice.start())}
                  className={`inline-flex items-center gap-1 px-2 h-6 rounded-md text-[10px] font-semibold transition-colors ${
                    voice.listening
                      ? 'bg-red-500 text-white'
                      : 'bg-rebel-accent-surface text-rebel-accent hover:bg-rebel-accent hover:text-white'
                  }`}
                  aria-label={voice.listening ? 'Stop listening' : 'Dictate'}
                >
                  {voice.listening ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
                  {voice.listening ? 'Stop' : 'Dictate'}
                </button>
              )}
            </div>
            <textarea
              value={form.notes}
              onChange={(e) => update('notes', e.target.value)}
              placeholder={
                isHouseMove
                  ? 'e.g. 3-bedroom apartment, second floor, lift available, two flights of stairs at delivery…'
                  : 'Access, stairs, special handling…'
              }
              rows={isHouseMove ? 3 : 2}
              className="w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
            {voice.listening && (
              <p className="text-[10px] text-red-600 font-semibold inline-flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                Listening…
              </p>
            )}
          </div>

          <Field label="Quote valid until" hint="Defaults to 30 days from today. Adjust if a shorter window applies.">
            <Input
              type="date"
              value={form.validUntil}
              onChange={(e) => update('validUntil', e.target.value)}
            />
          </Field>

          {breakdown && (
            <div className="rounded-lg bg-muted p-3 text-xs space-y-1">
              {breakdown.lines.map((line, i) => (
                <div key={i} className="flex justify-between gap-3">
                  <span className="text-muted-foreground">
                    {line.label}
                    <span className="block text-[10px] opacity-75">{line.note}</span>
                  </span>
                  <span className="font-semibold shrink-0">{formatAud(line.amount)}</span>
                </div>
              ))}
              {breakdown.levy > 0 && (
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">
                    Fuel levy
                    <span className="block text-[10px] opacity-75">{breakdown.levyNote}</span>
                  </span>
                  <span className="font-semibold shrink-0">{formatAud(breakdown.levy)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  GST ({rates?.gstPercent ?? 10}%)
                </span>
                <span className="font-semibold">{formatAud(breakdown.gst)}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-border">
                <span className="font-semibold">Total inc. GST</span>
                <span className="font-bold text-base">{formatAud(breakdown.total)}</span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-wrap gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="outline"
            disabled={!canSaveDraft}
            onClick={() => handleSubmit(true)}
          >
            Save as draft
          </Button>
          <Button
            className="bg-rebel-accent hover:bg-rebel-accent-hover text-white"
            disabled={!canSubmit}
            onClick={() => handleSubmit(false)}
          >
            {createJob.isPending ? 'Creating…' : 'Create quote'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground font-medium inline-flex items-center gap-1">
        {label}
        {hint && (
          <span
            tabIndex={0}
            role="img"
            aria-label={hint}
            title={hint}
            className="inline-flex items-center justify-center text-muted-foreground/70 hover:text-rebel-accent cursor-help"
          >
            <Info className="w-3 h-3" />
          </span>
        )}
      </Label>
      {children}
    </div>
  );
}

function RepeatCustomerBanner({ info }: { info: RepeatCustomerInfo }) {
  if (!info.found) return null;
  const name = info.customerName ?? 'there';
  const count = info.jobCount ?? 0;
  const hasOverride = info.overrideMetroRate != null || info.overrideHourlyRate != null;
  return (
    <div className="rounded-lg bg-rebel-accent-surface border border-rebel-accent/30 p-2.5 flex items-start gap-2">
      <div className="w-7 h-7 rounded-full bg-rebel-accent-surface flex items-center justify-center shrink-0">
        <Sparkles className="w-3.5 h-3.5 text-rebel-accent" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-rebel-accent">Repeat customer — {name}</p>
        <p className="text-[10px] text-rebel-accent mt-0.5">
          {count} previous booking{count === 1 ? '' : 's'}
          {info.lastJobDate ? ` · last job ${info.lastJobDate}` : ''}
          {info.lastPickup ? ` · usual pickup: ${info.lastPickup}` : ''}
        </p>
        {hasOverride && (
          <p className="text-[10px] text-rebel-accent mt-0.5 font-semibold">
            Custom rate applies
            {info.overrideMetroRate != null ? ` · metro ${formatAud(info.overrideMetroRate)}/m³` : ''}
            {info.overrideHourlyRate != null ? ` · hourly ${formatAud(info.overrideHourlyRate)}` : ''}
          </p>
        )}
      </div>
    </div>
  );
}

type SelectOption = string | { value: string; label: string };

function NativeSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      {options.map((opt) => {
        const v = typeof opt === 'string' ? opt : opt.value;
        const l = typeof opt === 'string' ? opt : opt.label;
        return (
          <option key={v} value={v}>
            {l}
          </option>
        );
      })}
    </select>
  );
}

function ToggleGroup({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex gap-2">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`flex-1 h-9 rounded-lg border text-xs font-semibold transition-colors ${
              active
                ? 'bg-rebel-accent border-rebel-accent text-white'
                : 'bg-card border-input text-muted-foreground hover:bg-muted'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
