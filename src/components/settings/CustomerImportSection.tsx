import { useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Upload,
  Download,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileSpreadsheet,
  HardDrive,
} from 'lucide-react';
import { useCreateCustomer } from '@/hooks/useSupabaseData';
import { useStorageUsage } from '@/hooks/useStorageUsage';
import { Customer } from '@/lib/types';
import { parseCsv, csvToRecords } from '@/lib/csv';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ParsedCustomer {
  rowIndex: number;
  payload: Omit<Customer, 'id' | 'createdAt'>;
  errors: string[];
}

const SAMPLE_CSV = `name,phone,email,company,type,source,vip,notes
Sarah Chen,0412 345 678,sarah@example.com,,individual,referral,true,Garage code 4421
Acme Removals,0298 765 432,ops@acme.au,Acme Removals,company,b2b,false,Net-30 invoicing
`;

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

export function CustomerImportSection() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [parsed, setParsed] = useState<ParsedCustomer[] | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, failed: 0 });
  const createCustomer = useCreateCustomer();

  const validRows = parsed?.filter((r) => r.errors.length === 0) ?? [];
  const invalidRows = parsed?.filter((r) => r.errors.length > 0) ?? [];

  const handleFile = async (file: File) => {
    setFileName(file.name);
    try {
      const text = await file.text();
      const rows = parseCsv(text);
      const records = csvToRecords(rows);
      const mapped: ParsedCustomer[] = records.map((rec, idx) => {
        const errors: string[] = [];
        const name = (rec.name || rec.full_name || rec.customer || '').trim();
        if (!name) errors.push('missing name');
        const phone = (rec.phone || rec.mobile || rec.tel || '').trim();
        const email = (rec.email || '').trim();
        if (!phone && !email) errors.push('need at least phone or email');
        const type = (rec.type || 'individual').toLowerCase();
        const safeType = type === 'company' ? 'company' : 'individual';
        const vipRaw = (rec.vip || '').trim().toLowerCase();
        const vip = vipRaw === 'true' || vipRaw === '1' || vipRaw === 'yes' || vipRaw === 'y';
        return {
          rowIndex: idx + 2, // +2 because header is row 1
          errors,
          payload: {
            name,
            phone: phone || undefined,
            email: email || undefined,
            type: safeType,
            companyName: (rec.company || rec.company_name || '').trim() || undefined,
            source: (rec.source || '').trim() || undefined,
            notes: (rec.notes || '').trim() || undefined,
            vip,
            totalJobs: 0,
            totalSpent: 0,
          },
        };
      });
      setParsed(mapped);
      setProgress({ done: 0, failed: 0 });
    } catch (err) {
      console.error(err);
      toast.error('Failed to read CSV file');
    }
  };

  const handleImport = async () => {
    if (!parsed || validRows.length === 0) return;
    if (
      !confirm(
        `Import ${validRows.length} ${validRows.length === 1 ? 'customer' : 'customers'}? Rows with errors will be skipped.`,
      )
    ) {
      return;
    }
    setImporting(true);
    let done = 0;
    let failed = 0;
    const toastId = toast.loading(`Importing 0 of ${validRows.length}…`);
    for (const row of validRows) {
      try {
        await createCustomer.mutateAsync(row.payload);
        done += 1;
      } catch (err) {
        console.warn('CSV row import failed', err, row);
        failed += 1;
      }
      setProgress({ done, failed });
      toast.loading(`Importing ${done + failed} of ${validRows.length}…`, { id: toastId });
    }
    setImporting(false);
    if (failed === 0) {
      toast.success(`Imported ${done} customers`, { id: toastId });
    } else if (done === 0) {
      toast.error(`All ${failed} rows failed`, { id: toastId });
    } else {
      toast.warning(`${done} imported, ${failed} failed`, { id: toastId });
    }
    if (failed === 0) {
      setParsed(null);
      setFileName('');
    }
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
    setParsed(null);
    setFileName('');
    setProgress({ done: 0, failed: 0 });
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="space-y-4">
      <StorageUsageCard />
      <Card className="border-rebel-border bg-card shadow-card">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rebel-accent-surface flex items-center justify-center shrink-0">
              <FileSpreadsheet className="w-5 h-5 text-rebel-accent" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-rebel-text">Import customers from CSV</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Required column: <span className="font-mono">name</span>. Plus at least one of{' '}
                <span className="font-mono">phone</span> or <span className="font-mono">email</span>. Optional:{' '}
                <span className="font-mono">company</span>, <span className="font-mono">type</span>,{' '}
                <span className="font-mono">source</span>, <span className="font-mono">vip</span>,{' '}
                <span className="font-mono">notes</span>.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
            <Button
              onClick={() => fileRef.current?.click()}
              className="bg-rebel-accent hover:bg-rebel-accent-hover text-white gap-1.5"
              disabled={importing}
            >
              <Upload className="w-3.5 h-3.5" />
              Choose CSV file
            </Button>
            <Button variant="outline" className="gap-1.5" onClick={downloadSample}>
              <Download className="w-3.5 h-3.5" />
              Download sample
            </Button>
            {fileName && (
              <span className="text-[11px] text-muted-foreground font-mono truncate">
                {fileName}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

{parsed && (
        <Card className="border-rebel-border bg-card shadow-card">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h4 className="text-[13px] font-bold text-rebel-text">Preview</h4>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {validRows.length} valid · {invalidRows.length} with errors
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={handleReset} disabled={importing}>
                  Cancel
                </Button>
                <Button
                  className="bg-rebel-accent hover:bg-rebel-accent-hover text-white gap-1.5"
                  onClick={handleImport}
                  disabled={importing || validRows.length === 0}
                >
                  <Upload className="w-3.5 h-3.5" />
                  {importing
                    ? `Importing ${progress.done + progress.failed}/${validRows.length}…`
                    : `Import ${validRows.length}`}
                </Button>
              </div>
            </div>

            <div className="rounded-xl border border-rebel-border overflow-hidden">
              <div className="max-h-[420px] overflow-y-auto">
                <table className="w-full text-[11.5px]">
                  <thead className="bg-muted text-rebel-text-tertiary uppercase tracking-wider text-[9px] font-bold sticky top-0">
                    <tr>
                      <th className="text-left px-3 py-2 w-10">#</th>
                      <th className="text-left px-3 py-2">Name</th>
                      <th className="text-left px-3 py-2">Phone</th>
                      <th className="text-left px-3 py-2">Type</th>
                      <th className="text-left px-3 py-2 w-24">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.map((row) => {
                      const ok = row.errors.length === 0;
                      return (
                        <tr
                          key={row.rowIndex}
                          className={cn(
                            'border-t border-rebel-border',
                            ok ? '' : 'bg-rebel-danger-surface/40',
                          )}
                        >
                          <td className="px-3 py-2 font-mono text-[10px] text-muted-foreground">
                            {row.rowIndex}
                          </td>
                          <td className="px-3 py-2 font-semibold text-rebel-text truncate">
                            {row.payload.name || <span className="text-muted-foreground italic">—</span>}
                            {row.payload.companyName && (
                              <span className="text-muted-foreground font-normal"> · {row.payload.companyName}</span>
                            )}
                          </td>
                          <td className="px-3 py-2 font-mono text-rebel-text-secondary">
                            {row.payload.phone || row.payload.email || '—'}
                          </td>
                          <td className="px-3 py-2 text-rebel-text-secondary capitalize">
                            {row.payload.type}
                          </td>
                          <td className="px-3 py-2">
                            {ok ? (
                              <span className="inline-flex items-center gap-1 text-rebel-success">
                                <CheckCircle2 className="w-3 h-3" />
                                Ready
                              </span>
                            ) : (
                              <span
                                className="inline-flex items-center gap-1 text-rebel-danger"
                                title={row.errors.join(', ')}
                              >
                                <XCircle className="w-3 h-3" />
                                {row.errors[0]}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {invalidRows.length > 0 && (
              <div className="flex items-start gap-2 rounded-xl bg-rebel-warning-surface px-3 py-2.5 text-[11px] text-rebel-warning ring-1 ring-rebel-warning/20">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>
                  {invalidRows.length} row{invalidRows.length === 1 ? '' : 's'} will be skipped due to validation errors. Fix them in your CSV and re-upload to retry.
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
