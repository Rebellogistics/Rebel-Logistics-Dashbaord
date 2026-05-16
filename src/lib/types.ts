export type JobType = 'Standard' | 'White Glove' | 'House Move';
export type JobStatus =
  | 'Quote'
  | 'Accepted'
  | 'Scheduled'
  | 'Notified'
  | 'In Delivery'
  | 'Completed'
  | 'Invoiced'
  | 'Declined';
export type JobLocation = 'Metro' | 'Regional';
export type TruckId = string;

export interface PricingRates {
  /** Standard delivery — per-cubic-metre rate for metro jobs. */
  metroPerCubeAud: number;
  /** Standard delivery — flat minimum for regional jobs. */
  regionalMinimumAud: number;
  /** White Glove — per-cubic-metre rate for metro jobs (separate from Standard). */
  wgMetroPerCubeAud: number;
  /** White Glove — flat minimum for regional jobs (separate from Standard). */
  wgRegionalMinimumAud: number;
  /** House Move — hourly rate. Same for both Standard and White Glove handling
   *  styles since House Move is its own job type. */
  hourlyRateAud: number;
  minimumHours: number;
  gstPercent: number;
  updatedAt?: string;
}

export interface Truck {
  id: string;
  name: string;
  description?: string;
  active: boolean;
  createdAt: string;
  /** Phase 11: optional auth.users account for the tablet login. NULL means
   *  the truck has no login yet — Yamin can generate one from Settings. */
  userId?: string | null;
  /** Phase 17 soft-delete (see Job.deletedAt). */
  deletedAt?: string | null;
}

/**
 * Phase 11: drivers are name+phone only — they don't authenticate. They're
 * picked from a dropdown when a shift starts on a truck portal. The id space
 * intentionally overlaps with auth.users for backfilled rows so existing
 * truck_shifts.driver_user_id references continue to resolve.
 */
export interface Driver {
  id: string;
  name: string;
  phone?: string | null;
  active: boolean;
  createdAt: string;
  createdBy?: string | null;
  /** Phase 17 soft-delete (see Job.deletedAt). Distinct from `active` — a
   *  driver can be active=true but soft-deleted (in Trash), or active=false
   *  but not deleted (on leave / paused). The picker filters both. */
  deletedAt?: string | null;
}

export interface JobPhoto {
  id: string;
  jobId: string;
  storagePath: string;
  caption?: string;
  uploadedBy?: string;
  createdAt: string;
}
export type TimeRange = '1d' | '7d' | '30d';
export type PricingType = 'fixed' | 'hourly';
export type SmsType =
  | 'day_prior'
  | 'en_route'
  | 'auto_reply'
  /** V5 Phase 4: Google review request, manually fired from a completed job. */
  | 'review_request'
  | 'other';
export type SmsStatus = 'sent' | 'failed' | 'pending';
/** V4 Phase 3.2: outbound = we sent it, inbound = customer texted us. */
export type SmsDirection = 'outbound' | 'inbound';
export type UserRole = 'owner' | 'driver' | 'truck' | 'dispatcher' | 'admin' | 'pending';

export interface Profile {
  userId: string;
  role: UserRole;
  fullName?: string;
  email?: string;
  phone?: string;
  assignedTruck?: string;
  active: boolean;
  createdAt: string;
}

export type CustomerType = 'individual' | 'company';
export type CustomerSource =
  | 'phone'
  | 'website'
  | 'referral'
  | 'google'
  | 'facebook'
  | 'airtasker'
  | 'gumtree'
  | 'b2b'
  | 'other';

