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
import { Job } from '@/lib/types';
import {
  MapPin,
  Truck,
  Calendar,
  DollarSign,
  Phone,
  StickyNote,
  PenLine,
  Camera,
  ImageOff,
  AlertCircle,
  MessageSquare,
  Activity,
  Copy,
  Printer,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { JobPhotoGallery } from './JobPhotoGallery';
import { supabase } from '@/lib/supabase';
import { StatusPill } from '@/components/ui/status-pill';
import { SendSmsDialog } from '@/components/sms/SendSmsDialog';
import { JobActivityTimeline } from './JobActivityTimeline';
import { NewQuoteDialog } from './NewQuoteDialog';
import { PrintReceipt } from './PrintReceipt';

interface JobDetailDialogProps {
  job: Job | null;
  onClose: () => void;
}

function looksLikeSignaturePath(jobId: string, value: string | null | undefined): boolean {
  if (!value) return false;
  return value.startsWith(`${jobId}/`) && /\.(png|jpg|jpeg|webp)$/i.test(value);
}

export function JobDetailDialog({ job, onClose }: JobDetailDialogProps) {
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
  const [signatureError, setSignatureError] = useState(false);
  const [sendSmsOpen, setSendSmsOpen] = useState(false);
  const [rebookOpen, setRebookOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setSignatureError(false);
    setSignatureUrl(null);

    if (!job || !job.signature || !looksLikeSignaturePath(job.id, job.signature)) {
      return;
    }

    (async () => {
      try {
        const { data } = await supabase.storage
          .from('job-proofs')
          .createSignedUrl(job.signature!, 600);
        if (!cancelled) setSignatureUrl(data?.signedUrl ?? null);
      } catch {
        if (!cancelled) setSignatureError(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [job]);

  if (!job) return null;

  const total = job.fee + (job.fuelLevy ?? 0);
  const hasSignaturePath = looksLikeSignaturePath(job.id, job.signature);
  const legacySignatureText =
    job.signature && !hasSignaturePath ? job.signature : null;

  return (
    <Dialog open={!!job} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <DialogTitle className="flex items-center gap-2">
                <span className="truncate">{job.customerName}</span>
                <StatusPill status={job.status} size="sm" />
              </DialogTitle>
              <DialogDescription className="text-xs">{job.id}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="grid gap-4 py-2 max-h-[65vh] overflow-y-auto pr-1">
          <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <DetailRow icon={MapPin} label="Pickup">
              {job.pickupAddress || '—'}
            </DetailRow>
            <DetailRow icon={MapPin} label="Delivery">
              {job.deliveryAddress || '—'}
            </DetailRow>
            <DetailRow icon={Truck} label="Truck">
              {job.assignedTruck ?? '—'}
            </DetailRow>
            <DetailRow icon={Calendar} label="Date">
              {job.date ? format(parseISO(job.date), 'd MMM yyyy') : '—'}
            </DetailRow>
            <DetailRow icon={Phone} label="Phone">
              {job.customerPhone ? (
                <a href={`tel:${job.customerPhone}`} className="text-rebel-accent hover:underline">
                  {job.customerPhone}
                </a>
              ) : (
                '—'
              )}
            </DetailRow>
            <DetailRow icon={DollarSign} label="Total">
              ${total.toFixed(2)}
              {job.fuelLevy && job.fuelLevy > 0 ? (
                <span className="text-[10px] text-muted-foreground ml-1">
                  (incl ${job.fuelLevy.toFixed(2)} levy)
                </span>
              ) : null}
            </DetailRow>
          </section>

          {job.notes && (
            <section className="space-y-1">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <StickyNote className="w-3 h-3" />
                Notes
              </h3>
              <p className="text-xs whitespace-pre-wrap bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-900">
                {job.notes}
              </p>
            </section>
          )}

          <section className="space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="w-3 h-3" />
              Activity
            </h3>
            <div className="rounded-xl border border-rebel-border bg-card p-3">
              <JobActivityTimeline job={job} />
            </div>
          </section>

          <section className="space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Camera className="w-3 h-3" />
              Proof photos
            </h3>
            <JobPhotoGallery jobId={job.id} />
          </section>

          <section className="space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <PenLine className="w-3 h-3" />
              Customer signature
            </h3>
            {hasSignaturePath && signatureUrl && (
              <div className="border rounded-lg bg-muted p-2 flex items-center justify-center">
                <img
                  src={signatureUrl}
                  alt="Customer signature"
                  className="max-h-32 w-auto object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
            )}
            {hasSignaturePath && !signatureUrl && !signatureError && (
              <div className="flex items-center gap-2 py-3 text-xs text-muted-foreground justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-rebel-accent"></div>
                Loading signature…
              </div>
            )}
            {hasSignaturePath && signatureError && (
              <div className="border border-red-200 rounded-lg bg-red-50 p-3 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <p className="text-xs text-red-800">Couldn't load the signature preview.</p>
              </div>
            )}
            {legacySignatureText && (
              <div className="border rounded-lg bg-amber-50 border-amber-200 p-3">
                <p className="text-[10px] text-amber-900 font-semibold uppercase tracking-wider">
                  Legacy typed signature
                </p>
                <p className="text-sm text-amber-900 mt-0.5">{legacySignatureText}</p>
              </div>
            )}
            {!job.signature && (
              <div className="flex flex-col items-center gap-2 py-4 text-xs text-muted-foreground">
                <ImageOff className="w-5 h-5 text-muted-foreground/40" />
                No signature on file.
              </div>
            )}
          </section>
        </div>

        <DialogFooter className="justify-between sm:justify-between gap-2">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="gap-1.5"
              onClick={() => setSendSmsOpen(true)}
              disabled={!job.customerPhone?.trim()}
              title={job.customerPhone ? undefined : 'No phone number on file'}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Send SMS
            </Button>
            <Button
              variant="outline"
              className="gap-1.5"
              onClick={() => setRebookOpen(true)}
              title="Create a new quote prefilled from this job"
            >
              <Copy className="w-3.5 h-3.5" />
              Rebook
            </Button>
            <Button
              variant="outline"
              className="gap-1.5"
              onClick={() => window.print()}
              title="Print or save as PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              Print
            </Button>
          </div>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
        <PrintReceipt job={job} />
      </DialogContent>
      <SendSmsDialog
        open={sendSmsOpen}
        onClose={() => setSendSmsOpen(false)}
        job={job}
      />
      <NewQuoteDialog
        open={rebookOpen}
        onOpenChange={(open) => {
          setRebookOpen(open);
          if (!open) onClose();
        }}
        prefillJob={rebookOpen ? job : null}
      />
    </Dialog>
  );
}

function DetailRow({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof MapPin;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
        <p className="text-sm font-medium truncate">{children}</p>
      </div>
    </div>
  );
}
