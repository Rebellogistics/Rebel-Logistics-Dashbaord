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
import { useCreateJob, useJobs } from '@/hooks/useSupabaseData';
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
import { Sparkles, Info, Mic, MicOff, AlertTriangle, Plus } from 'lucide-react';

interface NewQuoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefillJob?: Job | null;
  /** V5 P5: when set, the dialog opens seeded as a load-OUT delivery
   *  for a storage record (customer + items pre-filled, pickup defaults
   *  to the warehouse address line in notes). */
  prefillStorage?: StorageRecord | null;
  /** Opened from a container unload to book what is coming out of it. */
  prefillContainerId?: string | null;
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
/**
 * A delivery to be booked out of a container, as typed into the quote form.
 *
 * Deliberately the minimum a real job needs: what it is, where it goes, and
 * the one figure that prices it. Everything else — date, truck, recipient —
 * is filled in on the job afterwards, the same as any quote taken over the
 * phone.
 */
interface OutboundDraft {
  type: JobType;
  deliveryAddress: string;
  cubicMetres: string;
  estimatedHours: string;
  storageTier: StorageTier;
  storageTerm: StorageTerm;
  storageDays: string;
}

const emptyOutbound = (): OutboundDraft => ({
  type: 'Standard',
  deliveryAddress: '',
  cubicMetres: '',
  estimatedHours: '',
  storageTier: 'Standard',
  storageTerm: 'Long term',
  storageDays: '',
});

const completeDefaultFor = (type: JobType) => type === 'Standard' || type === 'White Glove';

