import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Job, JobStatus, Truck } from '@/lib/types';
import {
  MoreHorizontal,
  Eye,
  PackageCheck,
  Truck as TruckIcon,
  Inbox,
  CheckCircle2,
  XCircle,
  FileText,
  CircleDot,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type JobMenuAction =
  | { type: 'view' }
  | { type: 'mark_complete' }
  | { type: 'set_status'; status: JobStatus }
  | { type: 'assign_truck'; truck: string }
  | { type: 'unassign_truck' };

interface JobActionMenuProps {
  job: Job;
  trucks?: Truck[];
  onAction: (action: JobMenuAction) => void;
  size?: 'sm' | 'icon-xs';
  /** Stop drag from starting on the trigger so the kanban + pool cards still work. */
  preventDrag?: boolean;
}

/**
 * Three-dots overflow menu for job cards on Board / Truck Runs. Replaces a
 * base-ui Menu primitive that crashed on first open — this version is a
 * tiny self-contained popover with portal positioning, click-away close,
 * and Escape support. Predictable, no third-party quirks.
 */
export function JobActionMenu({ job, trucks = [], onAction, size = 'sm', preventDrag }: JobActionMenuProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  const isClosed = job.status === 'Completed' || job.status === 'Invoiced';
  const isQuote = job.status === 'Quote';
  const isAccepted = job.status === 'Accepted';
  const isOnTruck = job.status === 'Scheduled' || job.status === 'Notified' || job.status === 'In Delivery';
  const activeTrucks = trucks.filter((t) => t.active);

  // Compute popover position from the trigger's bounding rect each open.
  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const POPOVER_WIDTH = 240;
    const VIEW_PADDING = 8;
    const desiredLeft = rect.right - POPOVER_WIDTH;
    const left = Math.max(VIEW_PADDING, Math.min(desiredLeft, window.innerWidth - POPOVER_WIDTH - VIEW_PADDING));
    const top = rect.bottom + 6;
    setPosition({ top, left });
  }, [open]);

  // Close on outside click or Escape
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        popoverRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const onScroll = () => setOpen(false);
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [open]);

  const handleSelect = (action: JobMenuAction) => {
    setOpen(false);
    // Defer to next tick so the popover unmounts before the dialog/mutation
    // would race with focus management.
    setTimeout(() => onAction(action), 0);
  };

  const buttonClass =
    size === 'icon-xs'
      ? 'inline-flex items-center justify-center w-6 h-6 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground shrink-0'
      : 'inline-flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground shrink-0';

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={buttonClass}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        onPointerDown={(e) => {
          if (preventDrag) e.stopPropagation();
        }}
        onMouseDown={(e) => {
          if (preventDrag) e.stopPropagation();
        }}
        draggable={false}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="More actions"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>

      {open && position && typeof document !== 'undefined'
        ? createPortal(
            <div
              ref={popoverRef}
              role="menu"
              style={{ position: 'fixed', top: position.top, left: position.left, width: 240 }}
              className="z-50 rounded-xl border border-rebel-border bg-card shadow-xl py-1 max-h-[60vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <SectionLabel>Job actions</SectionLabel>
              <Item
                icon={<Eye className="w-4 h-4 text-muted-foreground" />}
                label="Open job"
                onClick={() => handleSelect({ type: 'view' })}
              />
              {!isClosed && (
                <Item
                  icon={<PackageCheck className="w-4 h-4 text-rebel-success" />}
                  label="Mark complete…"
                  onClick={() => handleSelect({ type: 'mark_complete' })}
                />
              )}

              {!isClosed && (
                <>
                  <Divider />
                  <SectionLabel>Move to status</SectionLabel>
                  {!isQuote && (
                    <Item
                      icon={<FileText className="w-4 h-4 text-muted-foreground" />}
                      label="Quote"
                      onClick={() => handleSelect({ type: 'set_status', status: 'Quote' })}
                    />
                  )}
                  {!isAccepted && (
                    <Item
                      icon={<CircleDot className="w-4 h-4 text-rebel-accent" />}
                      label="Accepted"
                      onClick={() => handleSelect({ type: 'set_status', status: 'Accepted' })}
                    />
                  )}
                  <Item
                    icon={<CheckCircle2 className="w-4 h-4 text-rebel-success" />}
                    label="Completed"
                    onClick={() => handleSelect({ type: 'set_status', status: 'Completed' })}
                  />
                  <Item
                    icon={<FileText className="w-4 h-4 text-rebel-success" />}
                    label="Invoiced"
                    onClick={() => handleSelect({ type: 'set_status', status: 'Invoiced' })}
                  />
                  <Item
                    icon={<XCircle className="w-4 h-4 text-rebel-danger" />}
                    label="Decline"
                    destructive
                    onClick={() => handleSelect({ type: 'set_status', status: 'Declined' })}
                  />
                </>
              )}

              {!isClosed && activeTrucks.length > 0 && (
                <>
                  <Divider />
                  <SectionLabel>Move to truck</SectionLabel>
                  {activeTrucks.map((t) => {
                    const here = job.assignedTruck === t.name;
                    return (
                      <Item
                        key={t.id}
                        icon={<TruckIcon className="w-4 h-4 text-rebel-accent" />}
                        label={t.name}
                        hint={here ? 'currently here' : undefined}
                        disabled={here}
                        onClick={() => handleSelect({ type: 'assign_truck', truck: t.name })}
                      />
                    );
                  })}
                  {(isOnTruck || job.assignedTruck) && (
                    <Item
                      icon={<Inbox className="w-4 h-4 text-muted-foreground" />}
                      label="Back to Accepted pool"
                      onClick={() => handleSelect({ type: 'unassign_truck' })}
                    />
                  )}
                </>
              )}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="px-2.5 pt-1.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
      {children}
    </p>
  );
}

function Divider() {
  return <div className="my-1 h-px bg-border" />;
}

function Item({
  icon,
  label,
  hint,
  destructive,
  disabled,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  hint?: string;
  destructive?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={(e) => {
        e.stopPropagation();
        if (disabled) return;
        onClick();
      }}
      disabled={disabled}
      className={cn(
        'w-full text-left flex items-center gap-2 px-2.5 py-1.5 text-sm transition-colors',
        disabled
          ? 'opacity-50 cursor-not-allowed'
          : destructive
            ? 'text-rebel-danger hover:bg-rebel-danger-surface'
            : 'hover:bg-muted',
      )}
    >
      <span className="shrink-0">{icon}</span>
      <span className="flex-1 min-w-0 truncate">{label}</span>
      {hint && <span className="text-[10px] italic text-muted-foreground shrink-0">{hint}</span>}
    </button>
  );
}
