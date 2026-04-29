import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useTeam } from '@/hooks/useTeam';
import { useTrucks, useDeleteTruck } from '@/hooks/useTrucks';
import { Profile, Truck, UserRole } from '@/lib/types';
import {
  Users,
  Truck as TruckIcon,
  Plus,
  Pencil,
  Trash2,
  Star,
  Mail,
  Phone,
  CheckCircle2,
  CircleSlash,
  MessageSquare,
  FileSpreadsheet,
  Link2,
} from 'lucide-react';
import { AddDriverDialog } from './AddDriverDialog';
import { EditTeamMemberDialog } from './EditTeamMemberDialog';
import { TruckDialog } from './TruckDialog';
import { SmsTemplatesSection } from './SmsTemplatesSection';
import { CustomerImportSection } from './CustomerImportSection';
import { IntegrationsSection } from './IntegrationsSection';
import { BackupExportSection } from './BackupExportSection';
import { PricingPanel } from './PricingPanel';
import { DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type Section = 'team' | 'trucks' | 'pricing' | 'sms' | 'import' | 'export' | 'integrations';

export function SettingsView() {
  const [section, setSection] = useState<Section>('team');

  return (
    <div className="space-y-4">
      {/* Settings tab bar.
          Mobile: a horizontal-scroll strip with snap so tabs stay one-row but
                  don't burst out of the viewport.
          Tablet+: tabs wrap to two rows naturally. */}
      <div className="-mx-1 px-1 overflow-x-auto sm:overflow-visible">
        <div className="flex items-center gap-2 flex-nowrap sm:flex-wrap min-w-max sm:min-w-0">
          <TabButton
            active={section === 'team'}
            onClick={() => setSection('team')}
            icon={Users}
          >
            Team
          </TabButton>
          <TabButton
            active={section === 'trucks'}
            onClick={() => setSection('trucks')}
            icon={TruckIcon}
          >
            Trucks
          </TabButton>
          <TabButton
            active={section === 'pricing'}
            onClick={() => setSection('pricing')}
            icon={DollarSign}
          >
            Pricing
          </TabButton>
          <TabButton
            active={section === 'sms'}
            onClick={() => setSection('sms')}
            icon={MessageSquare}
          >
            SMS Templates
          </TabButton>
          <TabButton
            active={section === 'import'}
            onClick={() => setSection('import')}
            icon={FileSpreadsheet}
          >
            Import
          </TabButton>
          <TabButton
            active={section === 'export'}
            onClick={() => setSection('export')}
            icon={FileSpreadsheet}
          >
            Export
          </TabButton>
          <TabButton
            active={section === 'integrations'}
            onClick={() => setSection('integrations')}
            icon={Link2}
          >
            Integrations
          </TabButton>
        </div>
      </div>

      {section === 'team' ? (
        <TeamSection />
      ) : section === 'trucks' ? (
        <TrucksSection />
      ) : section === 'pricing' ? (
        <PricingPanel />
      ) : section === 'sms' ? (
        <SmsTemplatesSection />
      ) : section === 'import' ? (
        <CustomerImportSection />
      ) : section === 'export' ? (
        <BackupExportSection />
      ) : (
        <IntegrationsSection />
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Users;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'h-9 px-4 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 shrink-0',
        active
          ? 'bg-rebel-accent text-white'
          : 'bg-card border border-input text-muted-foreground hover:bg-muted'
      )}
    >
      <Icon className="w-4 h-4" />
      {children}
    </button>
  );
}

// ---------------- Team ----------------

function TeamSection() {
  const { data: team = [], isLoading } = useTeam();
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Profile | null>(null);

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-base">Team members</h3>
          <p className="text-xs text-muted-foreground">
            {team.length} member{team.length === 1 ? '' : 's'} · drivers see only their assigned truck's jobs
          </p>
        </div>
        <Button
          className="bg-rebel-accent hover:bg-rebel-accent-hover text-white gap-1.5"
          onClick={() => setAddOpen(true)}
        >
          <Plus className="w-4 h-4" />
          Add driver
        </Button>
      </div>

      {isLoading ? (
        <LoadingRow message="Loading team…" />
      ) : team.length === 0 ? (
        <EmptyCard
          icon={Users}
          message="No team members yet. Add a driver to get started."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {team.map((member) => (
            <MemberCard
              key={member.userId}
              member={member}
              onEdit={() => setEditTarget(member)}
            />
          ))}
        </div>
      )}

      <AddDriverDialog open={addOpen} onOpenChange={setAddOpen} />
      <EditTeamMemberDialog member={editTarget} onClose={() => setEditTarget(null)} />
    </>
  );
}

