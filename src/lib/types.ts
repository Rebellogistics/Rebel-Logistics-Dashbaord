export type JobType = 'Standard' | 'White Glove' | 'House Move';
export type JobStatus = 'Quote' | 'Accepted' | 'Scheduled' | 'Notified' | 'In Delivery' | 'Completed' | 'Invoiced';
export type TruckId = 'Truck 1' | 'Truck 2';
export type TimeRange = '1d' | '7d' | '30d';

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
  createdAt: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  totalJobs: number;
  totalSpent: number;
  lastJobDate: string;
  avatar: string;
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
