import { useEffect, useState, type ReactNode } from 'react';
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
import { Label } from '@/components/ui/label';
import { useCreateJob } from '@/hooks/useSupabaseData';
import { useRepeatCustomerLookup, type RepeatCustomerInfo } from '@/hooks/useRepeatCustomer';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { JobType } from '@/lib/types';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Sparkles, Mic, MicOff, Plus } from 'lucide-react';

interface QuickQuoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const initial = {
  customerName: '',
  customerPhone: '',
  type: 'Standard' as JobType,
  notes: '',
};

/**
 * One-thumb quote-add for mobile. Saves an enquiry as a draft Quote so Yamin
 * can finish the rest from desktop later — name, phone, job type, voice
 * notes, that's it.
 */
export function QuickQuoteDialog({ open, onOpenChange }: QuickQuoteDialogProps) {
  const [form, setForm] = useState(initial);
  const [nameTouched, setNameTouched] = useState(false);
  const createJob = useCreateJob();

  const { info: repeatInfo } = useRepeatCustomerLookup(form.customerPhone);

  const voice = useVoiceInput((transcript) => {
    setForm((prev) => ({ ...prev, notes: transcript }));
  });

  useEffect(() => {
    if (!open) {
      setForm(initial);
      setNameTouched(false);
      voice.stop();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (repeatInfo.found && repeatInfo.customerName && !nameTouched && !form.customerName) {
      setForm((prev) => ({ ...prev, customerName: repeatInfo.customerName! }));
    }
  }, [repeatInfo, nameTouched, form.customerName]);

  const update = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const canSubmit =
    form.customerName.trim() && form.customerPhone.trim() && !createJob.isPending;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    try {
      await createJob.mutateAsync({
        id: `RL-${Date.now().toString(36).toUpperCase()}`,
        customerName: form.customerName.trim(),
        customerPhone: form.customerPhone.trim(),
        pickupAddress: '',
        deliveryAddress: '',
        type: form.type,
        status: 'Quote',
        date: format(new Date(), 'yyyy-MM-dd'),
        fee: 0,
        fuelLevy: 0,
        isDraft: true,
        notes: form.notes.trim() || undefined,
      } as any);
      toast.success('Saved — finish from desktop');
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error('Failed to save');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="inline-flex w-7 h-7 items-center justify-center rounded-lg bg-rebel-accent text-white">
              <Plus className="w-4 h-4" />
            </span>
            Quick quote
          </DialogTitle>
          <DialogDescription>
            Capture the bare minimum now — finish addresses + pricing later from your desk.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-2">
          <Field label="Customer name">
            <Input
              value={form.customerName}
              onChange={(e) => {
                setNameTouched(true);
                update('customerName', e.target.value);
              }}
              placeholder="Jane Smith"
              className="h-11"
              autoComplete="name"
            />
          </Field>

          <Field label="Phone">
            <Input
              type="tel"
              value={form.customerPhone}
              onChange={(e) => update('customerPhone', e.target.value)}
              placeholder="04xx xxx xxx"
              className="h-11"
              autoComplete="tel"
            />
          </Field>

          <RepeatCustomerBanner info={repeatInfo} />

          <Field label="Job type">
            <select
              value={form.type}
              onChange={(e) => update('type', e.target.value as JobType)}
              className="h-11 w-full rounded-lg border border-input bg-card px-3 text-sm outline-none focus-visible:border-ring"
            >
              <option value="Standard">Standard</option>
              <option value="White Glove">White Glove</option>
              <option value="House Move">House Move (hourly)</option>
            </select>
          </Field>

          <Field
            label="Notes"
            action={
              voice.supported ? (
                <button
                  type="button"
                  onClick={() => (voice.listening ? voice.stop() : voice.start())}
                  className={`inline-flex items-center gap-1 px-2 h-7 rounded-md text-[11px] font-semibold transition-colors ${
                    voice.listening
                      ? 'bg-red-500 text-white'
                      : 'bg-rebel-accent-surface text-rebel-accent hover:bg-rebel-accent hover:text-white'
                  }`}
                  aria-label={voice.listening ? 'Stop listening' : 'Dictate notes'}
                >
                  {voice.listening ? (
                    <>
                      <MicOff className="w-3 h-3" />
                      Stop
                    </>
                  ) : (
                    <>
                      <Mic className="w-3 h-3" />
                      Dictate
                    </>
                  )}
                </button>
              ) : null
            }
          >
            <textarea
              value={form.notes}
              onChange={(e) => update('notes', e.target.value)}
              placeholder="What's the job? Speak it if you're driving."
              rows={3}
              className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm outline-none focus-visible:border-ring"
            />
            {voice.listening && (
              <p className="text-[11px] text-red-600 font-semibold inline-flex items-center gap-1.5 mt-1">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                Listening… tap Stop when you're done.
              </p>
            )}
          </Field>
        </div>

        <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
          <Button variant="outline" className="h-11 sm:h-9" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="h-11 sm:h-9 bg-rebel-accent hover:bg-rebel-accent-hover text-white"
            disabled={!canSubmit}
            onClick={handleSubmit}
          >
            {createJob.isPending ? 'Saving…' : 'Save as draft'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  action,
  children,
}: {
  label: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold text-foreground">{label}</Label>
        {action}
      </div>
      {children}
    </div>
  );
}

function RepeatCustomerBanner({ info }: { info: RepeatCustomerInfo }) {
  if (!info.found) return null;
  const name = info.customerName ?? 'there';
  const count = info.jobCount ?? 0;
  return (
    <div className="rounded-lg bg-rebel-accent-surface border border-rebel-accent/30 p-2.5 flex items-start gap-2">
      <div className="w-7 h-7 rounded-full bg-rebel-accent-surface flex items-center justify-center shrink-0">
        <Sparkles className="w-3.5 h-3.5 text-rebel-accent" />
      </div>
      <p className="text-xs font-semibold text-rebel-accent">
        Repeat customer — {name} · {count} previous booking{count === 1 ? '' : 's'}
      </p>
    </div>
  );
}