function MemberCard({ member, onEdit }: { member: Profile; onEdit: () => void }) {
  return (
    <Card className={cn('border-border shadow-none bg-card', !member.active && 'opacity-60')}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold truncate">{member.fullName ?? '—'}</p>
              {member.role === 'owner' && (
                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              )}
            </div>
            <RoleBadge role={member.role} />
          </div>
          <Button size="icon-sm" variant="ghost" onClick={onEdit} aria-label="Edit">
            <Pencil className="w-3.5 h-3.5" />
          </Button>
        </div>

        <div className="space-y-1 text-xs">
          {member.email && (
            <DetailRow icon={Mail}>
              <span className="truncate">{member.email}</span>
            </DetailRow>
          )}
          {member.phone && (
            <DetailRow icon={Phone}>
              <span>{member.phone}</span>
            </DetailRow>
          )}
          {member.role === 'driver' && (
            <DetailRow icon={TruckIcon}>
              <span>{member.assignedTruck ?? 'No truck assigned'}</span>
            </DetailRow>
          )}
          <DetailRow icon={member.active ? CheckCircle2 : CircleSlash}>
            <span className={member.active ? 'text-green-700' : 'text-red-700'}>
              {member.active ? 'Active' : 'Deactivated'}
            </span>
          </DetailRow>
        </div>
      </CardContent>
    </Card>
  );
}

function RoleBadge({ role }: { role: UserRole }) {
  const map: Record<UserRole, string> = {
    owner: 'bg-amber-100 text-amber-800',
    driver: 'bg-rebel-accent-surface text-rebel-accent',
    dispatcher: 'bg-indigo-100 text-indigo-800',
    admin: 'bg-purple-100 text-purple-800',
    pending: 'bg-muted text-muted-foreground',
  };
  return (
    <Badge variant="secondary" className={cn('border-none text-[10px] capitalize', map[role])}>
      {role}
    </Badge>
  );
}

function DetailRow({ icon: Icon, children }: { icon: typeof Mail; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-muted-foreground">
      <Icon className="w-3.5 h-3.5 shrink-0" />
      {children}
    </div>
  );
}

// ---------------- Trucks ----------------

function TrucksSection() {
  const { data: trucks = [], isLoading } = useTrucks();
  const deleteTruck = useDeleteTruck();
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Truck | null>(null);

  const handleDelete = async (truck: Truck) => {
    if (!confirm(`Delete ${truck.name}? This cannot be undone and will affect any jobs still assigned to it.`)) {
      return;
    }
    try {
      await deleteTruck.mutateAsync(truck.id);
      toast.success(`${truck.name} deleted`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete truck');
    }
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-base">Trucks</h3>
          <p className="text-xs text-muted-foreground">
            {trucks.length} truck{trucks.length === 1 ? '' : 's'} · deactivate a truck to hide it from dropdowns
          </p>
        </div>
        <Button
          className="bg-rebel-accent hover:bg-rebel-accent-hover text-white gap-1.5"
          onClick={() => {
            setEditTarget(null);
            setAddOpen(true);
          }}
        >
          <Plus className="w-4 h-4" />
          Add truck
        </Button>
      </div>

      {isLoading ? (
        <LoadingRow message="Loading trucks…" />
      ) : trucks.length === 0 ? (
        <EmptyCard icon={TruckIcon} message="No trucks yet. Add one to start assigning jobs." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {trucks.map((truck) => (
            <Card
              key={truck.id}
              className={cn('border-border shadow-none bg-card', !truck.active && 'opacity-60')}
            >
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-rebel-accent-surface flex items-center justify-center">
                        <TruckIcon className="w-4 h-4 text-rebel-accent" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold truncate">{truck.name}</p>
                        <Badge
                          variant="secondary"
                          className={cn(
                            'border-none text-[10px]',
                            truck.active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-muted text-muted-foreground'
                          )}
                        >
                          {truck.active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </div>
                    {truck.description && (
                      <p className="text-[11px] text-muted-foreground mt-2">{truck.description}</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => {
                        setEditTarget(truck);
                        setAddOpen(true);
                      }}
                      aria-label="Edit"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => handleDelete(truck)}
                      aria-label="Delete"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <TruckDialog
        open={addOpen}
        onOpenChange={(open) => {
          setAddOpen(open);
          if (!open) setEditTarget(null);
        }}
        truck={editTarget}
      />
    </>
  );
}

function LoadingRow({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rebel-accent mx-auto mb-2"></div>
        <p className="text-xs text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

function EmptyCard({ icon: Icon, message }: { icon: typeof Users; message: string }) {
  return (
    <Card className="border-border shadow-none bg-card">
      <CardContent className="p-12 flex flex-col items-center text-center gap-3">
        <Icon className="w-10 h-10 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">{message}</p>
      </CardContent>
    </Card>
  );
}
