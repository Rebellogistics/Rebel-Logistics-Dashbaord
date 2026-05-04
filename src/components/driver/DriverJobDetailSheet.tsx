import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusPill } from '@/components/ui/status-pill';
import { Job } from '@/lib/types';
import { customerDisplay } from '@/lib/jobDisplay';
import { format, parseISO } from 'date-fns';
import {
  Phone,
  MapPin,
  Navigation,
  StickyNote,
  Truck as TruckIcon,
  User as UserIcon,
  Calendar as CalendarIcon,
  PackageCheck,
  Play,
  Star,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DriverJobDetailSheetProps {
  job: Job | null;
  onClose: () => void;
  onStartRun: (job: Job) => void;
  onMarkDelivered: (job: Job) => void;
  starting?: boolean;
  isVip?: boolean;
}

// Driver-side detail view. Yamin's call on May 4: drivers couldn't tell what
// a job was from the run-list card alone — only addresses showed. They
// needed the contact, type (Standard / White Glove), and the notes Yamin
// writes during the booking. NO PRICING — that's office-only.
export function DriverJobDetailSheet({
  job,
  onClose,
  onStartRun,
  onMarkDelivered,
  starting,
  isVip,
}: DriverJobDetailSheetProps) {
  if (!job) return null;

  const display = customerDisplay(job);
  const hasPhone = !!job.customerPhone?.trim();
  const isDone = job.status === 'Completed' || job.status === 'Invoiced';
  const isInDelivery = job.status === 'In Delivery';
  const canStart = job.status === 'Scheduled' || job.status === 'Accepted' || job.status === 'Notified';
  const mapsUrl = (addr: string) =>
    `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(addr)}`;

  return (
    <Dialog open={!!job} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            <span className="truncate">{display.primary}</span>
            {isVip && (
              <span
                className="inline-flex items-center gap-0.5 h-5 px-1.5 rounded-full bg-amber-400 text-white text-[10px] font-bold uppercase tracking-wider"
                title="VIP customer — handle with care"
              >
                <Star className="w-2.5 h-2.5 fill-white" />
                VIP
              </span>
            )}
            <StatusPill status={job.status} size="sm" />
          </DialogTitle>
          {display.secondary && (
            <DialogDescription className="text-xs flex items-center gap-1.5">
              <UserIcon className="w-3 h-3" />
              Contact: {display.secondary}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-3 pt-1">
          {/* Type chips — Yamin's "I don't know what type of job it is" fix */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge className="bg-rebel-accent-surface text-rebel-accent border-none text-[11px] font-bold uppercase tracking-wider">
              {job.type}
            </Badge>
            {job.type !== 'House Move' && job.location && (
              <Badge variant="secondary" className="bg-indigo-100 text-indigo-700 border-none text-[11px]">
                {job.location}
              </Badge>
            )}
            {job.type !== 'House Move' && job.cubicMetres != null && (
              <Badge variant="secondary" className="bg-muted text-muted-foreground border-none text-[11px]">
                {job.cubicMetres} m³
              </Badge>
            )}
            {job.itemWeightKg != null && (
              <Badge variant="secondary" className="bg-muted text-muted-foreground border-none text-[11px]">
                {job.itemWeightKg} kg
              </Badge>
            )}
          </div>

          {/* Phone */}
          {hasPhone && (
            <Row icon={Phone} label="Phone">
              <a
                href={`tel:${job.customerPhone}`}
                className="text-rebel-accent font-bold hover:underline"
              >
                {job.customerPhone}
              </a>
            </Row>
          )}

          {/* Pickup */}
          {job.pickupAddress && (
            <Row icon={MapPin} label="Pickup">
              <div className="flex items-start gap-2">
                <span className="flex-1 break-words">{job.pickupAddress}</span>
                <a
                  href={mapsUrl(job.pickupAddress)}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Open pickup in Google Maps"
                  className="shrink-0 inline-flex items-center justify-center h-7 w-7 rounded-md text-rebel-accent hover:bg-rebel-accent-surface"
                >
                  <Navigation className="w-3.5 h-3.5" />
                </a>
              </div>
            </Row>
          )}

          {/* Delivery */}
          {job.deliveryAddress && (
            <Row icon={MapPin} label="Delivery">
              <div className="flex items-start gap-2">
                <span className="flex-1 break-words">{job.deliveryAddress}</span>
                <a
                  href={mapsUrl(job.deliveryAddress)}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Open delivery in Google Maps"
                  className="shrink-0 inline-flex items-center justify-center h-7 w-7 rounded-md text-rebel-accent hover:bg-rebel-accent-surface"
                >
                  <Navigation className="w-3.5 h-3.5" />
                </a>
              </div>
            </Row>
          )}

          {/* Date + truck */}
          <div className="grid grid-cols-2 gap-2">
            {job.date && (
              <Row icon={CalendarIcon} label="Scheduled">
                {format(parseISO(job.date), 'EEE d MMM')}
              </Row>
            )}
            {job.assignedTruck && (
              <Row icon={TruckIcon} label="Truck">
                {job.assignedTruck}
              </Row>
            )}
          </div>

          {/* Driver attribution (set on completion) */}
          {job.completedByDriverName && (
            <Row icon={UserIcon} label="Completed by">
              {job.completedByDriverName}
              {job.completedAt && (
                <span className="text-muted-foreground">
                  {' · '}
                  {format(parseISO(job.completedAt), 'd MMM HH:mm')}
                </span>
              )}
            </Row>
          )}

          {/* Notes — Yamin writes the job description / handling instructions here */}
          {job.notes && (
            <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3 space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-900 inline-flex items-center gap-1">
                <StickyNote className="w-3 h-3" />
                Notes
              </p>
              <p className="text-xs text-amber-900 whitespace-pre-wrap">{job.notes}</p>
            </div>
          )}
        </div>

        {/* Actions — Start run / Mark delivered, mirroring the run-list card */}
        {!isDone && (
          <div className="flex flex-col gap-2 pt-2">
            {canStart && (
              <Button
                onClick={() => onStartRun(job)}
                disabled={starting}
                className="w-full h-12 bg-rebel-accent hover:bg-rebel-accent-hover text-white gap-2 text-[14px] font-bold"
              >
                <Play className="w-4 h-4" />
                {starting ? 'Starting…' : 'Start run'}
              </Button>
            )}
            <Button
              onClick={() => onMarkDelivered(job)}
              variant={canStart ? 'outline' : 'default'}
              className={cn(
                'w-full h-12 gap-2 text-[14px] font-bold',
                !canStart && 'bg-rebel-accent hover:bg-rebel-accent-hover text-white',
              )}
            >
              <PackageCheck className="w-4 h-4" />
              Mark delivered
            </Button>
          </div>
        )}

        {isInDelivery && (
          <div className="flex items-center justify-center gap-2 text-[11px] font-bold uppercase tracking-wider text-rebel-accent bg-rebel-accent-surface rounded-lg py-2 mt-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-rebel-accent opacity-75 animate-rebel-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-rebel-accent" />
            </span>
            On the road
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Row({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Phone;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2 text-xs">
      <Icon className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <div className="text-rebel-text">{children}</div>
      </div>
    </div>
  );
}
