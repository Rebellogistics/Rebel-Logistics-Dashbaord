import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  MessageSquare,
  Eye,
  Save,
  Sparkles,
  Info,
} from 'lucide-react';
import { useSmsTemplates, useSaveSmsTemplate, SmsTemplate } from '@/hooks/useSmsTemplates';
import { renderTemplate, computeSmsSegments } from '@/lib/sms';
import { Customer, Job } from '@/lib/types';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const SAMPLE_CUSTOMER: Partial<Customer> = {
  name: 'Sarah Chen',
  phone: '0412 345 678',
  email: 'sarah@example.com',
};

const SAMPLE_JOB: Partial<Job> = {
  customerName: 'Sarah Chen',
  customerPhone: '0412 345 678',
  pickupAddress: '12 Elgin St, Crows Nest',
  deliveryAddress: '88 Queen St, Manly',
  date: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
  type: 'Standard',
  fee: 280,
  fuelLevy: 12,
  assignedTruck: 'Truck 1',
  hoursEstimated: 1.5,
};

const SAMPLE_OWNER = { name: 'Yamen', businessName: 'Rebel Logistics' };

const VARIABLES: { token: string; description: string }[] = [
  { token: '{{customer.firstName}}', description: 'First word of customer name' },
  { token: '{{customer.fullName}}', description: 'Full name (or company)' },
  { token: '{{customer.phone}}', description: 'Customer phone' },
  { token: '{{job.date}}', description: 'Formatted job date' },
  { token: '{{job.pickup}}', description: 'Pickup address' },
  { token: '{{job.delivery}}', description: 'Delivery address' },
  { token: '{{job.fee}}', description: 'Total fee incl levy' },
  { token: '{{job.truck}}', description: 'Assigned truck' },
  { token: '{{job.eta}}', description: 'Estimated arrival time' },
  { token: '{{job.type}}', description: 'Standard / White Glove / House Move' },
  { token: '{{owner.businessName}}', description: 'Your business name' },
  { token: '{{owner.name}}', description: 'Your name' },
];

