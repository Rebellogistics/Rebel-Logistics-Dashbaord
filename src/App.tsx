import { useState, useMemo } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { KPIStatsCards } from '@/components/dashboard/KPIStats';
import { JobsTable } from '@/components/dashboard/JobsTable';
import { DeliveryChart } from '@/components/dashboard/DeliveryChart';
import { MapPreview } from '@/components/dashboard/MapPreview';
import { RightSidebar } from '@/components/dashboard/RightSidebar';
import { TimeRangeFilter } from '@/components/dashboard/TimeRangeFilter';
import { mockJobs, mockCustomers, mockMessages, getKPIsByRange, getChartDataByRange } from '@/lib/mockData';
import { TimeRange } from '@/lib/types';
import { Toaster } from '@/components/ui/sonner';
import { motion, AnimatePresence } from 'motion/react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function App() {
  const [activeTab, setActiveTab] = useState('Shipping');
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');

  const stats = useMemo(() => getKPIsByRange(timeRange), [timeRange]);
  const chartData = useMemo(() => getChartDataByRange(timeRange), [timeRange]);

  const renderContent = () => {
    switch (activeTab) {
      case 'Dashboard':
        return (
          <div className="space-y-8">
            <KPIStatsCards stats={stats} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <DeliveryChart data={chartData} />
              <MapPreview />
            </div>
            <JobsTable jobs={mockJobs.slice(0, 3)} />
          </div>
        );
      case 'Shipping':
        return (
          <div className="space-y-8">
            <KPIStatsCards stats={stats} />
            <JobsTable jobs={mockJobs} />
          </div>
        );
      case 'Orders':
        return (
          <div className="space-y-8">
            <Card className="border-none shadow-none bg-white">
              <CardContent className="p-6">
                <h3 className="font-bold text-lg mb-4">Recent Orders</h3>
                <JobsTable jobs={mockJobs.filter(j => j.status === 'Accepted' || j.status === 'Scheduled')} />
              </CardContent>
            </Card>
          </div>
        );
      case 'Tracking':
        return (
          <div className="space-y-8">
            <MapPreview />
            <Card className="border-none shadow-none bg-white">
              <CardContent className="p-6">
                <h3 className="font-bold text-lg mb-4">Live Tracking</h3>
                <JobsTable jobs={mockJobs.filter(j => j.status === 'In Delivery')} />
              </CardContent>
            </Card>
          </div>
        );
      case 'Customers':
        return (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {mockCustomers.map(customer => (
                <Card key={customer.id} className="border-none shadow-none bg-white">
                  <CardContent className="p-6 flex flex-col items-center text-center">
                    <img src={customer.avatar} alt={customer.name} className="w-16 h-16 rounded-full mb-4" />
                    <h4 className="font-bold">{customer.name}</h4>
                    <p className="text-xs text-muted-foreground mb-4">{customer.email}</p>
                    <div className="grid grid-cols-2 gap-4 w-full pt-4 border-t">
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase">Jobs</p>
                        <p className="text-sm font-bold">{customer.totalJobs}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase">Spent</p>
                        <p className="text-sm font-bold">${customer.totalSpent}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
      case 'Message':
        return (
          <div className="space-y-4">
            {mockMessages.map(msg => (
              <Card key={msg.id} className="border-none shadow-none bg-white">
                <CardContent className="p-4 flex gap-4 items-start">
                  <img src={msg.avatar} alt={msg.sender} className="w-10 h-10 rounded-full" />
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <h4 className="font-bold text-sm">{msg.sender}</h4>
                      <span className="text-[10px] text-muted-foreground">{new Date(msg.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{msg.content}</p>
                  </div>
                  {msg.unread && <Badge className="bg-orange-500">New</Badge>}
                </CardContent>
              </Card>
            ))}
          </div>
        );
      default:
        return <div className="p-8 text-center text-muted-foreground">View coming soon...</div>;
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      
      <main className="flex-1 flex flex-col min-w-0">
        <TopBar />
        
        <div className="flex-1 flex">
          <div className="flex-1 p-8 space-y-8 overflow-y-auto">
            <div className="flex items-center justify-between">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="space-y-2"
              >
                <h2 className="text-2xl font-bold tracking-tight">Hi, Orely Studio 👋</h2>
                <p className="text-sm text-muted-foreground">
                  {activeTab} Overview • {timeRange === '1d' ? 'Today' : timeRange === '7d' ? 'Last 7 Days' : 'Last 30 Days'}
                </p>
              </motion.div>
              <TimeRangeFilter value={timeRange} onChange={setTimeRange} />
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab + timeRange}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
              >
                {renderContent()}
              </motion.div>
            </AnimatePresence>
          </div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.4 }}
          >
            <RightSidebar />
          </motion.div>
        </div>
      </main>
      
      <Toaster position="top-right" />
    </div>
  );
}
