import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Profile } from '@/lib/types';
import { useJobs } from '@/hooks/useSupabaseData';
import { signOut } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Truck,
  Mail,
  Phone,
  LogOut,
  Award,
  CheckCircle2,
  Activity,
  User,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useDriverToday } from '@/hooks/useDriverToday';
import { WhoDrivingDialog } from './WhoDrivingDialog';

interface DriverProfileTabProps {
  profile: Profile;
}

export function DriverProfileTab({ profile }: DriverProfileTabProps) {
  const navigate = useNavigate();
  const { data: jobs = [] } = useJobs();
  const { name: pickedDriverName, setName: setDriverName } = useDriverToday();
  const [pickerOpen, setPickerOpen] = useState(false);

  const truckName = profile.assignedTruck?.trim() ?? null;

  const stats = useMemo(() => {
    let lifetime = 0;
    let thisWeek = 0;
    let onTime = 0;
    const weekStart = Date.now() - 7 * 86400000;
    for (const job of jobs) {
      if (job.status !== 'Completed' && job.status !== 'Invoiced') continue;
      // When the driver is logged into a truck account, scope lifetime stats to
      // that truck. When there's no truck context, fall back to all jobs.
      if (truckName && job.assignedTruck !== truckName) continue;
      lifetime += 1;
      if (job.proofPhoto || job.signature) onTime += 1;
      try {
        if (Date.parse(job.date) >= weekStart) thisWeek += 1;
      } catch {
        // ignore
      }
    }
    const onTimePct = lifetime === 0 ? 0 : Math.round((onTime / lifetime) * 100);
    return { lifetime, thisWeek, onTimePct };
  }, [jobs, truckName]);

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login', { replace: true });
    } catch (err) {
      console.error(err);
      toast.error('Failed to sign out');
    }
  };

  const initials = (profile.fullName ?? 'D')
    .split(/\s+/)
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="space-y-5">
      {/* Identity card */}
      <Card className="border-rebel-border bg-card shadow-card">
        <CardContent className="p-5 flex items-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-rebel-accent to-rebel-accent-hover flex items-center justify-center text-white text-[20px] font-bold shadow-glow shrink-0">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[18px] font-bold truncate">{profile.fullName ?? 'Driver'}</p>
            <p className="text-[11px] text-rebel-text-tertiary uppercase tracking-wider font-bold mt-0.5">
              Driver
            </p>
            {profile.assignedTruck && (
              <div className="mt-1.5 inline-flex items-center gap-1.5 h-5 px-2 rounded-md bg-rebel-accent-surface text-rebel-accent text-[10px] font-bold">
                <Truck className="w-2.5 h-2.5" />
                {profile.assignedTruck}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <StatCard
          icon={Award}
          label={truckName ? `${truckName} total` : 'Lifetime'}
          value={stats.lifetime}
        />
        <StatCard icon={Activity} label="Last 7d" value={stats.thisWeek} />
        <StatCard icon={CheckCircle2} label="On time" value={`${stats.onTimePct}%`} />
      </div>

      {/* Today's driver */}
      <Card className="border-rebel-border bg-card">
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-rebel-text-tertiary">
              Today's driver
            </p>
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="text-[10.5px] font-bold text-rebel-accent hover:underline"
            >
              {pickedDriverName ? 'Change' : 'Pick'}
            </button>
          </div>
          <div className="flex items-center gap-2.5 text-[12.5px]">
            <User className="w-3.5 h-3.5 text-rebel-text-tertiary" />
            <span className="font-semibold text-rebel-text">
              {pickedDriverName ?? 'Not picked yet'}
            </span>
          </div>
          <p className="text-[10.5px] text-rebel-text-tertiary">
            Completion notes are tagged with this name so the office knows who drove.
          </p>
        </CardContent>
      </Card>

      {/* Contact */}
      <Card className="border-rebel-border bg-card">
        <CardContent className="p-4 space-y-2.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-rebel-text-tertiary">
            Contact
          </p>
          {profile.email && (
            <div className="flex items-center gap-2.5 text-[12.5px]">
              <Mail className="w-3.5 h-3.5 text-rebel-text-tertiary" />
              <span className="font-mono text-rebel-text-secondary truncate">{profile.email}</span>
            </div>
          )}
          {profile.phone && (
            <div className="flex items-center gap-2.5 text-[12.5px]">
              <Phone className="w-3.5 h-3.5 text-rebel-text-tertiary" />
              <a
                href={`tel:${profile.phone}`}
                className="font-mono text-rebel-accent hover:underline"
              >
                {profile.phone}
              </a>
            </div>
          )}
          {!profile.email && !profile.phone && (
            <p className="text-[11px] text-rebel-text-tertiary">No contact details on file.</p>
          )}
        </CardContent>
      </Card>

      {/* Theme toggle + logout */}
      <Card className="border-rebel-border bg-card">
        <CardContent className="p-2">
          <ThemeToggle variant="switch" />
        </CardContent>
      </Card>

      <Button
        onClick={handleLogout}
        variant="outline"
        className="w-full h-12 gap-2 text-rebel-danger border-rebel-danger/30 hover:bg-rebel-danger-surface hover:text-rebel-danger"
      >
        <LogOut className="w-4 h-4" />
        Sign out
      </Button>

      <WhoDrivingDialog
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={(name) => setDriverName(name)}
        initialName={pickedDriverName}
      />
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Award;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl bg-card border border-rebel-border p-3 text-center">
      <Icon className="w-4 h-4 text-rebel-accent mx-auto" />
      <p className="text-[18px] font-bold leading-none mt-2 tabular-nums">{value}</p>
      <p className="text-[10px] uppercase tracking-wider font-bold text-rebel-text-tertiary mt-1.5">
        {label}
      </p>
    </div>
  );
}
