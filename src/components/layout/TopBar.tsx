import { Menu } from 'lucide-react';
import { format } from 'date-fns';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { ProfileMenu } from '@/components/layout/ProfileMenu';
import { NotificationsBell } from '@/components/layout/NotificationsBell';
import { SearchBar, SearchScope } from '@/components/layout/SearchBar';
import { Profile, Job, Customer, SmsLogEntry } from '@/lib/types';
import { Alert } from '@/hooks/useAlerts';
import { SearchResult } from '@/hooks/useSearch';
import { motion } from 'motion/react';

interface TopBarProps {
  profile: Profile;
  activeTab: string;
  driverCount?: number;
  customerCount?: number;
  jobs: Job[];
  customers: Customer[];
  smsLog: SmsLogEntry[];
  searchScope: SearchScope;
  onAlertAction?: (alert: Alert) => void;
  onSearchSelect?: (result: SearchResult) => void;
  onMenuClick?: () => void;
  onNavigate?: (tab: string) => void;
}

const subtitleByTab: Record<string, string> = {
  Dashboard: 'Operational overview',
  'Truck Runs': 'Manage today and tomorrow',
  Jobs: 'Quotes, scheduled, completed',
  Customers: 'Your customer book',
  Reviews: 'Feedback & ratings',
  'SMS Log': 'Outbound message history',
  Settings: 'Workspace configuration',
};

export function TopBar({
  profile,
  activeTab,
  driverCount,
  customerCount,
  jobs,
  customers,
  smsLog,
  searchScope,
  onAlertAction,
  onSearchSelect,
  onMenuClick,
  onNavigate,
}: TopBarProps) {
  const today = format(new Date(), "EEEE · MMM d");

  return (
    <header className="sticky top-0 z-30 glass border-b border-rebel-border">
      <div className="h-[72px] flex items-center justify-between px-4 lg:px-8 gap-4">
        {/* Left: title + subtitle */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onMenuClick}
            aria-label="Open navigation"
            className="lg:hidden h-9 w-9 inline-flex items-center justify-center rounded-xl text-rebel-text-secondary hover:bg-rebel-surface-sunken hover:text-rebel-text transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>

          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="min-w-0"
          >
            <h1 className="font-display text-[20px] lg:text-[22px] font-bold tracking-tight text-rebel-text leading-none truncate">
              {activeTab}
            </h1>
            <p className="mt-1.5 text-[11px] font-medium text-rebel-text-tertiary truncate">
              <span className="text-rebel-text-secondary">{today}</span>
              <span className="mx-1.5 text-rebel-text-tertiary">·</span>
              {subtitleByTab[activeTab] ?? 'Workspace'}
            </p>
          </motion.div>
        </div>

        {/* Center: search (hidden when scope is 'none') */}
        <div className="hidden md:flex flex-1 justify-center">
          {searchScope !== 'none' && (
            <SearchBar
              jobs={jobs}
              customers={customers}
              smsLog={smsLog}
              scope={searchScope}
              onSelect={onSearchSelect}
            />
          )}
        </div>

        {/* Right cluster */}
        <div className="flex items-center gap-2">
          <ThemeToggle className="hidden sm:inline-flex" />
          <NotificationsBell jobs={jobs} smsLog={smsLog} onAlertAction={onAlertAction} />

          <div className="ml-1 pl-2 border-l border-rebel-border">
            <ProfileMenu
              profile={profile}
              driverCount={driverCount}
              customerCount={customerCount}
              onNavigate={onNavigate}
            />
          </div>
        </div>
      </div>
    </header>
  );
}
