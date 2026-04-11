import { useEffect, useState, type ReactNode } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUpdateTeamMember } from '@/hooks/useTeam';
import { useTrucks } from '@/hooks/useTrucks';
import { Profile, UserRole } from '@/lib/types';
import { toast } from 'sonner';

interface EditTeamMemberDialogProps {
  member: Profile | null;
  onClose: () => void;
}

export function EditTeamMemberDialog({ member, onClose }: EditTeamMemberDialogProps) {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<UserRole>('driver');
  const [assignedTruck, setAssignedTruck] = useState('');
  const [active, setActive] = useState(true);

  const updateMember = useUpdateTeamMember();
  const { data: trucks = [] } = useTrucks();

  useEffect(() => {
    if (member) {
      setFullName(member.fullName ?? '');
      setPhone(member.phone ?? '');
      setRole(member.role);
      setAssignedTruck(member.assignedTruck ?? '');
      setActive(member.active);
    }
  }, [member]);

  const handleSubmit = async () => {
    if (!member) return;
    try {
      await updateMember.mutateAsync({
        userId: member.userId,
        role,
        fullName,
        phone,
        assignedTruck: assignedTruck || null,
        active,
      });
      toast.success('Team member updated');
      onClose();
    } catch (err) {
      console.error(err);
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Failed to update team member';
      toast.error(message);
    }
  };

  if (!member) return null;

  return (
    <Dialog open={!!member} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit team member</DialogTitle>
          <DialogDescription>{member.email}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-2">
          <Field label="Full name">
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="h-10"
            />
          </Field>

          <Field label="Phone">
            <Input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="h-10"
            />
          </Field>

          <Field label="Role">
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="h-10 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="owner">Owner</option>
              <option value="driver">Driver</option>
              <option value="dispatcher">Dispatcher</option>
              <option value="admin">Admin</option>
              <option value="pending">Pending</option>
            </select>
          </Field>

          {role === 'driver' && (
            <Field label="Assigned truck">
              <select
                value={assignedTruck}
                onChange={(e) => setAssignedTruck(e.target.value)}
                className="h-10 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="">— None —</option>
                {trucks
                  .filter((t) => t.active)
                  .map((t) => (
                    <option key={t.id} value={t.name}>
                      {t.name}
                    </option>
                  ))}
              </select>
            </Field>
          )}

          <div className="flex items-center gap-2 pt-1">
            <input
              id="active-toggle"
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="w-4 h-4 rounded border-input"
            />
            <Label htmlFor="active-toggle" className="cursor-pointer">
              Active
            </Label>
            <span className="text-[10px] text-muted-foreground ml-1">
              (Inactive team members cannot access the dashboard.)
            </span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="bg-rebel-accent hover:bg-rebel-accent-hover text-white"
            disabled={updateMember.isPending}
            onClick={handleSubmit}
          >
            {updateMember.isPending ? 'Saving…' : 'Save changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs font-semibold">{label}</Label>
      {children}
    </div>
  );
}