function formFromJob(job: Job): typeof initial {
  return {
    ...initial,
    // Pre-Phase-20 jobs kept the company in its own column. It is the
    // client's identity, so it becomes the customer name on a rebook.
    customerName: (job.customerCompanyName ?? '').trim() || (job.customerName ?? ''),
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

  // The container this delivery is coming out of, when it is. Groups it onto
  // one invoice with the container's other deliveries; the unload itself
  // always invoices separately.
  containerJobId: '',

  // Deliveries to book out of this container at the same time. Each becomes
  // a real job on save, created against the container's id once it exists.
  // Empty is the normal case — a container is often unloaded and invoiced
  // well before the client says where anything is going.
  outbound: [] as OutboundDraft[],

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
  prefillContainerId,
}: NewQuoteDialogProps) {
  const [form, setForm] = useState(initial);
  const { data: metroList } = useMetroPostcodes();

  // Opened from a container: start already linked to it, so booking what came
  // out of an unload does not mean finding it again in a dropdown.
  useEffect(() => {
    if (open && prefillContainerId) {
      setForm((prev) => ({ ...prev, containerJobId: prefillContainerId }));
    }
  }, [open, prefillContainerId]);
  const { data: allJobs = [] } = useJobs();

  // Containers something can be booked out of. Not limited to recent ones: a
  // container is often unloaded and invoiced well before the client says
  // where its contents are going.
  const availableContainers = useMemo(
    () =>
      allJobs.filter(
        (j) => j.type === 'Storage' && j.warehouseService === 'container_unload' && !j.deletedAt,
      ),
    [allJobs],
  );
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
      setSearchQuery(next.customerName);
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
    // The customer IS the client — a company name where they trade as one,
    // their own name where they don't. There is no second identity field:
    // the person receiving the goods is the Recipient, and the site the work
    // happens at is the address.
    const identity = (c.companyName ?? '').trim() || c.name;
    setSearchQuery(identity);
    const isB2B = !!(c.companyName?.trim());
    setForm((prev) => ({
      ...prev,
      customerId: c.id,
      customerName: identity,
      // Their own number, which doesn't change between bookings.
      customerPhone: c.phone ?? '',
      // Pickup does change every booking on a trade account.
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
    setForm((prev) => ({ ...prev, customerName: next }));
  };

  useEffect(() => {
    if (repeatInfo.found && repeatInfo.customerName && !nameTouched && !form.customerName) {
      setForm((prev) => ({
        ...prev,
        customerName: repeatInfo.customerName!,
        pickupAddress: prev.pickupAddress || repeatInfo.lastPickup || '',
      }));
    }
  }, [repeatInfo, nameTouched, form.customerName]);

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

  // V7: the postcodes decide the zone, and nothing else does. The old
  // Metro/Regional toggle is gone — the list in Settings → Pricing is the
  // only place a suburb moves between bands.
  //
  // Both ends count. A run is regional if EITHER end is regional: Geelong to
  // the CBD is regional, and so is Heidelberg to Geelong (Yamin, 2026-09-22).
  //
  // A BLANK pickup is not an unknown one. It means the goods are already with
  // us and the run loads out of our own warehouse — the items were collected
  // on an earlier day, or came out of a container. Our warehouse is metro and
  // always will be: "we will never move regional" (Yamin, 2026-09-22). So a
  // load-out is priced by the delivery address on its own. A settled rule,
  // not an assumption to re-derive.
  //
  // A pickup that was TYPED but carries no postcode — "Hallam", "Geelong" —
  // is the genuinely unknown case. It gets no vote, and the readout says so,
  // because silently treating it as metro is how a Geelong collection gets
  // charged at metro rates.
  const deliveryPostcode = extractPostcode(form.deliveryAddress);
  const pickupPostcode = extractPostcode(form.pickupAddress);
  const loadingFromOurWarehouse = form.pickupAddress.trim() === '';
  const pickupUnreadable = !loadingFromOurWarehouse && pickupPostcode === null;
  const deliveryZone: JobLocation | null =
    deliveryPostcode === null ? null : locationForPostcode(deliveryPostcode, metroList);
  const pickupZone: JobLocation | null =
    pickupPostcode === null ? null : locationForPostcode(pickupPostcode, metroList);
  const zone: JobLocation | null =
    deliveryZone === 'Regional' || pickupZone === 'Regional'
      ? 'Regional'
      : (deliveryZone ?? pickupZone);

  const breakdown = useMemo(() => {
    if (!rates) return null;
    return priceJob({
      type: form.type,
      rates,
      postcode: deliveryPostcode,
      pickupPostcode,
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
  }, [form, rates, repeatInfo, deliveryPostcode, pickupPostcode, metroList]);

  /** Price one outbound row on its own terms, as its own job would be. */
  const priceOutbound = (o: OutboundDraft) =>
    rates
      ? priceJob({
          type: o.type,
          rates,
          postcode: extractPostcode(o.deliveryAddress),
          metroPostcodes: metroList,
          cubicMetres: parseFloat(o.cubicMetres) || 0,
          estimatedHours: parseFloat(o.estimatedHours) || 0,
          warehouseService: o.type === 'Storage' ? 'storage' : undefined,
          storageTier: o.storageTier,
          storageTerm: o.storageTerm,
          storageDays: parseFloat(o.storageDays) || 0,
          fuelLevyMode: form.fuelLevyMode,
        })
      : null;

  const setOutbound = (i: number, patch: Partial<OutboundDraft>) =>
    setForm((prev) => ({
      ...prev,
      outbound: prev.outbound.map((o, n) => (n === i ? { ...o, ...patch } : o)),
    }));

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
  const baseValid = !!form.customerName.trim();

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
      containerJobId: !isWarehousing && form.containerJobId ? form.containerJobId : undefined,
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
      // The container has to exist before anything can point at it, so it is
      // created first and its id used for the rest.
      const created = await createJob.mutateAsync(buildPayload(asDraft) as any);

      const rows = whContainer ? form.outbound : [];
      const containerId = (created as { id?: string } | undefined)?.id;
      let booked = 0;
      const failed: string[] = [];

      if (rows.length && containerId) {
        for (const [i, o] of rows.entries()) {
          const q = priceOutbound(o);
          if (!q) continue;
          const isStorage = o.type === 'Storage';
          const isHourly = o.type === 'Hourly rate';
          const zone = isStorage
            ? null
            : (() => {
                const pc = extractPostcode(o.deliveryAddress);
                return pc === null ? null : locationForPostcode(pc, metroList);
              })();
          try {
            await createJob.mutateAsync({
              id: `RL-${Date.now().toString(36).toUpperCase()}-${i}`,
              // The deliveries are for the container's customer; who receives
              // each one is filled in on the job afterwards.
              customerId: form.customerId || undefined,
              customerName: form.customerName.trim(),
              customerPhone: form.customerPhone.trim() || undefined,
              pickupAddress: form.pickupAddress.trim(),
              deliveryAddress: o.deliveryAddress.trim(),
              type: o.type,
              status: 'Quote' as const,
              date: format(new Date(), 'yyyy-MM-dd'),
              containerJobId: containerId,
              fee: q.chargeable,
              fuelLevy: q.levy,
              fuelLevyPctApplied: q.levyPct,
              fuelLevyMode: form.fuelLevyMode,
              gstAmount: q.gst,
              location: zone ?? undefined,
              cubicMetres: isHourly ? undefined : parseFloat(o.cubicMetres) || undefined,
              hoursEstimated: isHourly ? parseFloat(o.estimatedHours) || 0 : undefined,
              warehouseService: isStorage ? ('storage' as const) : undefined,
              storageTier: isStorage ? o.storageTier : undefined,
              storageTerm: isStorage ? o.storageTerm : undefined,
              storageDays: isStorage ? parseFloat(o.storageDays) || 0 : undefined,
              pricingType: isHourly ? ('hourly' as const) : ('fixed' as const),
              isDraft: asDraft,
              // The usual new-quote defaults, per job type — same as any
              // quote raised by hand (Yamin, 2026-09-18).
              sendDayPrior: false,
              sendEnRoute: false,
              sendComplete: completeDefaultFor(o.type),
            } as any);
            booked += 1;
          } catch (rowErr) {
            // The container is already saved. Report which rows did not make
            // it rather than failing the whole thing and losing the unload.
            failed.push(`${o.type}${o.deliveryAddress ? ` to ${o.deliveryAddress}` : ''}`);
            console.error(rowErr);
          }
        }
      }

      if (failed.length) {
        toast.error(
          `Container saved${booked ? ` with ${booked} job${booked === 1 ? '' : 's'}` : ''}, but ` +
            `${failed.length} could not be created: ${failed.join(', ')}. Add them from the container.`,
        );
      } else {
        toast.success(
          asDraft
            ? 'Draft saved'
            : booked
              ? `Quote created, with ${booked} job${booked === 1 ? '' : 's'} out of the container`
              : 'Quote created',
        );
      }

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
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{prefillJob ? 'Rebook customer' : 'New Quote'}</DialogTitle>
          <DialogDescription>
            {prefillJob
              ? `Pre-filled from a previous job for ${prefillJob.customerName}. Adjust anything that has changed and submit.`
              : 'Record a customer enquiry as a quote. Pricing follows the rates set in Settings → Pricing.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 py-2 max-h-[52vh] overflow-y-auto pr-1">
          <Section label="Customer" />

            <Field
              className="sm:col-span-2"
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
            label="Customer phone (optional)"
            hint="The client's own number. Where the job has a recipient, the driver rings the recipient instead."
          >
            <Input
              value={form.customerPhone}
              onChange={(e) => update('customerPhone', e.target.value)}
              placeholder="04xx xxx xxx"
            />
          </Field>

          <div className="sm:col-span-2">
            <RepeatCustomerBanner info={repeatInfo} />
          </div>

          <Section label="Addresses & recipient" />

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

          <div className="grid grid-cols-2 gap-3 sm:col-span-2">
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

          <Section label="Job & pricing" />

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

          {!isWarehousing && (
            <Field
              className="sm:col-span-2"
              label="Out of a container"
              hint={
                availableContainers.length
                  ? "Groups this job onto one invoice with the container's other deliveries. The unload itself always invoices on its own."
                  : 'Nothing to link to yet — this fills up once a container unload has been booked. Quote one under Storage → Container unload.'
              }
            >
              <select
                value={form.containerJobId}
                onChange={(e) => update('containerJobId', e.target.value)}
                disabled={!availableContainers.length}
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm disabled:opacity-60"
              >
                <option value="">
                  {availableContainers.length
                    ? 'Not out of a container'
                    : 'No container unloads recorded yet'}
                </option>
                {availableContainers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.containerSize ?? 'Container'} · {c.customerName}
                    {c.date ? ` · ${c.date}` : ''}
                    {c.quoteNumber ? ` · ${c.quoteNumber}` : ''}
                  </option>
                ))}
              </select>
            </Field>
          )}

          {isDelivery && (
            <>
              <Field label="Zone" className="sm:col-span-2">
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
                      No postcode at either end yet — priced as{' '}
                      <span className="font-semibold">Metro</span>, per m³. Add one and the zone
                      settles itself.
                    </>
                  ) : (
                    <>
                      {loadingFromOurWarehouse ? (
                        <>Loading from our warehouse · </>
                      ) : (
                        pickupZone && (
                          <>
                            Pickup{' '}
                            <span className="font-mono font-semibold">{pickupPostcode}</span> is{' '}
                            {pickupZone === 'Metro' ? 'metro' : 'regional'} ·{' '}
                          </>
                        )
                      )}
                      {deliveryZone ? (
                        <>
                          Delivery{' '}
                          <span className="font-mono font-semibold">{deliveryPostcode}</span> is{' '}
                          {deliveryZone === 'Metro' ? 'metro' : 'regional'}
                        </>
                      ) : (
                        <>No postcode in the delivery address</>
                      )}{' '}
                      → <span className="font-semibold">{zone}</span>
                      {zone === 'Metro' ? ', per m³.' : ', at the flat minimum.'}
                      {zone === 'Metro' && pickupUnreadable && (
                        <span className="block opacity-80">
                          No postcode in “{form.pickupAddress.trim()}”, so the pickup isn't
                          voting. Pick it from the dropdown — a regional collection makes the
                          job regional.
                        </span>
                      )}
                    </>
                  )}
                </div>
              </Field>

              {isMetro ? (
                <div className="grid grid-cols-2 gap-3 sm:col-span-2">
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
                <div className="sm:col-span-2 rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground inline-flex items-start gap-2">
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
            <div className="grid grid-cols-2 gap-3 sm:col-span-2">
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
              className="sm:col-span-2"
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
              <div className="grid grid-cols-2 gap-3 sm:col-span-2">
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
              <div className="grid grid-cols-2 gap-3 sm:col-span-2">
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
            <div className="grid grid-cols-2 gap-3 sm:col-span-2">
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

          {whContainer && (
            <div className="space-y-1 sm:col-span-2">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-xs text-muted-foreground font-medium">
                  Out of this container — delivered, or held
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setForm((prev) => ({ ...prev, outbound: [...prev.outbound, emptyOutbound()] }))
                  }
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Add a job
                </Button>
              </div>

              {form.outbound.length === 0 ? (
                <p className="text-[11px] text-muted-foreground rounded-lg border border-border bg-muted/30 p-3">
                  Nothing booked out yet — the unload stands alone and invoices on its own. Add jobs
                  here if the deliveries are already confirmed, or link them later from the
                  container once the client says where things are going.
                </p>
              ) : (
                <div className="space-y-2">
                  {form.outbound.map((o, i) => {
                    const q = priceOutbound(o);
                    return (
                      <div key={i} className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <ToggleGroup
                            options={[
                              { value: 'Standard', label: 'Standard' },
                              { value: 'White Glove', label: 'White Glove' },
                              { value: 'Hourly rate', label: 'Hourly' },
                              { value: 'Storage', label: 'Storage' },
                            ]}
                            value={o.type}
                            onChange={(v) => setOutbound(i, { type: v as JobType })}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setForm((prev) => ({
                                ...prev,
                                outbound: prev.outbound.filter((_, n) => n !== i),
                              }))
                            }
                          >
                            Remove
                          </Button>
                        </div>

                        {o.type !== 'Storage' && (
                          <AddressAutocomplete
                            value={o.deliveryAddress}
                            onChange={(v) => setOutbound(i, { deliveryAddress: v })}
                            placeholder="Where this one is going"
                          />
                        )}

                        <div className="flex gap-2 flex-wrap">
                          {o.type === 'Hourly rate' ? (
                            <Input
                              type="text"
                              inputMode="decimal"
                              value={o.estimatedHours}
                              onChange={(e) =>
                                setOutbound(i, { estimatedHours: sanitiseDecimal(e.target.value) })
                              }
                              placeholder="Hours"
                              className="w-28 h-9"
                            />
                          ) : (
                            <Input
                              type="text"
                              inputMode="decimal"
                              value={o.cubicMetres}
                              onChange={(e) =>
                                setOutbound(i, { cubicMetres: sanitiseDecimal(e.target.value) })
                              }
                              placeholder="m³"
                              className="w-24 h-9"
                            />
                          )}
                          {o.type === 'Storage' && (
                            <>
                              <select
                                value={o.storageTier}
                                onChange={(e) =>
                                  setOutbound(i, { storageTier: e.target.value as StorageTier })
                                }
                                className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                              >
                                <option>Standard</option>
                                <option>High end</option>
                                <option>Insurance added</option>
                              </select>
                              <select
                                value={o.storageTerm}
                                onChange={(e) =>
                                  setOutbound(i, { storageTerm: e.target.value as StorageTerm })
                                }
                                className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                              >
                                <option>Long term</option>
                                <option>Short term</option>
                              </select>
                              <Input
                                type="text"
                                inputMode="numeric"
                                value={o.storageDays}
                                onChange={(e) =>
                                  setOutbound(i, { storageDays: sanitiseDecimal(e.target.value) })
                                }
                                placeholder="Days"
                                className="w-24 h-9"
                              />
                            </>
                          )}
                        </div>

                        {q && (
                          <div className="flex items-baseline justify-between gap-2 border-t border-border pt-2">
                            <span className="text-[10px] text-muted-foreground">
                              {q.lines.map((l) => l.note).join(' · ')} — ex GST
                            </span>
                            <span className="text-xs font-semibold tabular-nums">
                              {formatAud(q.chargeable)}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <p className="text-[10px] text-muted-foreground">
                    Each becomes its own job, created against this container. Deliveries invoice
                    together; anything held invoices as storage. Dates, trucks and recipients are
                    filled in on each job afterwards.
                  </p>
                </div>
              )}
            </div>
          )}

          {(canDispose || canPackage || whStoring || whContainer || form.type === 'White Glove') && (
            <div className="space-y-1 sm:col-span-2">
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

          <Section label="Notes & admin" />

          <div className="space-y-1 sm:col-span-2">
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

          <Field label="Quote valid until" hint="Defaults to 30 days from today. Adjust if a shorter window applies.">
            <Input
              type="date"
              value={form.validUntil}
              onChange={(e) => update('validUntil', e.target.value)}
            />
          </Field>

        </div>

        {/* The price sits OUTSIDE the scrolling form, between it and the
            buttons, so it stays in view while the form is filled in. It used
            to be the last thing in the scroll area, which meant that on a
            longer quote — storage, or a container with extras — the total was
            below the fold exactly when it mattered most (Yamin, 2026-09-17).

            The lines scroll within their own box when a quote has many of
            them; the total never does. */}
        {breakdown && (
          <div className="rounded-lg bg-muted px-3 py-2 text-xs shrink-0">
            <div className="max-h-[16vh] overflow-y-auto space-y-1 pr-1">
              {breakdown.lines.map((line, i) => (
                <div key={i} className="flex justify-between gap-3">
                  <span className="text-muted-foreground">
                    {line.label}
                    <span className="block text-[10px] opacity-75">{line.note}</span>
                  </span>
                  <span className="font-semibold shrink-0 tabular-nums">
                    {formatAud(line.amount)}
                  </span>
                </div>
              ))}
              {breakdown.levy > 0 && (
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">
                    Fuel levy
                    <span className="block text-[10px] opacity-75">{breakdown.levyNote}</span>
                  </span>
                  <span className="font-semibold shrink-0 tabular-nums">
                    {formatAud(breakdown.levy)}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">GST ({rates?.gstPercent ?? 10}%)</span>
                <span className="font-semibold tabular-nums">{formatAud(breakdown.gst)}</span>
              </div>
            </div>
            <div className="flex justify-between items-baseline pt-1.5 mt-1.5 border-t border-border">
              <span className="font-semibold">Total inc. GST</span>
              <span className="font-bold text-base tabular-nums">
                {formatAud(breakdown.total)}
              </span>
            </div>
          </div>
        )}

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

// A hairline rule with a caption. The quote form runs to twenty-odd
// controls; without these the two columns read as one undifferentiated
// wall of inputs.
function Section({ label }: { label: string }) {
  return (
    <div className="sm:col-span-2 flex items-center gap-2 pt-1">
      <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground shrink-0">
        {label}
      </span>
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}

function Field({ label, children, hint, className }: { label: string; children: ReactNode; hint?: string; className?: string }) {
  return (
    <div className={'space-y-1' + (className ? ' ' + className : '')}>
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
