import {
  LucideIcon,
  LayoutDashboard,
  Truck,
  ClipboardList,
  Users,
  MessageSquare,
  Star,
  Settings,
  LogOut,
  X,
  ChevronsLeft,
  ChevronsRight,
  Sparkles,
  Send,
  KanbanSquare,
  CalendarDays,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { signOut } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Logo } from '@/components/ui/logo';
import { useCan } from '@/hooks/useCan';
import { useJobs, useMessages } from '@/hooks/useSupabaseData';
import { useMemo } from 'react';
import { format } from 'date-fns';

interface NavItem {
  label: string;
  icon: LucideIcon;
  badge?: number;
  dot?: 'red' | 'blue' | 'amber';
}

interface NavSection {
  title: string;
  items: NavItem[];
}

function buildSections(opts: { truckRunsCount: number; smsUnread: boolean }): NavSection[] {
  const { truckRunsCount, smsUnread } = opts;
  return [
    {
      title: 'Operations',
      items: [
        { label: 'Dashboard', icon: LayoutDashboard },
        { label: 'Board', icon: KanbanSquare },
        {
          label: 'Truck Runs',
          icon: Truck,
          badge: truckRunsCount > 0 ? truckRunsCount : undefined,
        },
        { label: 'Trucks', icon: CalendarDays },
        { label: 'Jobs', icon: ClipboardList },
        { label: 'Customers', icon: Users },
        { label: 'Reviews', icon: Star },
      ],
    },
    {
      title: 'Communication',
      items: [
        { label: 'SMS Log', icon: MessageSquare, dot: smsUnread ? 'red' : undefined },
      ],
    },
    {
      title: 'Account',
      items: [{ label: 'Settings', icon: Settings }],
    },
  ];
}

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isOpen: boolean;
  onClose: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function Sidebar({
  activeTab,
  onTabChange,
  isOpen,
  onClose,
  collapsed = false,
  onToggleCollapse,
}: SidebarProps) {
  const navigate = useNavigate();
  const canSeeSettings = useCan('view_settings');
  const { data: jobs = [] } = useJobs();
  const { data: messages = [] } = useMessages();

  const todayStr = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);

  // Truck Runs badge = open delivery rows that need eyes today: Scheduled /
  // Notified / In Delivery dated today, plus anything in those statuses still
  // unfinished from a past day (mirrors the past-due strip in TruckRunsView).
  const truckRunsCount = useMemo(() => {
    return jobs.filter((j) => {
      if (j.status !== 'Scheduled' && j.status !== 'Notified' && j.status !== 'In Delivery')
        return false;
      return !j.date || j.date <= todayStr;
    }).length;
  }, [jobs, todayStr]);

  // Today's Brief — same scheduled-today count, plus how many of those still
  // need an en-route SMS sent (Scheduled, not yet Notified).
  const todayScheduled = useMemo(
    () =>
      jobs.filter(
        (j) =>
          j.date === todayStr &&
          (j.status === 'Scheduled' || j.status === 'Notified' || j.status === 'In Delivery'),
      ).length,
    [jobs, todayStr],
  );
  const todayToNotify = useMemo(
    () => jobs.filter((j) => j.date === todayStr && j.status === 'Scheduled').length,
    [jobs, todayStr],
  );

  const smsUnread = useMemo(() => messages.some((m) => m.unread), [messages]);

  const allSections = useMemo(
    () => buildSections({ truckRunsCount, smsUnread }),
    [truckRunsCount, smsUnread],
  );
  const sections = canSeeSettings
    ? allSections
    : allSections.filter((s) => s.title !== 'Account');

  const handleTabClick = (label: string) => {
    onTabChange(label);
    onClose();
  };

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login', { replace: true });
    } catch (err) {
      console.error(err);
      toast.error('Failed to sign out');
    }
  };

  const CollapseIcon = collapsed ? ChevronsRight : ChevronsLeft;

  return (
    <>
      {isOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          'flex flex-col z-50 transition-all duration-300 ease-in-out',
          'fixed inset-y-0 left-0 lg:static lg:translate-x-0 lg:h-screen lg:sticky lg:top-0',
          'bg-rebel-surface border-r border-rebel-border',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
          collapsed ? 'w-[68px]' : 'w-[260px]',
        )}
        style={{
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {/* Brand block */}
        <div className={cn('flex items-center justify-between gap-2', collapsed ? 'p-3' : 'p-5')}>
          {collapsed ? (
            <Logo variant="mark" height={32} className="mx-auto" />
          ) : (
            <Logo variant="full" height={34} className="max-w-[170px] object-contain object-left" />
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            className="lg:hidden h-8 w-8 inline-flex items-center justify-center rounded-lg text-rebel-text-secondary hover:bg-rebel-surface-sunken shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
          {!collapsed && (
            <button
              type="button"
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              onClick={onToggleCollapse}
              className="hidden lg:inline-flex h-7 w-7 items-center justify-center rounded-lg text-rebel-text-tertiary hover:text-rebel-text hover:bg-rebel-surface-sunken transition-colors shrink-0"
            >
              <CollapseIcon className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Nav sections */}
        <div className={cn('flex-1 overflow-y-auto py-2 space-y-6', collapsed ? 'px-1.5' : 'px-3')}>
          {sections.map((section) => (
            <div key={section.title}>
              {!collapsed && (
                <p className="text-[10px] font-bold text-rebel-text-tertiary uppercase tracking-[0.1em] mb-2 px-2.5">
                  {section.title}
                </p>
              )}
              <nav className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const active = activeTab === item.label;
                  return (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => handleTabClick(item.label)}
                      title={collapsed ? item.label : undefined}
                      className={cn(
                        'group relative w-full flex items-center rounded-xl text-[13px] font-medium transition-all',
                        collapsed ? 'justify-center h-10' : 'gap-3 h-10 px-2.5',
                        active
                          ? 'bg-rebel-accent-surface text-rebel-text nav-active-bar'
                          : 'text-rebel-text-secondary hover:bg-rebel-surface-sunken hover:text-rebel-text',
                      )}
                    >
                      <Icon
                        className={cn(
                          'w-[17px] h-[17px] shrink-0 transition-colors',
                          active ? 'text-rebel-accent' : 'text-rebel-text-tertiary group-hover:text-rebel-text-secondary',
                        )}
                      />
                      {!collapsed && (
                        <>
                          <span className="truncate">{item.label}</span>
                          {item.badge ? (
                            <span className="ml-auto inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-rebel-accent text-[10px] font-bold text-white px-1.5">
                              {item.badge}
                            </span>
                          ) : item.dot ? (
                            <span className="ml-auto relative inline-flex h-2 w-2">
                              <span className="absolute inline-flex h-full w-full rounded-full bg-rebel-danger animate-rebel-ping" />
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-rebel-danger" />
                            </span>
                          ) : null}
                        </>
                      )}
                      {/* Badge dot in collapsed mode */}
                      {collapsed && (item.badge || item.dot) && (
                        <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-rebel-danger" />
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>

        {/* Today's Brief card — hidden when collapsed */}
        {!collapsed && (
          <div className="px-4 pb-4">
            <div className="relative overflow-hidden rounded-2xl border border-rebel-border bg-gradient-to-br from-rebel-accent-surface via-rebel-surface to-rebel-surface p-4">
              <div
                aria-hidden
                className="absolute -top-10 -right-10 h-28 w-28 rounded-full blur-2xl opacity-60"
                style={{ background: 'radial-gradient(circle, rgba(45,91,255,0.4), transparent 70%)' }}
              />
              <div className="relative">
                <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-rebel-accent">
                  <Sparkles className="w-3.5 h-3.5" />
                  Today's Brief
                </div>
                <p className="mt-2 text-[13px] leading-snug font-medium text-rebel-text">
                  {todayScheduled === 0
                    ? 'No jobs scheduled today.'
                    : `${todayScheduled} job${todayScheduled === 1 ? '' : 's'} scheduled${
                        todayToNotify > 0
                          ? ` · ${todayToNotify} to notify`
                          : ''
                      }.`}
                </p>
                <button
                  type="button"
                  onClick={() => handleTabClick('Dashboard')}
                  className="mt-3 w-full inline-flex items-center justify-center gap-1.5 h-9 rounded-xl bg-rebel-accent text-white text-[12px] font-semibold hover:bg-rebel-accent-hover transition-colors shadow-[0_8px_20px_-8px_rgba(45,91,255,0.6)]"
                >
                  <Send className="w-3.5 h-3.5" />
                  Review &amp; send
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer row */}
        <div className={cn(
          'border-t border-rebel-border',
          collapsed ? 'px-1.5 pb-3 pt-3 flex flex-col items-center gap-2' : 'px-3 pb-4 pt-3 flex items-center gap-2',
        )}>
          {collapsed ? (
            <>
              <ThemeToggle variant="icon" />
              <button
                type="button"
                onClick={onToggleCollapse}
                aria-label="Expand sidebar"
                className="h-9 w-9 inline-flex items-center justify-center rounded-xl text-rebel-text-tertiary hover:text-rebel-text hover:bg-rebel-surface-sunken transition-colors"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleLogout}
                aria-label="Sign out"
                className="h-9 w-9 inline-flex items-center justify-center rounded-xl text-rebel-text-tertiary hover:bg-rebel-danger-surface hover:text-rebel-danger transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <ThemeToggle variant="switch" className="flex-1" />
              <button
                type="button"
                onClick={handleLogout}
                aria-label="Sign out"
                className="h-9 w-9 inline-flex items-center justify-center rounded-xl text-rebel-text-tertiary hover:bg-rebel-danger-surface hover:text-rebel-danger transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </aside>
    </>
  );
}
