import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { MapPin, Plus, X, Search } from 'lucide-react';
import { useMetroPostcodes, useUpdateMetroPostcodes } from '@/hooks/useMetroPostcodes';
import { useCan } from '@/hooks/useCan';
import { toast } from 'sonner';

/**
 * V7 Phase 2a — the Melbourne metro postcode list, editable.
 *
 * The postcode decides a job's zone outright: on this list is Metro and
 * prices per cubic metre, absent is Regional and prices at the flat minimum.
 * There is no per-job override, which is what makes this list the single
 * lever for service area — moving ten suburbs to regional is ten removals
 * here rather than a code change and a deploy.
 */
export function MetroPostcodesSection() {
  const canEdit = useCan('edit_pricing');
  const { data: metro, isLoading, isError, error, refetch } = useMetroPostcodes();
  const update = useUpdateMetroPostcodes();

  const [adding, setAdding] = useState('');
  const [filter, setFilter] = useState('');

  const sorted = useMemo(
    () => (metro ? [...metro].sort((a, b) => a - b) : []),
    [metro],
  );
  const shown = useMemo(
    () => (filter.trim() ? sorted.filter((p) => String(p).includes(filter.trim())) : sorted),
    [sorted, filter],
  );

  if (isLoading) {
    return <p className="text-xs text-muted-foreground py-8 text-center">Loading postcodes…</p>;
  }

  // Never render the editor without the live list. Showing an empty or partial
  // list here would invite removing postcodes that are in fact still metro.
  if (isError || !metro) {
    return (
      <Card>
        <CardContent className="p-4 space-y-2">
          <p className="text-sm font-semibold text-red-800">Couldn't load the metro postcodes</p>
          <p className="text-xs text-red-800">
            The list stays hidden until it loads, so nothing can be removed by mistake.
          </p>
          {error instanceof Error && (
            <p className="text-[11px] text-red-700/80 font-mono break-words">{error.message}</p>
          )}
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Try again
          </Button>
        </CardContent>
      </Card>
    );
  }

  const parseEntry = (raw: string): number[] => {
    // Accepts "3121", "3121 3122", "3121, 3122" — pasting a list should work.
    const found = raw.match(/\b3\d{3}\b/g) ?? [];
    return [...new Set(found.map(Number))];
  };

  const handleAdd = () => {
    const codes = parseEntry(adding);
    if (!codes.length) {
      toast.error('Enter a Victorian postcode — four digits starting with 3.');
      return;
    }
    const fresh = codes.filter((c) => !metro.has(c));
    if (!fresh.length) {
      toast.info(codes.length === 1 ? `${codes[0]} is already metro.` : 'All of those are already metro.');
      setAdding('');
      return;
    }
    update.mutate(
      { add: fresh },
      {
        onSuccess: () => {
          toast.success(
            fresh.length === 1
              ? `${fresh[0]} now prices as Metro.`
              : `${fresh.length} postcodes now price as Metro.`,
          );
          setAdding('');
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : 'Could not add the postcode.'),
      },
    );
  };

  const handleRemove = (postcode: number) => {
    update.mutate(
      { remove: [postcode] },
      {
        onSuccess: () => toast.success(`${postcode} now prices as Regional.`),
        onError: (e) => toast.error(e instanceof Error ? e.message : 'Could not remove the postcode.'),
      },
    );
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-start gap-2">
            <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
            <div>
              <h3 className="text-sm font-semibold">Melbourne metro postcodes</h3>
              <p className="text-xs text-muted-foreground max-w-prose mt-1">
                A delivery postcode on this list prices as <strong>Metro</strong>, per cubic metre.
                Anything not on it prices as <strong>Regional</strong>, at the flat minimum. This
                decides the zone on its own — there is no override on the job, so this list is the
                only place to change it.
              </p>
            </div>
          </div>
          <Badge variant="secondary" className="shrink-0">
            {sorted.length} metro
          </Badge>
        </div>

        {canEdit && (
          <div className="flex gap-2 flex-wrap">
            <Input
              value={adding}
              onChange={(e) => setAdding(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAdd();
                }
              }}
              placeholder="Add a postcode, or paste several"
              className="w-72"
              inputMode="numeric"
            />
            <Button onClick={handleAdd} disabled={update.isPending} size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Add to metro
            </Button>
          </div>
        )}

        <div className="relative">
          <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Find a postcode"
            className="pl-8 w-56"
            inputMode="numeric"
          />
        </div>

        <div className="flex flex-wrap gap-1.5 max-h-72 overflow-y-auto">
          {shown.map((postcode) => (
            <span
              key={postcode}
              className="inline-flex items-center gap-1 rounded-md border bg-muted/40 pl-2 pr-1 py-0.5 text-xs font-mono tabular-nums"
            >
              {postcode}
              {canEdit && (
                <button
                  type="button"
                  onClick={() => handleRemove(postcode)}
                  disabled={update.isPending}
                  aria-label={`Remove ${postcode} from metro`}
                  className="rounded p-0.5 text-muted-foreground hover:text-red-600 hover:bg-red-50 disabled:opacity-40"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </span>
          ))}
          {!shown.length && (
            <p className="text-xs text-muted-foreground py-2">
              No postcode here matches “{filter}”. It would price as Regional.
            </p>
          )}
        </div>

        <p className="text-[11px] text-muted-foreground border-t pt-3">
          The list reaches further out than “metro” suggests — Berwick (3806), Langwarrin (3910)
          and the Cranbourne group (3975–3978) are all metro, while Sorrento (3943) is not. Judge
          by the number, not by how far the suburb feels.
        </p>
      </CardContent>
    </Card>
  );
}
