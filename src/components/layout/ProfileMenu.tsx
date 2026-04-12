import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ChevronDown, Settings, LogOut } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Logo } from '@/components/ui/logo';
import { signOut } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Profile } from '@/lib/types';

interface ProfileMenuProps {
  profile: Profile;
  driverCount?: number;
  customerCount?: number;
  onNavigate?: (tab: string) => void;
}

export function ProfileMenu({ profile, driverCount = 0, customerCount = 0, onNavigate }: ProfileMenuProps) {
  const navigate = useNavigate();
  const displayName = profile.fullName ?? 'User';
  const initials = displayName
    .split(' ')
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

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
    <Popover>
      <PopoverTrigger className="group flex items-center gap-2.5 pl-1 pr-2 h-10 rounded-xl hover:bg-rebel-surface-sunken transition-colors">
        <div className="relative h-8 w-8 rounded-full bg-gradient-to-br from-rebel-accent to-rebel-accent-hover flex items-center justify-center text-white text-[11px] font-bold ring-2 ring-rebel-surface">
          {initials || 'Y'}
          <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-rebel-success ring-2 ring-rebel-surface" />
        </div>
        <div className="hidden md:block text-left leading-none">
          <p className="text-[12px] font-bold text-rebel-text">{displayName}</p>
          <p className="text-[10px] text-rebel-text-tertiary mt-1 capitalize">{profile.role}</p>
        </div>
        <ChevronDown className="w-4 h-4 text-rebel-text-tertiary group-hover:text-rebel-text-secondary transition-colors" />
      </PopoverTrigger>

      <PopoverContent
        side="bottom"
        align="end"
        sideOffset={10}
        className="w-[280px] p-0 bg-rebel-surface-raised border-0 ring-0 shadow-popover rounded-2xl overflow-hidden"
      >
        {/* Logo + identity block */}
        <div className="p-4 space-y-3">
          <Logo variant="full" height={28} className="opacity-60" />
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-full bg-gradient-to-br from-rebel-accent to-rebel-accent-hover flex items-center justify-center text-white text-[13px] font-bold shrink-0">
              {initials || 'Y'}
            </div>
            <div className="min-w-0">
              <p className="text-[14px] font-bold text-rebel-text truncate">{displayName}</p>
              <p className="text-[11px] text-rebel-text-tertiary truncate">
                {profile.email ?? '—'}
                <span className="mx-1">·</span>
                <span className="capitalize">{profile.role}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="mx-4 grid grid-cols-2 gap-3 py-4 border-y border-rebel-border">
          <button
            type="button"
            onClick={() => onNavigate?.('Settings')}
            className="text-center hover:opacity-80 transition-opacity"
          >
            <p className="text-[26px] font-bold leading-none text-rebel-text tabular-nums tracking-tight">
              {driverCount}
            </p>
            <p className="mt-1.5 text-[10px] uppercase tracking-wider font-bold text-rebel-text-tertiary">
              Drivers
            </p>
          </button>
          <button
            type="button"
            onClick={() => onNavigate?.('Customers')}
            className="text-center border-l border-rebel-border hover:opacity-80 transition-opacity"
          >
            <p className="text-[26px] font-bold leading-none text-rebel-text tabular-nums tracking-tight">
              {customerCount}
            </p>
            <p className="mt-1.5 text-[10px] uppercase tracking-wider font-bold text-rebel-text-tertiary">
              Customers
            </p>
          </button>
        </div>

        {/* Menu items */}
        <div className="p-2">
          <button
            type="button"
            onClick={() => onNavigate?.('Settings')}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-[13px] font-medium text-rebel-text-secondary hover:bg-rebel-surface-sunken hover:text-rebel-text transition-colors"
          >
            <Settings className="w-4 h-4" />
            Settings
          </button>
          <ThemeToggle variant="switch" />
        </div>

        {/* Log out */}
        <div className="p-3 pt-0">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full inline-flex items-center justify-center gap-2 h-10 rounded-xl bg-rebel-danger text-white text-[13px] font-semibold hover:brightness-110 transition-all shadow-[0_8px_20px_-8px_rgba(225,29,72,0.6)]"
          >
            <LogOut className="w-4 h-4" />
            Log Out
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
