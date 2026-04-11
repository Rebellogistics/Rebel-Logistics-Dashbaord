import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SmsLogEntry, SmsType, SmsStatus } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { MessageSquare, Send, Inbox, Plus } from 'lucide-react';
import { SendSmsDialog } from './SendSmsDialog';
import { EmptyState } from '@/components/ui/empty-state';

interface SmsLogViewProps {
  entries: SmsLogEntry[];
  isLoading?: boolean;
}

const typeLabels: Record<SmsType, string> = {
  day_prior: 'Day-prior',
  en_route: 'En-route',
  other: 'Other',
};

const typeStyles: Record<SmsType, string> = {
  day_prior: 'bg-indigo-100 text-indigo-700',
  en_route: 'bg-rebel-accent-surface text-rebel-accent',
  other: 'bg-muted text-muted-foreground',
};

const statusStyles: Record<SmsStatus, string> = {
  sent: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
  pending: 'bg-amber-100 text-amber-700',
};

export function SmsLogView({ entries, isLoading }: SmsLogViewProps) {
  const [composeOpen, setComposeOpen] = useState(false);

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
              <p className="text-[11px] text-muted-foreground">
                Most recent 200 messages
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-muted text-muted-foreground border-none">
              {entries.length}
            </Badge>
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

        {entries.length === 0 ? (
          <EmptyState
            icon={Inbox}
            tone="accent"
            title="No SMS sent yet"
            description="Day-prior reminders, en-route updates, and custom messages will appear here after you send them."
            actionLabel="Compose new SMS"
            onAction={() => setComposeOpen(true)}
          />
        ) : (
          <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
            {entries.map((entry) => (
              <SmsLogRow key={entry.id} entry={entry} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
    <SendSmsDialog open={composeOpen} onClose={() => setComposeOpen(false)} />
    </>
  );
}

function SmsLogRow({ entry }: { entry: SmsLogEntry }) {
  const sentAt = (() => {
    try {
      return format(parseISO(entry.sentAt), 'd MMM yyyy · HH:mm');
    } catch {
      return entry.sentAt;
    }
  })();

  return (
    <div className="rounded-lg border p-3 space-y-2 bg-card">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-xs font-semibold truncate">{entry.recipientName}</p>
            <span className="text-[10px] text-muted-foreground">{entry.recipientPhone}</span>
          </div>
          <p className="text-[10px] text-muted-foreground">{sentAt}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span
            className={`inline-flex items-center gap-1 rounded-md text-[10px] px-1.5 py-0.5 font-medium ${typeStyles[entry.type]}`}
          >
            <Send className="w-2.5 h-2.5" />
            {typeLabels[entry.type]}
          </span>
          <span
            className={`inline-flex items-center rounded-md text-[10px] px-1.5 py-0.5 font-medium ${statusStyles[entry.status]}`}
          >
            {entry.status}
          </span>
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground leading-relaxed">{entry.messageBody}</p>
      {entry.errorMessage && (
        <p className="text-[10px] text-red-600 font-medium">Error: {entry.errorMessage}</p>
      )}
    </div>
  );
}
