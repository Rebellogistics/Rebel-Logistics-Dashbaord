import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SmsLogEntry, SmsType, SmsStatus } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import {
  MessageSquare,
  Send,
  Inbox,
  Plus,
  ArrowDown,
  Check,
  Reply,
} from 'lucide-react';
import { SendSmsDialog } from './SendSmsDialog';
import { EmptyState } from '@/components/ui/empty-state';
import { useMarkSmsRead } from '@/hooks/useSms';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface SmsLogViewProps {
  entries: SmsLogEntry[];
  isLoading?: boolean;
  /** V4 3.5: tap "Open job" on an inbound row to land in the job dialog. */
  onOpenJob?: (jobId: string) => void;
}

const typeLabels: Record<SmsType, string> = {
  day_prior: 'Day-prior',
  en_route: 'En-route',
  auto_reply: 'Auto-reply',
  other: 'Other',
};

const typeStyles: Record<SmsType, string> = {
  day_prior: 'bg-indigo-100 text-indigo-700',
  en_route: 'bg-rebel-accent-surface text-rebel-accent',
  auto_reply: 'bg-amber-100 text-amber-800',
  other: 'bg-muted text-muted-foreground',
};

const statusStyles: Record<SmsStatus, string> = {
  sent: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
  pending: 'bg-amber-100 text-amber-700',
};

type Tab = 'all' | 'replies';

