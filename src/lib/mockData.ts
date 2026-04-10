import { Job, KPIStats, Customer, Message, TimeRange } from './types';
import { subDays, format, startOfDay } from 'date-fns';

const today = new Date();

export const mockJobs: Job[] = [
  {
    id: 'ORL20589632LY',
    customerName: 'Epul Rohman',
    customerPhone: '(485) 813-7***',
    pickupAddress: 'Warehouse A',
    deliveryAddress: '513 Gunung Walat',
    type: 'Standard',
    status: 'Completed',
    date: format(today, 'yyyy-MM-dd'),
    assignedTruck: 'Truck 1',
    fee: 3.99,
    fuelLevy: 0,
    createdAt: subDays(today, 1).toISOString(),
    proofPhoto: 'https://picsum.photos/seed/delivery1/400/300',
    signature: 'Epul R.'
  },
  {
    id: 'ORL20589633LY',
    customerName: 'Riko Sapto Dimo',
    customerPhone: '(982) 625-0***',
    pickupAddress: 'Warehouse B',
    deliveryAddress: '0865 Cibadak Mall',
    type: 'White Glove',
    status: 'In Delivery',
    date: format(today, 'yyyy-MM-dd'),
    assignedTruck: 'Truck 2',
    fee: 5.99,
    fuelLevy: 1.5,
    createdAt: subDays(today, 1).toISOString(),
  },
  {
    id: 'ORL20589634LY',
    customerName: 'Pandi Atuk Senantiasa',
    customerPhone: '(688) 813-0***',
    pickupAddress: 'Depot C',
    deliveryAddress: 'Jl. Merdeka 45',
    type: 'House Move',
    status: 'Scheduled',
    date: format(today, 'yyyy-MM-dd'),
    assignedTruck: 'Truck 1',
    fee: 1.99,
    fuelLevy: 0,
    createdAt: today.toISOString(),
  },
  {
    id: 'ORL20589635LY',
    customerName: 'Dede Inon',
    customerPhone: '(723) 638-4***',
    pickupAddress: 'Warehouse A',
    deliveryAddress: 'Fashion District',
    type: 'Standard',
    status: 'Completed',
    date: format(subDays(today, 1), 'yyyy-MM-dd'),
    assignedTruck: 'Truck 1',
    fee: 7.99,
    fuelLevy: 2.0,
    createdAt: subDays(today, 2).toISOString(),
  },
  {
    id: 'ORL20589636LY',
    customerName: 'Ariq Fikriawan Ramdani',
    customerPhone: '(642) 541-8***',
    pickupAddress: 'Warehouse B',
    deliveryAddress: 'Central Plaza',
    type: 'Standard',
    status: 'Quote',
    date: format(today, 'yyyy-MM-dd'),
    fee: 2.99,
    fuelLevy: 0,
    createdAt: today.toISOString(),
  },
  {
    id: 'ORL20589637LY',
    customerName: 'Nazmi Javier',
    customerPhone: '(370) 924-9***',
    pickupAddress: 'Depot C',
    deliveryAddress: 'Food Court',
    type: 'Standard',
    status: 'Completed',
    date: format(subDays(today, 1), 'yyyy-MM-dd'),
    assignedTruck: 'Truck 2',
    fee: 0.99,
    fuelLevy: 0,
    createdAt: subDays(today, 2).toISOString(),
  }
];

export const mockCustomers: Customer[] = [
  {
    id: 'C1',
    name: 'Epul Rohman',
    email: 'epul@example.com',
    phone: '(485) 813-7***',
    totalJobs: 12,
    totalSpent: 450.50,
    lastJobDate: format(subDays(today, 1), 'yyyy-MM-dd'),
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Epul'
  },
  {
    id: 'C2',
    name: 'Riko Sapto Dimo',
    email: 'riko@example.com',
    phone: '(982) 625-0***',
    totalJobs: 8,
    totalSpent: 320.00,
    lastJobDate: format(today, 'yyyy-MM-dd'),
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Riko'
  },
  {
    id: 'C3',
    name: 'Pandi Atuk',
    email: 'pandi@example.com',
    phone: '(688) 813-0***',
    totalJobs: 5,
    totalSpent: 150.00,
    lastJobDate: format(today, 'yyyy-MM-dd'),
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Pandi'
  }
];

export const mockMessages: Message[] = [
  {
    id: 'M1',
    sender: 'Epul Rohman',
    content: 'Is the delivery on track for today?',
    timestamp: subDays(today, 0).toISOString(),
    unread: true,
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Epul'
  },
  {
    id: 'M2',
    sender: 'Riko Sapto',
    content: 'Thanks for the quick delivery!',
    timestamp: subDays(today, 1).toISOString(),
    unread: false,
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Riko'
  }
];

export const getKPIsByRange = (range: TimeRange): KPIStats => {
  switch (range) {
    case '1d':
      return { totalJobs: 45, onGoing: 12, shipped: 15, completed: 18, notificationsSent: 42, revenue: 1250 };
    case '7d':
      return { totalJobs: 320, onGoing: 85, shipped: 110, completed: 125, notificationsSent: 310, revenue: 8450 };
    case '30d':
    default:
      return { totalJobs: 1896, onGoing: 259, shipped: 320, completed: 1327, notificationsSent: 1540, revenue: 12450.50 };
  }
};

export const getChartDataByRange = (range: TimeRange) => {
  if (range === '1d') {
    return [
      { name: '08:00', jobs: 5, revenue: 50 },
      { name: '10:00', jobs: 8, revenue: 80 },
      { name: '12:00', jobs: 12, revenue: 120 },
      { name: '14:00', jobs: 10, revenue: 100 },
      { name: '16:00', jobs: 7, revenue: 70 },
      { name: '18:00', jobs: 3, revenue: 30 },
    ];
  }
  if (range === '7d') {
    return [
      { name: 'Mon', jobs: 45, revenue: 450 },
      { name: 'Tue', jobs: 52, revenue: 520 },
      { name: 'Wed', jobs: 48, revenue: 480 },
      { name: 'Thu', jobs: 61, revenue: 610 },
      { name: 'Fri', jobs: 55, revenue: 550 },
      { name: 'Sat', jobs: 32, revenue: 320 },
      { name: 'Sun', jobs: 28, revenue: 280 },
    ];
  }
  // 30d
  return Array.from({ length: 30 }).map((_, i) => ({
    name: `Day ${i + 1}`,
    jobs: Math.floor(Math.random() * 50) + 20,
    revenue: Math.floor(Math.random() * 500) + 200,
  }));
};