export function SmsTemplatesSection() {
  const { data: templates = [], isLoading } = useSmsTemplates();
  const saveTemplate = useSaveSmsTemplate();
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [draftBody, setDraftBody] = useState<string>('');
  const [draftLabel, setDraftLabel] = useState<string>('');

  const active = useMemo(
    () => templates.find((t) => t.key === activeKey) ?? templates[0] ?? null,
    [templates, activeKey],
  );

  // Sync draft when active changes
  const activeKeyResolved = active?.key ?? null;
  if (activeKeyResolved && activeKey !== activeKeyResolved) {
    setActiveKey(activeKeyResolved);
    setDraftBody(active?.body ?? '');
    setDraftLabel(active?.label ?? '');
  }

  const isDirty = active && (draftBody !== active.body || draftLabel !== active.label);
  const isFallback = active?.id.startsWith('fallback-');

  const segments = computeSmsSegments(
    renderTemplate(draftBody, { customer: SAMPLE_CUSTOMER, job: SAMPLE_JOB, owner: SAMPLE_OWNER }),
  );

  const handleSelect = (tpl: SmsTemplate) => {
    setActiveKey(tpl.key);
    setDraftBody(tpl.body);
    setDraftLabel(tpl.label);
  };

  const handleSave = async () => {
    if (!active) return;
    try {
      await saveTemplate.mutateAsync({
        id: active.id,
        key: active.key,
        label: draftLabel.trim() || active.label,
        body: draftBody,
        type: active.type,
        sortOrder: active.sortOrder,
      });
      toast.success(`Template "${draftLabel || active.label}" saved`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save template';
      toast.error(message);
    }
  };

  const insertVariable = (token: string) => {
    setDraftBody((prev) => prev + token);
  };

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading templates…</p>;
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
      {/* Template list */}
      <Card className="border-border shadow-none bg-card h-fit">
        <CardContent className="p-3">
          <p className="px-2 pt-1 pb-2 text-[10px] font-bold uppercase tracking-[0.08em] text-rebel-text-tertiary">
            Templates
          </p>
          <div className="space-y-1">
            {templates.map((tpl) => {
              const isActive = active?.key === tpl.key;
              return (
                <button
                  key={tpl.key}
                  type="button"
                  onClick={() => handleSelect(tpl)}
                  className={cn(
                    'w-full text-left rounded-xl px-2.5 py-2 transition-colors',
                    isActive
                      ? 'bg-rebel-accent-surface text-rebel-text'
                      : 'text-rebel-text-secondary hover:bg-muted hover:text-rebel-text',
                  )}
                >
                  <p className="text-[12.5px] font-semibold truncate">{tpl.label}</p>
                  <p className="text-[10px] text-rebel-text-tertiary uppercase tracking-wider mt-0.5">
                    {tpl.type.replace('_', '-')}
                  </p>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Editor */}
      {active && (
        <Card className="border-border shadow-none bg-card">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-rebel-border">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-rebel-accent-surface flex items-center justify-center">
                  <MessageSquare className="w-4 h-4 text-rebel-accent" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">{active.label}</h3>
                  <p className="text-[11px] text-muted-foreground">
                    {active.type.replace('_', '-')} · key <span className="font-mono">{active.key}</span>
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                className="bg-rebel-accent hover:bg-rebel-accent-hover text-white gap-1.5"
                onClick={handleSave}
                disabled={!isDirty || saveTemplate.isPending}
              >
                <Save className="w-3.5 h-3.5" />
                {saveTemplate.isPending ? 'Saving…' : 'Save'}
              </Button>
            </div>

            {isFallback && (
              <div className="flex items-start gap-2 rounded-xl bg-rebel-warning-surface px-3 py-2.5 text-[11px] text-rebel-warning ring-1 ring-rebel-warning/20">
                <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>
                  This template is a built-in default. Saving it will create a new database row that
                  overrides the default. (Run the <span className="font-mono">phase4_sms_templates</span>{' '}
                  migration if you haven't yet.)
                </span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Label</Label>
              <input
                type="text"
                value={draftLabel}
                onChange={(e) => setDraftLabel(e.target.value)}
                className="w-full h-9 rounded-xl border border-rebel-border bg-card px-3 text-sm text-rebel-text focus:border-rebel-accent focus:ring-2 focus:ring-rebel-accent/20 outline-none transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Message body</Label>
              <textarea
                value={draftBody}
                onChange={(e) => setDraftBody(e.target.value)}
                rows={6}
                className="w-full rounded-xl border border-rebel-border bg-card px-3 py-2 text-sm text-rebel-text font-mono leading-relaxed focus:border-rebel-accent focus:ring-2 focus:ring-rebel-accent/20 outline-none transition-colors resize-none"
              />
              <SegmentMeter
                chars={segments.chars}
                segments={segments.segments}
                encoding={segments.encoding}
                remaining={segments.remaining}
              />
            </div>

            {/* Variable palette */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <Sparkles className="w-3 h-3" />
                Variables — click to insert
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {VARIABLES.map((v) => (
                  <button
                    key={v.token}
                    type="button"
                    onClick={() => insertVariable(v.token)}
                    title={v.description}
                    className="font-mono text-[10.5px] px-2 h-6 rounded-md bg-muted text-rebel-text-secondary hover:bg-rebel-accent-surface hover:text-rebel-accent transition-colors"
                  >
                    {v.token}
                  </button>
                ))}
              </div>
            </div>

            {/* Live preview */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <Eye className="w-3 h-3" />
                Preview · sample customer
              </Label>
              <div className="rounded-xl bg-muted px-3 py-3 text-[12.5px] leading-relaxed whitespace-pre-wrap text-rebel-text">
                {renderTemplate(draftBody, {
                  customer: SAMPLE_CUSTOMER,
                  job: SAMPLE_JOB,
                  owner: SAMPLE_OWNER,
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SegmentMeter({
  chars,
  segments,
  encoding,
  remaining,
}: {
  chars: number;
  segments: number;
  encoding: 'GSM-7' | 'UCS-2';
  remaining: number;
}) {
  return (
    <div className="flex items-center justify-between text-[10.5px] font-mono">
      <span className="text-muted-foreground">
        {chars} chars · {remaining} left in segment
      </span>
      <div className="flex items-center gap-2">
        {encoding === 'UCS-2' && (
          <span className="inline-flex items-center px-1.5 h-4 rounded bg-rebel-warning-surface text-rebel-warning text-[9px] font-bold uppercase tracking-wider">
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
          {segments} {segments === 1 ? 'segment' : 'segments'}
        </span>
      </div>
    </div>
  );
}