export function SmsLogView({ entries, isLoading, onOpenJob }: SmsLogViewProps) {
  const [composeOpen, setComposeOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('all');
  const markRead = useMarkSmsRead();

  // V4 3.3: split inbound from the rest. Inbound rows that haven't been
  // read drive the notification bell badge (via useAlerts) so we surface
  // them here as their own tab + an unread count.
  const { inbound, unreadInbound } = useMemo(() => {
    const inb: SmsLogEntry[] = [];
    const unread: SmsLogEntry[] = [];
    for (const e of entries) {
      if (e.direction !== 'inbound') continue;
      inb.push(e);
      if (!e.readAt) unread.push(e);
    }
    return { inbound: inb, unreadInbound: unread };
  }, [entries]);

  const visible = tab === 'replies' ? inbound : entries;

  const handleMarkAllRead = async () => {
    if (unreadInbound.length === 0) return;
    try {
      await markRead.mutateAsync(unreadInbound.map((e) => e.id));
      toast.success(`Marked ${unreadInbound.length} reply${unreadInbound.length === 1 ? '' : 'ies'} as read`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to mark as read');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-rebel-border border-t-rebel-accent mx-auto mb-3" />
          <p className="text-xs text-muted-foreground">Loading SMS log…</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Card className="border-border shadow-none bg-card">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-rebel-border pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-rebel-accent-surface flex items-center justify-center">
                <MessageSquare className="w-4 h-4 text-rebel-accent" />
              </div>
              <div>
                <h3 className="font-bold text-sm">SMS Log</h3>
                <p className="text-[11px] text-muted-foreground">Most recent 200 messages</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                className="bg-rebel-accent hover:bg-rebel-accent-hover text-white gap-1.5 h-8 px-3 rounded-lg text-[11px] font-semibold"
                onClick={() => setComposeOpen(true)}
              >
                <Plus className="w-3 h-3" />
                New SMS
              </Button>
            </div>
          </div>

          {/* V4 3.3: tab toggle. Replies tab carries an unread badge so
              Yamin can see at a glance how many customers texted back. */}
          <div className="flex items-center gap-2 flex-wrap">
            <TabButton
              active={tab === 'all'}
              onClick={() => setTab('all')}
              count={entries.length}
            >
              All
            </TabButton>
            <TabButton
              active={tab === 'replies'}
              onClick={() => setTab('replies')}
              count={inbound.length}
              unread={unreadInbound.length}
              icon={Reply}
            >
              Replies
            </TabButton>
            {tab === 'replies' && unreadInbound.length > 0 && (
              <Button
                size="xs"
                variant="outline"
                className="ml-auto gap-1"
                onClick={handleMarkAllRead}
                disabled={markRead.isPending}
              >
                <Check className="w-3 h-3" />
                {markRead.isPending ? 'Marking…' : 'Mark all read'}
              </Button>
            )}
          </div>

          {visible.length === 0 ? (
            tab === 'replies' ? (
              <EmptyState
                icon={Reply}
                tone="accent"
                title="No replies yet"
                description="When a customer texts back to one of your day-prior or en-route SMS, the message will land here."
              />
            ) : (
              <EmptyState
                icon={Inbox}
                tone="accent"
                title="No SMS sent yet"
                description="Day-prior reminders, en-route updates, and custom messages will appear here after you send them."
                actionLabel="Compose new SMS"
                onAction={() => setComposeOpen(true)}
              />
            )
          ) : (
            <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
              {visible.map((entry) => (
                <SmsLogRow key={entry.id} entry={entry} onOpenJob={onOpenJob} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      <SendSmsDialog open={composeOpen} onClose={() => setComposeOpen(false)} />
    </>
  );
}

function TabButton({
  active,
  onClick,
  count,
  unread,
  children,
  icon: Icon,
}: {
  active: boolean;
  onClick: () => void;
  count: number;
  unread?: number;
  children: React.ReactNode;
  icon?: typeof Reply;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[11px] font-semibold transition-colors',
        active
          ? 'bg-rebel-accent-surface text-rebel-accent'
          : 'bg-card border border-rebel-border text-rebel-text-secondary hover:bg-muted',
      )}
    >
      {Icon && <Icon className="w-3 h-3" />}
      <span>{children}</span>
      <span
        className={cn(
          'inline-flex items-center justify-center min-w-[1rem] h-4 px-1 rounded text-[10px] font-bold',
          active ? 'bg-rebel-accent text-white' : 'bg-muted text-muted-foreground',
        )}
      >
        {count}
      </span>
      {unread !== undefined && unread > 0 && (
        <span
          className="inline-flex items-center justify-center min-w-[1rem] h-4 px-1 rounded text-[10px] font-bold bg-rebel-accent text-white"
          title={`${unread} unread`}
        >
          {unread} new
        </span>
      )}
    </button>
  );
}

// V4 3.5: light keyword scan for "is the customer asking to reschedule?"
// Doesn't try to extract a date — just hints to Yamin that this reply is
// likely a booking-change request and surfaces the Reschedule action.
const RESCHEDULE_HINT = /\b(reschedule|change|cancel|cant|can't|cannot|tomorrow|next week|monday|tuesday|wednesday|thursday|friday|saturday|sunday|push)\b/i;

function SmsLogRow({
  entry,
  onOpenJob,
}: {
  entry: SmsLogEntry;
  onOpenJob?: (jobId: string) => void;
}) {
  const isInbound = entry.direction === 'inbound';
  const unread = isInbound && !entry.readAt;
  const looksLikeReschedule = isInbound && RESCHEDULE_HINT.test(entry.messageBody);
  const sentAt = (() => {
    try {
      return format(parseISO(entry.sentAt), 'd MMM yyyy · HH:mm');
    } catch {
      return entry.sentAt;
    }
  })();

  return (
    <div
      className={cn(
        'rounded-lg border p-3 space-y-2',
        isInbound
          ? unread
            ? 'border-rebel-accent/60 bg-rebel-accent-surface/15'
            : 'border-indigo-200 bg-indigo-50/30'
          : 'bg-card',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {isInbound && (
              <span
                className="inline-flex items-center gap-1 h-4 px-1.5 rounded-md bg-rebel-accent text-white text-[9px] font-bold uppercase tracking-wider"
                title="Customer texted back"
              >
                <ArrowDown className="w-2.5 h-2.5" />
                Reply
              </span>
            )}
            <p className="text-xs font-semibold truncate">{entry.recipientName}</p>
            <span className="text-[10px] text-muted-foreground">{entry.recipientPhone}</span>
            {unread && (
              <span className="inline-flex items-center h-4 px-1.5 rounded-md bg-rebel-accent text-white text-[9px] font-bold uppercase tracking-wider">
                New
              </span>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground">{sentAt}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span
            className={`inline-flex items-center gap-1 rounded-md text-[10px] px-1.5 py-0.5 font-medium ${typeStyles[entry.type]}`}
          >
            {isInbound ? <ArrowDown className="w-2.5 h-2.5" /> : <Send className="w-2.5 h-2.5" />}
            {typeLabels[entry.type]}
          </span>
          {!isInbound && (
            <span
              className={`inline-flex items-center rounded-md text-[10px] px-1.5 py-0.5 font-medium ${statusStyles[entry.status]}`}
            >
              {entry.status}
            </span>
          )}
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground leading-relaxed whitespace-pre-wrap">{entry.messageBody}</p>
      {entry.errorMessage && (
        <p className="text-[10px] text-red-600 font-medium">Error: {entry.errorMessage}</p>
      )}
      {/* V4 3.5: jump-to-job button on inbound rows. When the message
          looks like a reschedule request the button gets a "Reschedule"
          label and an amber tint. Otherwise plain "Open job". */}
      {isInbound && entry.jobId && onOpenJob && (
        <div className="flex justify-end">
          <Button
            size="xs"
            variant="outline"
            className={cn(
              'gap-1',
              looksLikeReschedule &&
                'border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100',
            )}
            onClick={() => onOpenJob(entry.jobId!)}
          >
            {looksLikeReschedule ? 'Open & reschedule' : 'Open job'}
          </Button>
        </div>
      )}
    </div>
  );
}
