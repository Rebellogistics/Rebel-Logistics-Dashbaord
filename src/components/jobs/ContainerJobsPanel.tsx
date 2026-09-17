import { useMemo } from 'react';
import { Link2, Package } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatAud, jobTotalIncGst } from '@/lib/pricing';
import type { Job } from '@/lib/types';

/**
 * What came out of this container, and how it invoices.
 *
 * A container unload and the jobs off it are separate jobs and separate
 * invoices. Yamin's rule: not every unload leads to a delivery — the
 * container may be unloaded and invoiced weeks before the client confirms
 * where anything is going — and storage only applies when asked for. So:
 *
 *   Invoice 1  the unload, always on its own
 *   Invoice 2  every delivery off it, whatever mix of standard, white glove
 *              and hourly, on one invoice
 *   Invoice 3  anything held in storage, billed separately because it
 *              recurs monthly while a delivery is one-off
 *
 * This panel shows that split against the jobs as they actually stand, so
 * the totals are what was really charged rather than a fresh recompute.
 */
export function ContainerJobsPanel({
  container,
  linked,
  onOpenJob,
}: {
  container: Job;
  /** Every job whose containerJobId is this container. */
  linked: Job[];
  onOpenJob?: (job: Job) => void;
}) {
  const { deliveries, held, unloadTotal, deliveriesTotal, heldTotal } = useMemo(() => {
    const deliveries = linked.filter((j) => j.type !== 'Storage');
    const held = linked.filter((j) => j.type === 'Storage');
    const sum = (list: Job[]) => list.reduce((t, j) => t + jobTotalIncGst(j), 0);
    return {
      deliveries,
      held,
      unloadTotal: jobTotalIncGst(container),
      deliveriesTotal: sum(deliveries),
      heldTotal: sum(held),
    };
  }, [linked, container]);

  // Numbered as they will be invoiced: the unload is always first, and the
  // other two appear only if there is anything on them.
  let n = 1;
  const invoices: { label: string; total: number; jobs: Job[] }[] = [
    { label: `Invoice ${n} — container unload`, total: unloadTotal, jobs: [] },
  ];
  if (deliveries.length) {
    invoices.push({
      label: `Invoice ${++n} — deliveries out of the container`,
      total: deliveriesTotal,
      jobs: deliveries,
    });
  }
  if (held.length) {
    invoices.push({ label: `Invoice ${++n} — storage`, total: heldTotal, jobs: held });
  }

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Package className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold">Out of this container</span>
        </div>
        <Badge variant="secondary" className="text-[10px]">
          {linked.length === 0
            ? 'nothing booked out yet'
            : `${linked.length} job${linked.length === 1 ? '' : 's'}`}
        </Badge>
      </div>

      {linked.length === 0 && (
        <p className="text-[11px] text-muted-foreground">
          The unload stands alone and invoices on its own. Link a delivery to this container from
          that job, whenever the client confirms where things are going.
        </p>
      )}

      <div className="space-y-2">
        {invoices.map((inv) => (
          <div key={inv.label} className="rounded-md border border-border/70 bg-card p-2">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                {inv.label}
              </span>
              <span className="text-xs font-semibold tabular-nums">{formatAud(inv.total)}</span>
            </div>
            {inv.jobs.map((j) => (
              <button
                key={j.id}
                type="button"
                onClick={() => onOpenJob?.(j)}
                disabled={!onOpenJob}
                className="mt-1.5 w-full flex items-baseline justify-between gap-2 text-left rounded px-1 py-0.5 hover:bg-muted disabled:hover:bg-transparent disabled:cursor-default"
              >
                <span className="text-[11px] text-muted-foreground truncate">
                  <span className="font-medium text-foreground">{j.type}</span>
                  {j.deliveryAddress ? ` · ${j.deliveryAddress}` : ''}
                  {j.quoteNumber ? ` · ${j.quoteNumber}` : ''}
                </span>
                <span className="text-[11px] tabular-nums shrink-0">
                  {formatAud(jobTotalIncGst(j))}
                </span>
              </button>
            ))}
          </div>
        ))}
      </div>

      {invoices.length > 1 && (
        <div className="flex items-baseline justify-between gap-2 border-t border-border pt-2">
          <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
            <Link2 className="w-3 h-3" />
            Across {invoices.length} invoices
          </span>
          <span className="text-xs font-bold tabular-nums">
            {formatAud(unloadTotal + deliveriesTotal + heldTotal)}
          </span>
        </div>
      )}
    </div>
  );
}
