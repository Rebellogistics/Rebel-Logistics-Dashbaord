import { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Upload,
  Download,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileSpreadsheet,
  HardDrive,
  ArrowRight,
  ArrowLeft,
  Plus,
  Merge,
  CircleSlash,
  ListChecks,
} from 'lucide-react';
import {
  useCreateCustomer,
  useUpdateCustomer,
  useCustomers,
} from '@/hooks/useSupabaseData';
import { useStorageUsage } from '@/hooks/useStorageUsage';
import { parseCsv } from '@/lib/csv';
import {
  SYSTEM_FIELDS,
  autoMap,
  buildPreview,
  makeBatchTag,
  type SystemField,
  type PreviewRow,
  type RawRow,
  type RowDecision,
} from '@/lib/customerImport';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const SAMPLE_CSV = `name,phone,email,company,type,source,vip,notes
Sarah Chen,0412 345 678,sarah@example.com,,individual,referral,true,Garage code 4421
Acme Removals,0298 765 432,ops@acme.au,Acme Removals,company,b2b,false,Net-30 invoicing
`;

const MAPPING_STORAGE_KEY = 'rebel.import.lastMapping.v1';

interface SavedMapping {
  headers: string[];
  mapping: Partial<Record<SystemField, string>>;
}

type WizardStep = 'upload' | 'map' | 'preview' | 'done';

// ─────────────────────────────────────────────────────────────────────
// Storage usage card (unchanged from prior version)
// ─────────────────────────────────────────────────────────────────────

