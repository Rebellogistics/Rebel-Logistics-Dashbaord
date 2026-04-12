import { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { KPIStatsCards } from '@/components/dashboard/KPIStats';
import { JobsTable } from '@/components/dashboard/JobsTable';
import { DailyReviewPanel } from '@/components/dashboard/DailyReviewPanel';
import { LiveTruckRuns } from '@/components/dashboard/LiveTruckRuns';
import { RecentJobs } from '@/components/dashboard/RecentJobs';
import { InsightChips } from '@/components/dashboard/InsightChips';
import { TruckRunsView } from '@/components/truck-runs/TruckRunsView';
import { CustomersView } from '@/components/customers/CustomersView';
import { ReviewsView } from '@/components/reviews/ReviewsView';
import { SmsLogView } from '@/components/sms/SmsLogView';
import { SettingsView } from '@/components/settings/SettingsView';
import { JobDetailDialog } from '@/components/jobs/JobDetailDialog';
import { MarkCompleteDialog } from '@/components/jobs/MarkCompleteDialog';
import { AcceptAssignDialog } from '@/components/jobs/AcceptAssignDialog';
import { CustomerDetailDialog } from '@/components/customers/CustomerDetailDialog';
import { useJobs, useCustomers, useDeleteCustomer } from '@/hooks/useSupabaseData';
import { useSmsLog } from '@/hooks/useSms';
import { useProfile } from '@/hooks/useProfile';
import { useTeam } from '@/hooks/useTeam';
import { signOut } from '@/hooks/useAuth';
import { DriverShell } from '@/components/driver/DriverShell';
import { Profile, Job, Customer } from '@/lib/types';
import { Toaster } from '@/components/ui/sonner';
import { motion, AnimatePresence } from 'motion/react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Truck, LogOut, Clock, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Alert } from '@/hooks/useAlerts';
import { SearchResult } from '@/hooks/useSearch';
import { SearchScope } from '@/components/layout/SearchBar';
import { can } from '@/hooks/useCan';

export default function App() {
  const { data: profile, isLoading: profileLoading, error: profileError } = useProfile();

  if (profileLoading) {
    return <CenteredLoader message="Loading your profile…" />;
  }

  if (profileError || !profile) {
    return (
      <StatusScreen
        icon={AlertCircle}
        iconClass="bg-red-100 text-red-700"
        title="No profile found"
        description="Your account exists but doesn't have a profile row yet. Contact the owner to get set up, or sign out and try a different account."
      />
    );
  }

  if (!profile.active) {
    return (
      <StatusScreen
        icon={AlertCircle}
        iconClass="bg-red-100 text-red-700"
        title="Account deactivated"
        description="Your account has been deactivated by the owner. Contact Yemen if you believe this is a mistake, or sign out and try a different account."
      />
    );
  }

  if (profile.role === 'pending') {
    return (
      <StatusScreen
        icon={Clock}
        iconClass="bg-amber-100 text-amber-700"
        title="Waiting for approval"
        description="Your account is active but the owner hasn't assigned you a role yet. Please wait — once approved, you'll land on your dashboard automatically."
      />
    );
  }

  if (profile.role === 'driver') {
    return <DriverShell profile={profile} />;
  }

  return <OwnerShell profile={profile} />;
}

const SEARCH_SCOPE_BY_TAB: Record<string, SearchScope> = {
  Dashboard: 'all',
  'Truck Runs': 'jobs',
  Jobs: 'jobs',
  Customers: 'customers',
  Reviews: 'jobs',
  'SMS Log': 'sms',
  Settings: 'none',
};

function OwnerShell({ profile }: { profile: Profile }) {
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const { data: jobs = [], isLoading: jobsLoading } = useJobs();
  const { data: customers = [], isLoading: customersLoading } = useCustomers();
  const { data: smsLog = [], isLoading: smsLogLoading } = useSmsLog();
  const { data: team = [] } = useTeam();
  const deleteCustomer = useDeleteCustomer();

  const driverCount = team.filter((m) => m.role === 'driver' && m.active).length;

  // Shell-level dialog state — these can be triggered from the bell, search, or any inner view.
  const [viewJobTarget, setViewJobTarget] = useState<Job | null>(null);
  const [markCompleteTarget, setMarkCompleteTarget] = useState<Job | null>(null);
  const [assignTarget, setAssignTarget] = useState<Job | null>(null);
  const [viewCustomerTarget, setViewCustomerTarget] = useState<Customer | null>(null);

  const isLoading = jobsLoading || customersLoading;
  const searchScope = SEARCH_SCOPE_BY_TAB[activeTab] ?? 'all';

  const handleAlertAction = (alert: Alert) => {
    if (alert.action === 'view_sms') {
      setActiveTab('SMS Log');
      return;
    }
    if (!alert.jobId) return;
    const job = jobs.find((j) => j.id === alert.jobId);
    if (!job) {
      toast.error("Couldn't find that job");
      return;
    }
    if (alert.action === 'mark_complete') setMarkCompleteTarget(job);
    else if (alert.action === 'assign_truck') setAssignTarget(job);
    else setViewJobTarget(job);
  };

  const handleSearchSelect = (result: SearchResult) => {
    if (result.kind === 'customer' && result.customer) {
      setActiveTab('Customers');
      setViewCustomerTarget(result.customer);
      return;
    }
    if (result.kind === 'job' && result.job) {
      setViewJobTarget(result.job);
      return;
    }
    if (result.kind === 'sms') {
      setActiveTab('SMS Log');
    }
  };

  const handleCustomerDelete = async (customer: Customer) => {
    if (
      !confirm(
        `Delete ${customer.name}? Linked jobs will keep their info but lose the customer link.`,
      )
    ) {
      return;
    }
    try {
      await deleteCustomer.mutateAsync(customer.id);
      toast.success('Customer deleted');
      setViewCustomerTarget(null);
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete customer');
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-rebel-border border-t-rebel-accent mx-auto mb-4" />
            <p className="text-sm text-rebel-text-secondary">Loading data...</p>
          </div>
        </div>
      );
    }

    switch (activeTab) {
      case 'Dashboard':
        return (
          <div className="space-y-8">
            <KPIStatsCards jobs={jobs} smsLog={smsLog} />
            <InsightChips jobs={jobs} />
            <LiveTruckRuns jobs={jobs} customers={customers} />
            <RecentJobs jobs={jobs} onViewAll={() => setActiveTab('Jobs')} />
            <DailyReviewPanel jobs={jobs} />
          </div>
        );
      case 'Truck Runs':
        return <TruckRunsView jobs={jobs} />;
      case 'Jobs':
        return (
          <div className="space-y-8">
            <KPIStatsCards jobs={jobs} smsLog={smsLog} />
            <JobsTable jobs={jobs} />
          </div>
        );
      case 'Customers':
        return <CustomersView customers={customers} jobs={jobs} />;
      case 'Reviews':
        return <ReviewsView jobs={jobs} />;
      case 'SMS Log':
        return <SmsLogView entries={smsLog} isLoading={smsLogLoading} />;
      case 'Settings':
        if (!can(profile, 'view_settings')) {
          return (
            <div className="p-12 text-center text-rebel-text-secondary">
              <p className="text-sm font-semibold">Settings is owner-only</p>
              <p className="text-xs mt-1">Contact your owner if you need access.</p>
            </div>
          );
        }
        return <SettingsView />;
      default:
        return <div className="p-8 text-center text-rebel-text-secondary">View coming soon...</div>;
    }
  };

  return (
    <div className="flex min-h-screen bg-rebel-canvas font-sans text-rebel-text">
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
      />

      <main className="flex-1 flex flex-col min-w-0">
        <TopBar
          profile={profile}
          activeTab={activeTab}
          driverCount={driverCount}
          customerCount={customers.length}
          jobs={jobs}
          customers={customers}
          smsLog={smsLog}
          searchScope={searchScope}
          onAlertAction={handleAlertAction}
          onSearchSelect={handleSearchSelect}
          onMenuClick={() => setSidebarOpen(true)}
          onNavigate={setActiveTab}
        />

        <div className="flex-1 p-4 lg:p-8 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Shell-level dialogs — driven by bell, search, or any inner view */}
      <JobDetailDialog job={viewJobTarget} onClose={() => setViewJobTarget(null)} />
      <MarkCompleteDialog job={markCompleteTarget} onClose={() => setMarkCompleteTarget(null)} />
      <AcceptAssignDialog job={assignTarget} onClose={() => setAssignTarget(null)} />
      <CustomerDetailDialog
        customer={viewCustomerTarget}
        jobs={jobs}
        onClose={() => setViewCustomerTarget(null)}
        onEdit={() => {
          /* edit handled within CustomersView */
        }}
        onDelete={handleCustomerDelete}
      />

      <Toaster position="top-right" />
    </div>
  );
}

interface StatusScreenProps {
  icon: typeof Truck;
  iconClass: string;
  title: string;
  description: string;
}

function StatusScreen({ icon: Icon, iconClass, title, description }: StatusScreenProps) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login', { replace: true });
    } catch (err) {
      console.error(err);
      toast.error('Failed to sign out');
    }
  };

  return (
    <div className="min-h-screen bg-rebel-canvas flex items-center justify-center px-4">
      <Card className="w-full max-w-md border border-rebel-border bg-rebel-surface shadow-card rounded-2xl">
        <CardContent className="p-8 text-center space-y-4">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto ${iconClass}`}>
            <Icon className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-rebel-text">{title}</h2>
            <p className="text-sm text-rebel-text-secondary">{description}</p>
          </div>
          <Button variant="outline" onClick={handleLogout} className="mt-2 gap-2">
            <LogOut className="w-4 h-4" />
            Sign out
          </Button>
        </CardContent>
      </Card>
      <Toaster position="top-right" />
    </div>
  );
}

function CenteredLoader({ message }: { message: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-rebel-canvas">
      <div className="text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-rebel-border border-t-rebel-accent mx-auto mb-3" />
        <p className="text-xs text-rebel-text-secondary">{message}</p>
      </div>
    </div>
  );
}
