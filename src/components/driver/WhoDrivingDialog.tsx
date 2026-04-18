import { useEffect, useState } from 'react';
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
import { useTeam } from '@/hooks/useTeam';
import { cn } from '@/lib/utils';
import { User } from 'lucide-react';

interface WhoDrivingDialogProps {
  open: boolean;
  onClose: () => void;
  onPick: (name: string) => void;
  initialName?: string | null;
}

/**
 * Roster picker shown on DriverShell load when no driver has been picked for today.
 * Drivers are sourced from the active profiles (role = 'driver'), but an "Other"
 * free-text option is always available so Yamen can credit a casual driver who
 * doesn't have a login.
 */
export function WhoDrivingDialog({ open, onClose, onPick, initialName }: WhoDrivingDialogProps) {
  const { data: team = [] } = useTeam();
  const drivers = team
    .filter((p) => p.role === 'driver' && p.active && (p.fullName?.trim() ?? '').length > 0)
    .map((p) => p.fullName!.trim())
    .sort((a, b) => a.localeCompare(b));

  const [selection, setSelection] = useState<string>(initialName ?? '');
  const [otherName, setOtherName] = useState('');
  const [otherActive, setOtherActive] = useState(false);

  useEffect(() => {
    if (open) {
      setSelection(initialName ?? '');
      setOtherName('');
      setOtherActive(false);
    }
  }, [open, initialName]);

  const resolvedName = otherActive ? otherName.trim() : selection;
  const canSubmit = resolvedName.length > 0;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onPick(resolvedName);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-4 h-4" />
            Who's driving today?
          </DialogTitle>
          <DialogDescription className="text-xs">
            Pick the driver at the wheel right now. Completion notes will be tagged with their name so Yamen knows who did what.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2 max-h-[45vh] overflow-y-auto">
          {drivers.length === 0 && !otherActive && (
            <p className="text-xs text-muted-foreground py-2">
              No drivers on the roster yet. Tap "Other" below to enter a name.
            </p>
          )}
          {drivers.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => {
                setSelection(name);
                setOtherActive(false);
              }}
              className={cn(
                'w-full flex items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors',
                !otherActive && selection === name
                  ? 'border-rebel-accent bg-rebel-accent-surface'
                  : 'border-rebel-border bg-card hover:border-rebel-accent/40',
              )}
            >
              <div
                className={cn(
                  'h-8 w-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0',
                  !otherActive && selection === name
                    ? 'bg-rebel-accent text-white'
                    : 'bg-muted text-muted-foreground',
                )}
              >
                {initialsOf(name)}
              </div>
              <span className="text-sm font-semibold truncate">{name}</span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              setOtherActive(true);
              setSelection('');
            }}
            className={cn(
              'w-full flex items-center gap-3 rounded-xl border border-dashed px-3 py-3 text-left transition-colors',
              otherActive
                ? 'border-rebel-accent bg-rebel-accent-surface'
                : 'border-rebel-border bg-card hover:border-rebel-accent/40',
            )}
          >
            <div className="h-8 w-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-[11px] font-bold shrink-0">
              ?
            </div>
            <span className="text-sm font-semibold">Other — type a name</span>
          </button>
          {otherActive && (
            <Input
              autoFocus
              value={otherName}
              onChange={(e) => setOtherName(e.target.value)}
              placeholder="e.g. Casual driver, subcontractor"
              className="mt-1"
            />
          )}
        </div>

        <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
            Skip
          </Button>
          <Button
            className="w-full sm:w-auto bg-rebel-accent hover:bg-rebel-accent-hover text-white"
            disabled={!canSubmit}
            onClick={handleSubmit}
          >
            Start shift
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}
