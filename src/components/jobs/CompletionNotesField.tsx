import { Label } from '@/components/ui/label';
import { StickyNote } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const QUICK_PICKS = [
  'Left at door',
  'With neighbour',
  'Signed by recipient',
  'Garage code: ',
  'No-one home',
  'Delivered to reception',
];

interface CompletionNotesFieldProps {
  value: string;
  onChange: (value: string) => void;
  existingNotes?: string;
}

export function CompletionNotesField({ value, onChange, existingNotes }: CompletionNotesFieldProps) {
  const insert = (chip: string) => {
    const next = value.trim().length === 0 ? chip : `${value.trimEnd()} ${chip}`;
    onChange(next);
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs font-semibold flex items-center gap-1.5">
        <StickyNote className="w-3.5 h-3.5" />
        Notes
        <span className="text-[10px] font-normal text-muted-foreground">(optional)</span>
      </Label>

      <div className="flex flex-wrap gap-1.5">
        {QUICK_PICKS.map((chip) => (
          <button
            key={chip}
            type="button"
            onClick={() => insert(chip)}
            className={cn(
              'h-7 px-2.5 rounded-lg text-[11px] font-medium border border-rebel-border bg-card text-rebel-text-secondary hover:bg-rebel-accent-surface hover:text-rebel-accent hover:border-rebel-accent/40 transition-colors',
            )}
          >
            {chip}
          </button>
        ))}
      </div>

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        placeholder="Anything the office should know about this delivery?"
        className="w-full rounded-xl border border-rebel-border bg-card px-3 py-2 text-sm text-rebel-text placeholder:text-muted-foreground/60 focus:border-rebel-accent focus:ring-2 focus:ring-rebel-accent/20 outline-none transition-colors resize-none"
      />

      {existingNotes && existingNotes.trim().length > 0 && (
        <details className="text-[11px] text-muted-foreground">
          <summary className="cursor-pointer hover:text-rebel-text-secondary">
            Show prior notes ({existingNotes.split('\n').filter(Boolean).length} entries)
          </summary>
          <pre className="mt-2 whitespace-pre-wrap rounded-lg bg-muted p-2 font-mono text-[10.5px] leading-relaxed">
            {existingNotes}
          </pre>
        </details>
      )}
    </div>
  );
}

export function appendCompletionNote(existing: string | undefined, newNote: string, author?: string): string {
  const trimmed = newNote.trim();
  if (!trimmed) return existing ?? '';
  const timestamp = format(new Date(), 'yyyy-MM-dd HH:mm');
  const tag = author ? `${timestamp} · ${author}` : timestamp;
  const line = `[${tag}] ${trimmed}`;
  return existing && existing.trim().length > 0 ? `${existing.trimEnd()}\n${line}` : line;
}
