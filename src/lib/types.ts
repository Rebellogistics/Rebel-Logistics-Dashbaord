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
  metroPerCubeAud: number;
  regionalMinimumAud: number;
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
export type SmsType = 'day_prior' | 'en_route' | 'other';
export type SmsStatus = 'sent' | 'failed' | 'pending';
export type UserRole = 'owner' | 'driver' | 'dispatcher' | 'admin' | 'pending';

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
  customerName: string;
  customerPhone: string;
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
  /** Driver attribution at completion time — frozen so it survives if the
   *  driver record is later deleted. */
  completedByDriverId?: string;
  completedByDriverName?: string;
  completedAt?: string;
  /** Google Calendar event id once this job has been pushed to a calendar. */
  googleCalendarEventId?: string;
  createdAt: string;
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
}

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
  /** Tag stamped during a bulk import — e.g. "xero-2026-04-28". */
  importBatch?: string;
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