export interface Job {
  id: string;
  /** Contact person, or — for individual customers — the customer themselves.
   *  When a company name is set, this is the contact-person sub-line. */
  customerName: string;
  /** Phase 16: business / company name. NULL for individuals. When present,
   *  this is the primary identity displayed on the quote; customerName is
   *  shown as the secondary contact-person line. */
  customerCompanyName?: string | null;
  /** Phone is optional from Phase 14 onwards — Yamin's "name only" rule. */
  customerPhone?: string | null;
  pickupAddress: string;
  deliveryAddress: string;
  type: JobType;
  status: JobStatus;
  date: string;
  assignedTruck?: TruckId;
  notes?: string;
  proofPhoto?: string;
  signature?: string;
  fee: number;
  fuelLevy: number;
  itemWeightKg?: number;
  itemDimensions?: string;
  distanceKm?: number;
  pricingType?: PricingType;
  hourlyRate?: number;
  hoursEstimated?: number;
  declineReason?: string;
  dayPriorSmsSentAt?: string;
  enRouteSmsSentAt?: string;
  customerId?: string;
  recipientName?: string;
  recipientPhone?: string;
  recipientAddress?: string;
  /** Xero draft/finalised invoice id once this job has been billed. Phase 12. */
  xeroInvoiceId?: string;
  /** Metro/Regional split for Standard + White Glove jobs. */
  location?: JobLocation;
  /** Volume in m³ for Standard / White Glove jobs. */
  cubicMetres?: number;
  /** Auto-assigned RL-YYYY-NNNN reference. */
  quoteNumber?: string;
  /** Quote expiry date (defaulted to +30 days on create). */
  validUntil?: string;
  /** True until the owner finishes filling the quote out. */
  isDraft?: boolean;
  /** GST amount snapshotted at quote-create time. */
  gstAmount?: number;
  /** Phase 21: timestamp of the auto-fired delivery-complete SMS. */
  completionSmsSentAt?: string;
  /** V5 Phase 1: per-job customer-SMS opt-out toggles. ON = template fires
   *  normally. OFF = customer text is skipped, but dispatch signals
   *  (status flips, calendar, truck-run visibility) always still fire.
   *  All default true so existing jobs behave as before. */
  sendDayPrior?: boolean;
  sendEnRoute?: boolean;
  sendComplete?: boolean;
  /** TRUE when the fee was set manually in the job dialog (Phase 10). When
   *  false, the fee is whatever the rate book + inputs (type / cubes /
   *  hours) computed at save time. Used to gate the recompute prompt: if
   *  the user has a manual price, type changes don't silently overwrite. */
  priceIsManual?: boolean;
  /** Driver attribution at completion time — frozen so it survives if the
   *  driver record is later deleted. */
  completedByDriverId?: string;
  completedByDriverName?: string;
  completedAt?: string;
  /** Google Calendar event id once this job has been pushed to a calendar. */
  googleCalendarEventId?: string;
  /** Phase 14 soft-delete: ISO timestamp set when the job is moved to Trash;
   *  null/undefined for active rows. Main queries filter to active. */
  deletedAt?: string | null;
  /** V4 Phase 1.1: position within the truck-day run order (0 = first stop).
   *  NULL on rows created before V4 — fall back to createdAt for sort. */
  sequence?: number | null;
  createdAt: string;
}

/** V4 Phase 5: per-truck-per-day checklist items. Warehouse load-ups,
 *  truck cleans, fuel stops — anything Yamin wants the driver to do
 *  before/between paid jobs. Distinct from `Job`: no customer, no money,
 *  no proof flow. Driver taps to mark done. */
export type TaskKind = 'load_up' | 'clean' | 'fuel' | 'other';

export interface Task {
  id: string;
  truckName: string;
  scheduledDate: string;
  kind: TaskKind;
  title: string;
  description?: string | null;
  sequence?: number | null;
  /** Frozen at completion time (V3 Phase 3 attribution pattern). */
  completedByDriverId?: string | null;
  completedByDriverName?: string | null;
  completedAt?: string | null;
  createdBy?: string | null;
  createdAt: string;
  deletedAt?: string | null;
}

export interface TruckShift {
  id: string;
  truckName: string;
  driverUserId?: string;
  driverName: string;
  shiftDate: string;
  startedAt: string;
  endedAt: string;
  jobCount: number;
  createdAt: string;
}

export interface SmsLogEntry {
  id: string;
  jobId: string | null;
  type: SmsType;
  recipientName: string;
  recipientPhone: string;
  messageBody: string;
  status: SmsStatus;
  sentAt: string;
  errorMessage: string | null;
  createdAt: string;
  /** V4 Phase 3.2 — defaults to 'outbound' on rows from before the migration. */
  direction?: SmsDirection;
  /** Twilio Message SID for outbound rows. Used to thread inbound replies. */
  providerMessageId?: string | null;
  /** For inbound rows, the providerMessageId of the most recent outbound to
   *  the same phone — i.e. which outbound thread this reply belongs to. */
  parentMessageSid?: string | null;
  /** Best-effort customer match for inbound rows. Nullable. */
  customerId?: string | null;
  /** Timestamp the operator read this inbound. NULL = unread. */
  readAt?: string | null;
}

/** V5 Phase 3: how a customer is normally billed. Drives the "Pre-fill
 *  from {Customer}" button on the new-job dialog. */
export type BillingBasis = 'hourly' | 'flat' | 'per_item' | 'none';

export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  type: CustomerType;
  companyName?: string;
  abn?: string;
  source?: string;
  notes?: string;
  vip: boolean;
  totalJobs: number;
  totalSpent: number;
  lastJobDate?: string;
  avatar?: string;
  /** Optional per-customer overrides applied in place of the default rate book. */
  overrideMetroRate?: number;
  overrideHourlyRate?: number;
  /** V5 Phase 3: pricing preset. When billingBasis !== 'none', the
   *  new-job dialog surfaces a one-click pre-fill that populates
   *  service + fee/hourly-rate + notes from these fields. */
  billingBasis?: BillingBasis;
  defaultService?: string;
  defaultRate?: number;
  defaultNotes?: string;
  /** Tag stamped during a bulk import — e.g. "xero-2026-04-28". */
  importBatch?: string;
  /** Phase 14 soft-delete (see Job.deletedAt). */
  deletedAt?: string | null;
  createdAt?: string;
}

export interface Message {
  id: string;
  sender: string;
  content: string;
  timestamp: string;
  unread: boolean;
  avatar: string;
}

export interface KPIStats {
  totalJobs: number;
  onGoing: number;
  shipped: number;
  completed: number;
  notificationsSent: number;
  revenue: number;
}
