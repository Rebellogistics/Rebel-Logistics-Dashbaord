import { useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Customer, Job } from '@/lib/types';
import { Pencil, Trash2, Star, Phone, Mail, Briefcase, ChevronRight, MessageSquare } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { JobDetailDialog } from '@/components/jobs/JobDetailDialog';
import { StatusPill } from '@/components/ui/status-pill';
import { CustomerAvatar } from '@/components/customers/CustomerAvatar';
import { SendSmsDialog } from '@/components/sms/SendSmsDialog';

interface CustomerDetailDialogProps {
  customer: Customer | null;
  jobs: Job[];
  onClose: () => void;
  onEdit: (customer: Customer) => void;
  onDelete: (customer: Customer) => void;
}

export function CustomerDetailDialog({
  customer,
  jobs,
  onClose,
  onEdit,
  onDelete,
}: CustomerDetailDialogProps) {
  const [viewJob, setViewJob] = useState<Job | null>(null);
  const [sendSmsOpen, setSendSmsOpen] = useState(false);

  const customerJobs = useMemo(() => {
    if (!customer) return [];
    return jobs
      .filter((j) => j.customerId === customer.id)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [customer, jobs]);

  const totals = useMemo(() => {
    const billable = customerJobs.filter(
      (j) => j.status !== 'Quote' && j.status !== 'Declined'
    );
    return {
      jobCount: billable.length,
      revenue: billable.reduce((sum, j) => sum + j.fee + (j.fuelLevy ?? 0), 0),
      outstandingQuotes: customerJobs.filter((j) => j.status === 'Quote').length,
    };
  }, [customerJobs]);

  if (!customer) return null;

  const displayName =
    customer.type === 'company' && customer.companyName
      ? `${customer.companyName} (${customer.name})`
      : customer.name;

  return (
    <Dialog open={!!customer} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <CustomerAvatar customer={customer} size="lg" />
              <div className="min-w-0">
                <DialogTitle className="flex items-center gap-2">
                  <span className="truncate">{displayName}</span>
                  {customer.vip && (
                    <Badge className="bg-amber-100 text-amber-800 border-none">
                      <Star className="w-3 h-3 mr-1" />
                      VIP
                    </Badge>
                  )}
                </DialogTitle>
                <DialogDescription className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                  <span className="capitalize">{customer.type}</span>
                  {customer.source && <span>· via {customer.source}</span>}
                  {customer.createdAt && (
                    <span>· since {format(parseISO(customer.createdAt), 'MMM yyyy')}</span>
                  )}
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="grid gap-4 py-2 max-h-[60vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-3 gap-3">
            <StatCell label="Billable jobs" value={totals.jobCount.toString()} />
            <StatCell label="Revenue" value={`$${totals.revenue.toFixed(0)}`} />
            <StatCell label="Open quotes" value={totals.outstandingQuotes.toString()} />
          </div>

          <section className="space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Contact
            </h3>
            <div className="space-y-1.5">
              {customer.phone && (
                <DetailRow icon={Phone}>
                  <a href={`tel:${customer.phone}`} className="hover:underline">
                    {customer.phone}
                  </a>
                </DetailRow>
              )}
              {customer.email && (
                <DetailRow icon={Mail}>
                  <a href={`mailto:${customer.email}`} className="hover:underline">
                    {customer.email}
                  </a>
                </DetailRow>
              )}
              {customer.type === 'company' && customer.abn && (
                <DetailRow icon={Briefcase}>
                  <span>ABN {customer.abn}</span>
                </DetailRow>
              )}
              {!customer.phone && !customer.email && (
                <p className="text-xs text-muted-foreground">No contact details on file.</p>
              )}
            </div>
          </section>

          {customer.notes && (
            <section className="space-y-2">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Notes
              </h3>
              <p className="text-xs text-muted-foreground whitespace-pre-wrap bg-muted rounded-lg p-3">
                {customer.notes}
              </p>
            </section>
          )}

          <section className="space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Job history ({customerJobs.length})
            </h3>
            {customerJobs.length === 0 ? (
              <p className="text-xs text-muted-foreground py-3 text-center">
                No jobs linked to this customer yet.
              </p>
            ) : (
              <div className="space-y-1 max-h-60 overflow-y-auto">
                {customerJobs.map((job) => (
                  <button
                    key={job.id}
                    type="button"
                    onClick={() => setViewJob(job)}
                    className="w-full flex items-center justify-between gap-2 py-2 border-b last:border-b-0 text-left hover:bg-muted rounded px-1 -mx-1 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <StatusPill status={job.status} size="xs" />
                        <span className="text-[10px] text-muted-foreground">{job.date}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                        {job.pickupAddress} → {job.deliveryAddress}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-xs font-semibold">
                        ${(job.fee + (job.fuelLevy ?? 0)).toFixed(2)}
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>

        <DialogFooter className="justify-between gap-2 sm:justify-between">
          <Button
            variant="ghost"
            className="gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={() => onDelete(customer)}
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="gap-1.5"
              onClick={() => setSendSmsOpen(true)}
              disabled={!customer.phone?.trim()}
              title={customer.phone ? undefined : 'No phone number on file'}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Send SMS
            </Button>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button
              className="bg-rebel-accent hover:bg-rebel-accent-hover text-white gap-1"
              onClick={() => onEdit(customer)}
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
      <JobDetailDialog job={viewJob} onClose={() => setViewJob(null)} />
      <SendSmsDialog
        open={sendSmsOpen}
        onClose={() => setSendSmsOpen(false)}
        customer={customer}
      />
    </Dialog>
  );
}

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-muted rounded-lg p-3 text-center">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="text-lg font-bold mt-0.5">{value}</p>
    </div>
  );
}

function DetailRow({
  icon: Icon,
  children,
}: {
  icon: typeof Phone;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
      <span>{children}</span>
    </div>
  );
}
