import { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Job, Customer } from '@/lib/types';
import { Send, Sparkles, MessageSquareText, Eye, AlertTriangle } from 'lucide-react';
import { useSendCustomSms } from '@/hooks/useSms';
import { useSmsTemplates, SmsTemplate } from '@/hooks/useSmsTemplates';
import { useProfile } from '@/hooks/useProfile';
import { renderTemplate, computeSmsSegments } from '@/lib/sms';
import { CustomerAvatar } from '@/components/customers/CustomerAvatar';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface SendSmsDialogProps {
  open: boolean;
  onClose: () => void;
  job?: Job | null;
  customer?: Customer | null;
  /** Pre-select a template by key on open */
  defaultTemplateKey?: string;
}

const CUSTOM_KEY = '__custom__';

export function SendSmsDialog({ open, onClose, job, customer, defaultTemplateKey }: SendSmsDialogProps) {
  const { data: templates = [] } = useSmsTemplates();
  const { data: profile } = useProfile();
  const sendCustom = useSendCustomSms();

  // The recipient: customer takes precedence, otherwise pull from job
  const recipientName =
    customer?.companyName || customer?.name || job?.customerName || '';
  const recipientPhone = customer?.phone || job?.customerPhone || '';
  const fallbackCustomer = customer ?? (job ? makeCustomerFromJob(job) : null);

  const [selectedKey, setSelectedKey] = useState<string>(defaultTemplateKey ?? CUSTOM_KEY);
  const [body, setBody] = useState<string>('');
  const [touched, setTouched] = useState(false);

  const owner = useMemo(
    () => ({ name: profile?.fullName, businessName: 'Rebel Logistics' }),
    [profile?.fullName],
  );

  // When the dialog opens or selection changes, render the chosen template body.
  useEffect(() => {
    if (!open) {
      setTouched(false);
      return;
    }
    if (selectedKey === CUSTOM_KEY) {
      if (!touched) setBody('');
      return;
    }
    const tpl = templates.find((t) => t.key === selectedKey);
    if (!tpl) return;
    const rendered = renderTemplate(tpl.body, { customer: fallbackCustomer, job, owner });
    setBody(rendered);
    setTouched(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, selectedKey, templates.length]);

  // Initial template selection when opening
  useEffect(() => {
    if (!open) return;
    if (defaultTemplateKey) {
      setSelectedKey(defaultTemplateKey);
    } else if (templates.length > 0) {
      // Prefer 'follow_up' if present, else first
      const preferred = templates.find((t) => t.key === 'follow_up') ?? templates[0];
      setSelectedKey(preferred.key);
    } else {
      setSelectedKey(CUSTOM_KEY);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultTemplateKey, templates.length]);

  const segments = computeSmsSegments(body);
  const charLimit = segments.encoding === 'GSM-7' ? 160 : 70;

  const canSend = body.trim().length > 0 && recipientPhone.trim().length > 0 && !sendCustom.isPending;

  const handleSend = async () => {
    try {
      const tpl = templates.find((t) => t.key === selectedKey);
      const type = tpl?.type ?? 'other';
      await sendCustom.mutateAsync({
        to: recipientPhone,
        recipientName,
        body,
        jobId: job?.id ?? null,
        type,
      });
      toast.success(`SMS sent to ${recipientName || recipientPhone}`);
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send';
      toast.error(message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquareText className="w-4 h-4 text-rebel-accent" />
            Send SMS
          </DialogTitle>
          <DialogDescription>
            {recipientName ? `To ${recipientName}` : 'Compose a custom message'}
            {recipientPhone && <span className="font-mono ml-1">· {recipientPhone}</span>}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2 max-h-[65vh] overflow-y-auto pr-1">
          {/* Recipient strip */}
          {fallbackCustomer && (
            <div className="flex items-center gap-3 rounded-xl bg-muted px-3 py-2.5">
              <CustomerAvatar customer={fallbackCustomer} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-semibold truncate">{recipientName}</p>
                <p className="text-[10.5px] font-mono text-muted-foreground truncate">
                  {recipientPhone || 'no phone on file'}
                </p>
              </div>
            </div>
          )}

          {/* Template picker */}
          <div className="space-y-1.5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-rebel-text-tertiary">
              Template
            </p>
            <div className="flex flex-wrap gap-1.5">
              <TemplateChip
                active={selectedKey === CUSTOM_KEY}
                onClick={() => {
                  setSelectedKey(CUSTOM_KEY);
                  setTouched(true);
                }}
              >
                <Sparkles className="w-3 h-3" />
                Custom
              </TemplateChip>
              {templates.map((tpl) => (
                <TemplateChip
                  key={tpl.key}
                  active={selectedKey === tpl.key}
                  onClick={() => setSelectedKey(tpl.key)}
                >
                  {tpl.label}
                </TemplateChip>
              ))}
            </div>
          </div>

          {/* Body */}
          <div className="space-y-1.5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-rebel-text-tertiary">
              Message
            </p>
            <textarea
              value={body}
              onChange={(e) => {
                setBody(e.target.value);
                setTouched(true);
              }}
              rows={6}
              placeholder="Type your message…"
              className="w-full rounded-xl border border-rebel-border bg-card px-3 py-2 text-sm text-rebel-text placeholder:text-muted-foreground/60 focus:border-rebel-accent focus:ring-2 focus:ring-rebel-accent/20 outline-none transition-colors resize-none font-mono leading-relaxed"
            />
            <SegmentMeter chars={segments.chars} segments={segments.segments} encoding={segments.encoding} remaining={segments.remaining} charLimit={charLimit} />
          </div>

          {/* Live preview when there are unrendered tokens */}
          {body.includes('{{') && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-rebel-text-tertiary flex items-center gap-1.5">
                <Eye className="w-3 h-3" />
                Preview
              </p>
              <div className="rounded-xl bg-muted px-3 py-2.5 text-[12px] leading-relaxed whitespace-pre-wrap text-rebel-text">
                {renderTemplate(body, { customer: fallbackCustomer, job, owner })}
              </div>
            </div>
          )}

          {!recipientPhone && (
            <div className="flex items-start gap-2 rounded-xl bg-rebel-warning-surface px-3 py-2.5 text-[11.5px] text-rebel-warning ring-1 ring-rebel-warning/20">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>No phone number on file for this recipient. Add one before sending.</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="bg-rebel-accent hover:bg-rebel-accent-hover text-white gap-1.5"
            disabled={!canSend}
            onClick={handleSend}
          >
            <Send className="w-3.5 h-3.5" />
            {sendCustom.isPending ? 'Sending…' : 'Send SMS'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TemplateChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[11px] font-semibold border transition-colors',
        active
          ? 'bg-rebel-accent text-white border-rebel-accent'
          : 'bg-card text-rebel-text-secondary border-rebel-border hover:bg-rebel-accent-surface hover:text-rebel-accent hover:border-rebel-accent/40',
      )}
    >
      {children}
    </button>
  );
}

function SegmentMeter({
  chars,
  segments,
  encoding,
  remaining,
  charLimit,
}: {
  chars: number;
  segments: number;
  encoding: 'GSM-7' | 'UCS-2';
  remaining: number;
  charLimit: number;
}) {
  const isUcs2 = encoding === 'UCS-2';
  return (
    <div className="flex items-center justify-between text-[10.5px] font-mono">
      <span className="text-muted-foreground">
        {chars} chars · {remaining} left in segment
      </span>
      <div className="flex items-center gap-2">
        {isUcs2 && (
          <span
            className="inline-flex items-center gap-1 px-1.5 h-4 rounded bg-rebel-warning-surface text-rebel-warning text-[9px] font-bold uppercase tracking-wider"
            title="Non-GSM characters detected — segments are 70 chars instead of 160"
          >
            UCS-2
          </span>
        )}
        <span
          className={cn(
            'inline-flex items-center px-1.5 h-4 rounded text-[9px] font-bold uppercase tracking-wider',
            segments === 1
              ? 'bg-rebel-success-surface text-rebel-success'
              : segments <= 3
                ? 'bg-rebel-accent-surface text-rebel-accent'
                : 'bg-rebel-warning-surface text-rebel-warning',
          )}
        >
          {segments} {segments === 1 ? 'segment' : 'segments'} · {charLimit}/seg
        </span>
      </div>
    </div>
  );
}

function makeCustomerFromJob(job: Job): Partial<Customer> & { id: string; name: string; vip: boolean } {
  return {
    id: job.id,
    name: job.customerName,
    phone: job.customerPhone,
    vip: false,
  };
}
