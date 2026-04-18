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
export type TruckId = string;

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
