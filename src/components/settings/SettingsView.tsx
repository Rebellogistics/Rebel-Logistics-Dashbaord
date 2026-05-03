import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useTeam } from '@/hooks/useTeam';
import { useDrivers, useDeleteDriver } from '@/hooks/useDrivers';
import { useTrucks, useDeleteTruck } from '@/hooks/useTrucks';
import { Driver, Profile, Truck, UserRole } from '@/lib/types';
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
  KeyRound,
  Info,
} from 'lucide-react';
import { TrashSection } from './TrashSection';
import { AddDriverDialog } from './AddDriverDialog';
import { AddEditDriverDialog } from './AddEditDriverDialog';
import { EditTeamMemberDialog } from './EditTeamMemberDialog';
import { GenerateTruckLoginDialog } from './GenerateTruckLoginDialog';
import { TruckDialog } from './TruckDialog';
import { SmsTemplatesSection } from './SmsTemplatesSection';
import { CustomerImportSection } from './CustomerImportSection';
import { IntegrationsSection } from './IntegrationsSection';
import { BackupExportSection } from './BackupExportSection';
import { PricingPanel } from './PricingPanel';
import { DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type Section = 'team' | 'trucks' | 'pricing' | 'sms' | 'import' | 'export' | 'integrations' | 'trash';

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
          <TabButton
            active={section === 'trash'}
            onClick={() => setSection('trash')}
            icon={Trash2}
          >
            Trash
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
      ) : section === 'trash' ? (
        <TrashSection />
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
  return (
    <div className="space-y-6">
      <DriversSubsection />
      <TruckLoginsSubsection />
      <OwnersAdminsSubsection />
    </div>
  );
}

function DriversSubsection() {
  const { data: drivers = [], isLoading } = useDrivers();
  const deleteDriver = useDeleteDriver();
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Driver | null>(null);

  const handleDelete = async (driver: Driver) => {
    if (
      !confirm(
        `Move ${driver.name} to Trash?\n\nRestore from Settings → Trash within 30 days. Past job attributions stay intact.`,
      )
    )
      return;
    try {
      await deleteDriver.mutateAsync(driver.id);
      toast.success(`${driver.name} moved to Trash`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to remove driver');
    }
  };

  const activeCount = drivers.filter((d) => d.active).length;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-base">Drivers</h3>
          <p className="text-xs text-muted-foreground">
            {activeCount} active · picked from the truck portal dropdown each shift. No login.
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
          Add driver
        </Button>
      </div>

      {isLoading ? (
        <LoadingRow message="Loading drivers…" />
      ) : drivers.length === 0 ? (
        <EmptyCard
          icon={Users}
          message="No drivers yet. Add one so the truck portal can record who drove each job."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {drivers.map((driver) => (
            <Card
              key={driver.id}
              className={cn('border-border shadow-none bg-card', !driver.active && 'opacity-60')}
            >
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold truncate">{driver.name}</p>
                      <Badge
                        variant="secondary"
                        className={cn(
                          'border-none text-[10px]',
                          driver.active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-muted text-muted-foreground',
                        )}
                      >
                        {driver.active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    {driver.phone ? (
                      <a
                        href={`tel:${driver.phone}`}
                        className="text-xs text-muted-foreground hover:text-rebel-accent inline-flex items-center gap-1.5 mt-1"
                      >
                        <Phone className="w-3 h-3 shrink-0" />
                        {driver.phone}
                      </a>
                    ) : (
                      <p className="text-xs text-muted-foreground mt-1">No phone</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => {
                        setEditTarget(driver);
                        setAddOpen(true);
                      }}
                      aria-label="Edit"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => handleDelete(driver)}
                      aria-label="Remove"
                      className="text-rose-600 hover:text-rose-700"
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

      <AddEditDriverDialog
        open={addOpen}
        onOpenChange={(open) => {
          setAddOpen(open);
          if (!open) setEditTarget(null);
        }}
        driver={editTarget}
      />
    </section>
  );
}

function TruckLoginsSubsection() {
  const { data: trucks = [], isLoading } = useTrucks();
  const [generateTarget, setGenerateTarget] = useState<Truck | null>(null);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-base">Truck logins</h3>
          <p className="text-xs text-muted-foreground">
            Each truck's tablet logs in with its own credentials. The driver is picked from the dropdown after login.
          </p>
        </div>
      </div>

      <Card className="border-rebel-border bg-muted/20 shadow-none">
        <CardContent className="p-3 flex items-start gap-2 text-xs">
          <Info className="w-4 h-4 text-rebel-accent shrink-0 mt-0.5" />
          <p>
            Login emails use the format{' '}
            <code className="bg-white/80 px-1 rounded text-[11px]">truck-&lt;slug&gt;@rebellogistics.com.au</code>.
            Make sure email confirmation is <span className="font-semibold">off</span> in
            Supabase → Authentication → Providers → Email before generating, otherwise the
            login won't activate.
          </p>
        </CardContent>
      </Card>

      {isLoading ? (
        <LoadingRow message="Loading trucks…" />
      ) : trucks.length === 0 ? (
        <EmptyCard icon={TruckIcon} message="No trucks yet. Add one in the Trucks tab." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {trucks.filter((t) => t.active).map((truck) => (
            <Card key={truck.id} className="border-border shadow-none bg-card">
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-rebel-accent-surface flex items-center justify-center shrink-0">
                    <TruckIcon className="w-4 h-4 text-rebel-accent" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold truncate">{truck.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {truck.userId ? 'Login provisioned' : 'No login yet'}
                    </p>
                  </div>
                </div>
                {truck.userId ? (
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="secondary" className="bg-green-100 text-green-800 border-none text-[10px] gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Provisioned
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      onClick={() => setGenerateTarget(truck)}
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      Manage
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 shrink-0"
                    onClick={() => setGenerateTarget(truck)}
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    Generate login
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <GenerateTruckLoginDialog truck={generateTarget} onClose={() => setGenerateTarget(null)} />
    </section>
  );
}

function OwnersAdminsSubsection() {
  // Profiles minus 'driver' role — drivers now live in the dedicated table.
  // Pending profiles still show here so an invitee with role='pending'
  // can be promoted via Edit.
  const { data: team = [], isLoading } = useTeam();
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Profile | null>(null);
  const nonDrivers = team.filter((m) => m.role !== 'driver');

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-base">Owners & admins</h3>
          <p className="text-xs text-muted-foreground">
            {nonDrivers.length} member{nonDrivers.length === 1 ? '' : 's'} · accounts that log in to the dashboard.
          </p>
        </div>
        <Button
          variant="outline"
          className="gap-1.5"
          onClick={() => setAddOpen(true)}
          title="Invite a new admin / dispatcher (creates an email login)"
        >
          <Plus className="w-4 h-4" />
          Invite
        </Button>
      </div>

      {isLoading ? (
        <LoadingRow message="Loading admins…" />
      ) : nonDrivers.length === 0 ? (
        <EmptyCard icon={Users} message="No owners or admins yet." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {nonDrivers.map((member) => (
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
    </section>
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
    truck: 'bg-rebel-accent-surface text-rebel-accent',
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
    if (
      !confirm(
        `Move ${truck.name} to Trash?\n\nRestore from Settings → Trash within 30 days. Jobs assigned to this truck keep their assignment by name; the link comes back automatically when you restore.`,
      )
    ) {
      return;
    }
    try {
      await deleteTruck.mutateAsync(truck.id);
      toast.success(`${truck.name} moved to Trash`);
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