function StorageUsageCard() {
  const { data, isLoading, error } = useStorageUsage();

  if (error) {
    return (
      <Card className="border-rebel-border bg-card shadow-card">
        <CardContent className="p-5 flex items-start gap-3 text-xs text-muted-foreground">
          <HardDrive className="w-4 h-4 mt-0.5 shrink-0" />
          <p>Couldn't estimate storage usage — check your connection and try again.</p>
        </CardContent>
      </Card>
    );
  }

  const pct = data?.pct ?? 0;
  const warning = pct >= 80;
  const critical = pct >= 95;
  const barColor = critical
    ? 'bg-rebel-danger'
    : warning
      ? 'bg-rebel-warning'
      : 'bg-rebel-accent';

  return (
    <Card className="border-rebel-border bg-card shadow-card">
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rebel-accent-surface flex items-center justify-center shrink-0">
            <HardDrive className="w-5 h-5 text-rebel-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-sm text-rebel-text">Photo storage</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Estimated usage on the Supabase free tier (500 MB). Rough: ~1.5 MB per photo.
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[13px] font-bold tabular-nums text-rebel-text">
              {isLoading ? '…' : `${(data?.estimatedMb ?? 0).toFixed(0)} / ${data?.quotaMb ?? 500} MB`}
            </p>
            <p className="text-[10px] text-muted-foreground tabular-nums">
              {isLoading ? '' : `${data?.photoCount ?? 0} photos · ${data?.signatureCount ?? 0} sigs`}
            </p>
          </div>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className={cn('h-full transition-all', barColor)}
            style={{ width: `${Math.max(2, pct)}%` }}
          />
        </div>
        {warning && (
          <div className="flex items-start gap-2 rounded-xl bg-rebel-warning-surface px-3 py-2 text-[11px] text-rebel-warning ring-1 ring-rebel-warning/20">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>
              {critical
                ? 'Storage almost full — new photos may fail. Back up and clear old proofs.'
                : 'Over 80% of the free-tier quota used. Consider exporting and cleaning up older job photos.'}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Import wizard
// ─────────────────────────────────────────────────────────────────────

export function CustomerImportSection() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<WizardStep>('upload');
  const [fileName, setFileName] = useState('');
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<RawRow[]>([]);
  const [mapping, setMapping] = useState<Partial<Record<SystemField, string>>>({});
  const [firstNameHeader, setFirstNameHeader] = useState<string>('');
  const [lastNameHeader, setLastNameHeader] = useState<string>('');
  const [batchPrefix, setBatchPrefix] = useState<string>('xero');
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, failed: 0, merged: 0, skipped: 0 });

  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();
  const { data: existingCustomers = [] } = useCustomers();

  const previewRows: PreviewRow[] = useMemo(() => {
    if (rawRows.length === 0) return [];
    return buildPreview(rawRows, {
      mapping,
      firstNameHeader: firstNameHeader || undefined,
      lastNameHeader: lastNameHeader || undefined,
      existingCustomers,
    });
  }, [rawRows, mapping, firstNameHeader, lastNameHeader, existingCustomers]);

  const [decisions, setDecisions] = useState<Record<number, RowDecision>>({});

  // Whenever previewRows is rebuilt, seed decisions from default
  useEffect(() => {
    setDecisions((prev) => {
      const next: Record<number, RowDecision> = {};
      for (const r of previewRows) {
        next[r.rowNumber] = prev[r.rowNumber] ?? r.decision;
      }
      return next;
    });
  }, [previewRows]);

  const counts = useMemo(() => {
    let create = 0;
    let merge = 0;
    let skip = 0;
    for (const r of previewRows) {
      const d = decisions[r.rowNumber] ?? r.decision;
      if (r.errors.length > 0) {
        skip += 1;
        continue;
      }
      if (d === 'create') create += 1;
      else if (d === 'merge') merge += 1;
      else skip += 1;
    }
    return { create, merge, skip };
  }, [previewRows, decisions]);

  const handleFile = async (file: File) => {
    setFileName(file.name);
    try {
      const text = await file.text();
      const rows = parseCsv(text);
      if (rows.length < 2) {
        toast.error('That CSV is empty or has no data rows');
        return;
      }
      const headers = rows[0].map((h) => h.trim());
      const data: RawRow[] = rows.slice(1).map((cells, idx) => {
        const obj: Record<string, string> = {};
        headers.forEach((h, i) => {
          obj[h] = (cells[i] ?? '').trim();
        });
        return { rowNumber: idx + 2, values: obj };
      });
      setRawHeaders(headers);
      setRawRows(data);

      // Auto-map. Reuse the previous mapping if the user is re-importing the
      // same shape of file (same headers in the same order).
      const auto = autoMap(headers);
      try {
        const saved = JSON.parse(localStorage.getItem(MAPPING_STORAGE_KEY) ?? 'null') as SavedMapping | null;
        if (saved && saved.headers.length === headers.length && saved.headers.every((h, i) => h === headers[i])) {
          setMapping(saved.mapping);
        } else {
          setMapping(auto);
        }
      } catch {
        setMapping(auto);
      }

      // Detect first/last name pair if there's no full-name column
      const lower = headers.map((h) => h.toLowerCase());
      const fnIdx = lower.findIndex((h) => h === 'first name' || h === 'firstname');
      const lnIdx = lower.findIndex((h) => h === 'last name' || h === 'lastname');
      setFirstNameHeader(fnIdx >= 0 ? headers[fnIdx] : '');
      setLastNameHeader(lnIdx >= 0 ? headers[lnIdx] : '');

      setStep('map');
    } catch (err) {
      console.error(err);
      toast.error('Failed to read CSV file');
    }
  };

  const handleConfirmMapping = () => {
    if (!mapping.name && !firstNameHeader) {
      toast.error('Pick which CSV column holds the customer name (or map First+Last name).');
      return;
    }
    if (!mapping.phone && !mapping.email) {
      toast.error('Pick a Phone or Email column — at least one is required.');
      return;
    }
    try {
      localStorage.setItem(
        MAPPING_STORAGE_KEY,
        JSON.stringify({ headers: rawHeaders, mapping } satisfies SavedMapping),
      );
    } catch {
      /* localStorage unavailable — fine */
    }
    setStep('preview');
  };

  const handleImport = async () => {
    const todo = previewRows.filter((r) => {
      const d = decisions[r.rowNumber] ?? r.decision;
      return r.errors.length === 0 && (d === 'create' || d === 'merge');
    });
    if (todo.length === 0) {
      toast.error('Nothing to import — every row is set to skip.');
      return;
    }
    if (!confirm(`Import ${todo.length} ${todo.length === 1 ? 'customer' : 'customers'}? Skipped rows will not be touched.`)) {
      return;
    }

    setImporting(true);
    let done = 0;
    let merged = 0;
    let failed = 0;
    let skipped = previewRows.length - todo.length;
    const batchTag = makeBatchTag(batchPrefix || 'import', format(new Date(), 'yyyy-MM-dd'), 1);
    const toastId = toast.loading(`Importing 0 of ${todo.length}…`);

    for (const row of todo) {
      const d = decisions[row.rowNumber] ?? row.decision;
      try {
        if (d === 'merge' && row.matchedCustomerId) {
          // Patch only the fields the import provides — don't blow away existing data.
          const patch = {
            id: row.matchedCustomerId,
            ...row.payload,
            importBatch: batchTag,
          };
          await updateCustomer.mutateAsync(patch as any);
          merged += 1;
        } else {
          const newId = `C-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 9999)}`;
          await createCustomer.mutateAsync({
            id: newId,
            ...row.payload,
            importBatch: batchTag,
          } as any);
          done += 1;
        }
      } catch (err) {
        console.warn('Import row failed', err, row);
        failed += 1;
      }
      setProgress({ done, failed, merged, skipped });
      toast.loading(`Importing ${done + merged + failed} of ${todo.length}…`, { id: toastId });
    }

    setImporting(false);

    const totalSuccess = done + merged;
    if (failed === 0) {
      toast.success(
        `${totalSuccess} customers ${merged > 0 ? `(${done} new, ${merged} merged)` : 'imported'}`,
        { id: toastId },
      );
    } else if (totalSuccess === 0) {
      toast.error(`All ${failed} rows failed`, { id: toastId });
    } else {
      toast.warning(
        `${totalSuccess} succeeded (${done} new, ${merged} merged), ${failed} failed`,
        { id: toastId },
      );
    }
    setStep('done');
  };

  const downloadSample = () => {
    const blob = new Blob([SAMPLE_CSV], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rebel-customers-sample.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    setStep('upload');
    setFileName('');
    setRawHeaders([]);
    setRawRows([]);
    setMapping({});
    setFirstNameHeader('');
    setLastNameHeader('');
    setProgress({ done: 0, failed: 0, merged: 0, skipped: 0 });
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="space-y-4">
      <StorageUsageCard />

      {/* Step header */}
      <Card className="border-rebel-border bg-card shadow-card">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-rebel-accent-surface flex items-center justify-center shrink-0">
              <FileSpreadsheet className="w-5 h-5 text-rebel-accent" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-sm text-rebel-text">Import customers from CSV</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Three steps: upload your file → map your columns to ours → review and import. Works with any CSV — Xero exports, MYOB, plain spreadsheets.
              </p>
            </div>
            <StepIndicator step={step} />
          </div>

          {step === 'upload' && (
            <UploadStep
              fileRef={fileRef}
              fileName={fileName}
              onPick={handleFile}
              onSample={downloadSample}
            />
          )}

          {step === 'map' && (
            <MapStep
              headers={rawHeaders}
              rowCount={rawRows.length}
              fileName={fileName}
              mapping={mapping}
              setMapping={setMapping}
              firstNameHeader={firstNameHeader}
              setFirstNameHeader={setFirstNameHeader}
              lastNameHeader={lastNameHeader}
              setLastNameHeader={setLastNameHeader}
              previewSample={rawRows[0]}
              onBack={handleReset}
              onConfirm={handleConfirmMapping}
            />
          )}

          {step === 'preview' && (
            <PreviewStep
              previewRows={previewRows}
              decisions={decisions}
              setDecisions={setDecisions}
              counts={counts}
              batchPrefix={batchPrefix}
              setBatchPrefix={setBatchPrefix}
              importing={importing}
              progress={progress}
              total={previewRows.length}
              onBack={() => setStep('map')}
              onImport={handleImport}
            />
          )}

          {step === 'done' && (
            <DoneStep progress={progress} onReset={handleReset} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Step: Upload
// ─────────────────────────────────────────────────────────────────────

function UploadStep({
  fileRef,
  fileName,
  onPick,
  onSample,
}: {
  fileRef: React.RefObject<HTMLInputElement | null>;
  fileName: string;
  onPick: (file: File) => void;
  onSample: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onPick(file);
          }}
        />
        <Button
          onClick={() => fileRef.current?.click()}
          className="bg-rebel-accent hover:bg-rebel-accent-hover text-white gap-1.5"
        >
          <Upload className="w-3.5 h-3.5" />
          Choose CSV file
        </Button>
        <Button variant="outline" className="gap-1.5" onClick={onSample}>
          <Download className="w-3.5 h-3.5" />
          Download sample
        </Button>
        {fileName && (
          <span className="text-[11px] text-muted-foreground font-mono truncate">{fileName}</span>
        )}
      </div>
      <p className="text-[10.5px] text-muted-foreground">
        On a Mac: open in Numbers → File → Export → CSV. On Excel: File → Save As → CSV UTF-8.
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Step: Map
// ─────────────────────────────────────────────────────────────────────

function MapStep({
  headers,
  rowCount,
  fileName,
  mapping,
  setMapping,
  firstNameHeader,
  setFirstNameHeader,
  lastNameHeader,
  setLastNameHeader,
  previewSample,
  onBack,
  onConfirm,
}: {
  headers: string[];
  rowCount: number;
  fileName: string;
  mapping: Partial<Record<SystemField, string>>;
  setMapping: React.Dispatch<React.SetStateAction<Partial<Record<SystemField, string>>>>;
  firstNameHeader: string;
  setFirstNameHeader: (v: string) => void;
  lastNameHeader: string;
  setLastNameHeader: (v: string) => void;
  previewSample?: RawRow;
  onBack: () => void;
  onConfirm: () => void;
}) {
  const setField = (field: SystemField, value: string) => {
    setMapping((m) => {
      const next = { ...m };
      if (value) next[field] = value;
      else delete next[field];
      return next;
    });
  };

  return (
    <div className="space-y-3">
      <div className="rounded-xl bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground inline-flex items-center gap-2">
        <ListChecks className="w-3.5 h-3.5 shrink-0" />
        Mapped {Object.keys(mapping).length} of {SYSTEM_FIELDS.length} fields automatically · {rowCount} data rows in {fileName}
      </div>

      <div className="rounded-xl border border-rebel-border overflow-hidden">
        <table className="w-full text-[12px]">
          <thead className="bg-muted text-rebel-text-tertiary uppercase tracking-wider text-[9.5px] font-bold">
            <tr>
              <th className="text-left px-3 py-2">Rebel field</th>
              <th className="text-left px-3 py-2">Your CSV column</th>
              <th className="text-left px-3 py-2">Sample value</th>
            </tr>
          </thead>
          <tbody>
            {SYSTEM_FIELDS.map((f) => {
              const selected = mapping[f.key] ?? '';
              const sample = selected ? previewSample?.values[selected] ?? '' : '';
              return (
                <tr key={f.key} className="border-t border-rebel-border">
                  <td className="px-3 py-2 align-top w-[28%]">
                    <p className="font-semibold text-rebel-text inline-flex items-center gap-1.5">
                      {f.label}
                      {f.required && <span className="text-rebel-danger">*</span>}
                    </p>
                    {f.hint && <p className="text-[10px] text-muted-foreground mt-0.5">{f.hint}</p>}
                  </td>
                  <td className="px-3 py-2 align-top w-[36%]">
                    <select
                      value={selected}
                      onChange={(e) => setField(f.key, e.target.value)}
                      className="h-8 w-full rounded-lg border border-input bg-card px-2 text-xs"
                    >
                      <option value="">— Skip —</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2 align-top">
                    <span className="text-[11px] text-muted-foreground font-mono truncate block max-w-[220px]">
                      {sample || <span className="italic">—</span>}
                    </span>
                  </td>
                </tr>
              );
            })}

            {/* First / last name pair — only if name isn't mapped or to override */}
            <tr className="border-t border-rebel-border bg-muted/20">
              <td className="px-3 py-2 align-top">
                <p className="font-semibold text-rebel-text">First + Last name</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Optional. If your CSV splits the name across two columns, map both here. Concatenated into <span className="font-mono">name</span> when no full-name column is mapped.
                </p>
              </td>
              <td className="px-3 py-2 align-top" colSpan={2}>
                <div className="flex gap-2">
                  <select
                    value={firstNameHeader}
                    onChange={(e) => setFirstNameHeader(e.target.value)}
                    className="h-8 flex-1 rounded-lg border border-input bg-card px-2 text-xs"
                  >
                    <option value="">— First name —</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                  <select
                    value={lastNameHeader}
                    onChange={(e) => setLastNameHeader(e.target.value)}
                    className="h-8 flex-1 rounded-lg border border-input bg-card px-2 text-xs"
                  >
                    <option value="">— Last name —</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between gap-2">
        <Button variant="outline" onClick={onBack} className="gap-1.5">
          <ArrowLeft className="w-3.5 h-3.5" />
          Back
        </Button>
        <Button
          onClick={onConfirm}
          className="bg-rebel-accent hover:bg-rebel-accent-hover text-white gap-1.5"
        >
          Preview rows
          <ArrowRight className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Step: Preview
// ─────────────────────────────────────────────────────────────────────

function PreviewStep({
  previewRows,
  decisions,
  setDecisions,
  counts,
  batchPrefix,
  setBatchPrefix,
  importing,
  progress,
  total,
  onBack,
  onImport,
}: {
  previewRows: PreviewRow[];
  decisions: Record<number, RowDecision>;
  setDecisions: React.Dispatch<React.SetStateAction<Record<number, RowDecision>>>;
  counts: { create: number; merge: number; skip: number };
  batchPrefix: string;
  setBatchPrefix: (v: string) => void;
  importing: boolean;
  progress: { done: number; failed: number; merged: number; skipped: number };
  total: number;
  onBack: () => void;
  onImport: () => void;
}) {
  const setDecision = (rowNumber: number, d: RowDecision) =>
    setDecisions((prev) => ({ ...prev, [rowNumber]: d }));

  const errored = previewRows.filter((r) => r.errors.length > 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="secondary" className="bg-rebel-success-surface text-rebel-success border-none gap-1">
          <Plus className="w-3 h-3" />
          {counts.create} new
        </Badge>
        <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-none gap-1">
          <Merge className="w-3 h-3" />
          {counts.merge} merged
        </Badge>
        <Badge variant="secondary" className="bg-muted text-muted-foreground border-none gap-1">
          <CircleSlash className="w-3 h-3" />
          {counts.skip} skipped
        </Badge>
        <div className="flex items-center gap-1.5 ml-auto">
          <label className="text-[10.5px] text-muted-foreground" htmlFor="batch-prefix">
            Tag:
          </label>
          <input
            id="batch-prefix"
            value={batchPrefix}
            onChange={(e) => setBatchPrefix(e.target.value)}
            className="h-7 w-32 rounded-md border border-input bg-card px-2 text-[11px] font-mono"
            placeholder="xero"
          />
        </div>
      </div>

      <div className="rounded-xl border border-rebel-border overflow-hidden">
        <div className="max-h-[420px] overflow-y-auto">
          <table className="w-full text-[11.5px]">
            <thead className="bg-muted text-rebel-text-tertiary uppercase tracking-wider text-[9px] font-bold sticky top-0">
              <tr>
                <th className="text-left px-3 py-2 w-12">#</th>
                <th className="text-left px-3 py-2">Customer</th>
                <th className="text-left px-3 py-2">Phone / Email</th>
                <th className="text-left px-3 py-2 w-32">Action</th>
              </tr>
            </thead>
            <tbody>
              {previewRows.map((row) => {
                const d = decisions[row.rowNumber] ?? row.decision;
                const errored = row.errors.length > 0;
                return (
                  <tr
                    key={row.rowNumber}
                    className={cn(
                      'border-t border-rebel-border',
                      errored ? 'bg-rebel-danger-surface/30' : '',
                    )}
                  >
                    <td className="px-3 py-2 font-mono text-[10px] text-muted-foreground align-top">
                      {row.rowNumber}
                    </td>
                    <td className="px-3 py-2 align-top">
                      <p className="font-semibold text-rebel-text truncate">
                        {row.payload.name || <span className="italic text-muted-foreground">—</span>}
                      </p>
                      {row.payload.companyName && row.payload.companyName !== row.payload.name && (
                        <p className="text-[10px] text-muted-foreground truncate">
                          {row.payload.companyName}
                        </p>
                      )}
                      {row.matchReason && !errored && (
                        <p className="text-[10px] text-amber-700 mt-0.5 truncate">
                          ⓘ {row.matchReason}
                        </p>
                      )}
                      {errored && (
                        <p className="text-[10px] text-rebel-danger mt-0.5 inline-flex items-center gap-1">
                          <XCircle className="w-2.5 h-2.5" />
                          {row.errors.join(' · ')}
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-2 font-mono text-rebel-text-secondary align-top">
                      {row.payload.phone || row.payload.email || '—'}
                    </td>
                    <td className="px-3 py-2 align-top">
                      {errored ? (
                        <Badge variant="secondary" className="bg-muted text-muted-foreground border-none">
                          Skip
                        </Badge>
                      ) : (
                        <select
                          value={d}
                          onChange={(e) => setDecision(row.rowNumber, e.target.value as RowDecision)}
                          className="h-7 rounded-md border border-input bg-card px-2 text-[11px]"
                          disabled={importing}
                        >
                          <option value="create">Create new</option>
                          {row.matchedCustomerId && <option value="merge">Merge into existing</option>}
                          <option value="skip">Skip</option>
                        </select>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {errored.length > 0 && (
        <div className="flex items-start gap-2 rounded-xl bg-rebel-warning-surface px-3 py-2.5 text-[11px] text-rebel-warning ring-1 ring-rebel-warning/20">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>
            {errored.length} row{errored.length === 1 ? '' : 's'} can't be imported (missing required fields). Fix in your CSV and re-upload to retry.
          </span>
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <Button variant="outline" onClick={onBack} className="gap-1.5" disabled={importing}>
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to mapping
        </Button>
        <Button
          onClick={onImport}
          className="bg-rebel-accent hover:bg-rebel-accent-hover text-white gap-1.5"
          disabled={importing || counts.create + counts.merge === 0}
        >
          <Upload className="w-3.5 h-3.5" />
          {importing
            ? `Importing ${progress.done + progress.merged + progress.failed} of ${total}…`
            : `Import ${counts.create + counts.merge} customer${counts.create + counts.merge === 1 ? '' : 's'}`}
        </Button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Step: Done
// ─────────────────────────────────────────────────────────────────────

function DoneStep({
  progress,
  onReset,
}: {
  progress: { done: number; failed: number; merged: number; skipped: number };
  onReset: () => void;
}) {
  return (
    <div className="rounded-xl bg-rebel-success-surface/40 border border-rebel-success/30 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <CheckCircle2 className="w-5 h-5 text-rebel-success" />
        <p className="font-bold text-sm">Import complete</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
        <Stat label="Created" value={progress.done} tone="green" />
        <Stat label="Merged" value={progress.merged} tone="amber" />
        <Stat label="Skipped" value={progress.skipped} tone="gray" />
        <Stat label="Failed" value={progress.failed} tone={progress.failed > 0 ? 'red' : 'gray'} />
      </div>
      <Button variant="outline" onClick={onReset} className="gap-1.5">
        <Upload className="w-3.5 h-3.5" />
        Import another file
      </Button>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: 'green' | 'amber' | 'red' | 'gray' }) {
  const cls =
    tone === 'green'
      ? 'bg-rebel-success-surface text-rebel-success'
      : tone === 'amber'
        ? 'bg-amber-100 text-amber-800'
        : tone === 'red'
          ? 'bg-rebel-danger-surface text-rebel-danger'
          : 'bg-muted text-muted-foreground';
  return (
    <div className={cn('rounded-lg p-2.5', cls)}>
      <p className="font-bold tabular-nums text-base">{value}</p>
      <p className="font-semibold text-[10px] uppercase tracking-wider opacity-80">{label}</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Step indicator
// ─────────────────────────────────────────────────────────────────────

function StepIndicator({ step }: { step: WizardStep }) {
  const idx = step === 'upload' ? 0 : step === 'map' ? 1 : step === 'preview' ? 2 : 3;
  const labels = ['Upload', 'Map', 'Preview', 'Done'];
  return (
    <div className="hidden sm:flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground shrink-0">
      {labels.map((l, i) => (
        <span
          key={l}
          className={cn(
            'inline-flex items-center justify-center min-w-5 h-5 px-2 rounded-full',
            i === idx
              ? 'bg-rebel-accent text-white'
              : i < idx
                ? 'bg-rebel-accent-surface text-rebel-accent'
                : 'bg-muted text-muted-foreground',
          )}
        >
          {i + 1}. {l}
        </span>
      ))}
    </div>
  );
}
