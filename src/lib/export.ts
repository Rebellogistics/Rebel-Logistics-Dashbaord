import JSZip from 'jszip';
import { Job } from './types';
import { supabase } from './supabase';

const BUCKET = 'job-proofs';
const SIGNED_URL_TTL = 600;

// ──────────────────────────────────────────────────────────────────
// 13.1 — Naming convention
// ──────────────────────────────────────────────────────────────────
// Pattern: "{customer} - {address-short} - {YYYY-MM-DD} - {n}.jpg"
// Signature: "{customer} - {address-short} - {YYYY-MM-DD} - signature.png"

function sanitise(s: string): string {
  return s
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
}

function shortAddress(addr: string | undefined): string {
  if (!addr) return 'Unknown';
  return sanitise(addr.split(',')[0].trim()) || 'Unknown';
}

export function proofPhotoName(job: Job, index: number, ext = 'jpg'): string {
  const customer = sanitise(job.customerName) || 'Customer';
  const addr = shortAddress(job.deliveryAddress);
  const date = job.date || 'undated';
  return `${customer} - ${addr} - ${date} - ${index + 1}.${ext}`;
}

export function signatureFileName(job: Job): string {
  const customer = sanitise(job.customerName) || 'Customer';
  const addr = shortAddress(job.deliveryAddress);
  const date = job.date || 'undated';
  return `${customer} - ${addr} - ${date} - signature.png`;
}

export function jobZipName(job: Job): string {
  const customer = sanitise(job.customerName) || 'Customer';
  const date = job.date || 'undated';
  return `${customer} - ${date} - proof.zip`;
}

// ──────────────────────────────────────────────────────────────────
// 13.2 — Per-job zip export
// ──────────────────────────────────────────────────────────────────

export interface ExportProgress {
  total: number;
  done: number;
  phase: 'photos' | 'signature' | 'zipping' | 'done';
}

interface JobPhotoRow {
  id: string;
  storage_path: string;
}

export async function exportJobProofZip(
  job: Job,
  onProgress?: (p: ExportProgress) => void,
): Promise<Blob> {
  // 1. Fetch photo rows from job_photos table
  const { data: photoRows, error } = await supabase
    .from('job_photos')
    .select('id, storage_path')
    .eq('job_id', job.id)
    .order('created_at', { ascending: true });

  if (error) throw error;
  const photos: JobPhotoRow[] = photoRows ?? [];

  const hasSignature =
    !!job.signature && job.signature.startsWith(`${job.id}/`) && /\.(png|jpg|jpeg|webp)$/i.test(job.signature);

  const total = photos.length + (hasSignature ? 1 : 0);
  let done = 0;

  const zip = new JSZip();

  // 2. Download + add each photo
  for (let i = 0; i < photos.length; i++) {
    onProgress?.({ total, done, phase: 'photos' });
    const blob = await downloadStorageFile(photos[i].storage_path);
    if (blob) {
      const ext = extensionFromPath(photos[i].storage_path);
      zip.file(proofPhotoName(job, i, ext), blob);
    }
    done++;
  }

  // 3. Download + add signature
  if (hasSignature) {
    onProgress?.({ total, done, phase: 'signature' });
    const blob = await downloadStorageFile(job.signature!);
    if (blob) {
      zip.file(signatureFileName(job), blob);
    }
    done++;
  }

  // 4. Generate zip
  onProgress?.({ total, done, phase: 'zipping' });
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  onProgress?.({ total: done, done, phase: 'done' });
  return zipBlob;
}

// ──────────────────────────────────────────────────────────────────
// 13.3 — Bulk backup helpers
// ──────────────────────────────────────────────────────────────────

const LAST_BACKUP_KEY = 'rebel.backup.lastExportAt';

export function getLastBackupDate(): string | null {
  try {
    return window.localStorage.getItem(LAST_BACKUP_KEY);
  } catch {
    return null;
  }
}

export function setLastBackupDate(iso: string) {
  try {
    window.localStorage.setItem(LAST_BACKUP_KEY, iso);
  } catch {
    // ignore storage errors
  }
}

export async function exportBulkProofZip(
  jobs: Job[],
  onProgress?: (p: { total: number; done: number; currentJob: string }) => void,
): Promise<Blob> {
  const zip = new JSZip();
  const total = jobs.length;
  let done = 0;

  for (const job of jobs) {
    onProgress?.({ total, done, currentJob: job.customerName });

    // Fetch photos
    const { data: photoRows } = await supabase
      .from('job_photos')
      .select('id, storage_path')
      .eq('job_id', job.id)
      .order('created_at', { ascending: true });

    const photos: JobPhotoRow[] = photoRows ?? [];
    const folder = zip.folder(sanitise(`${job.customerName} - ${job.date ?? 'undated'} - ${job.id}`)!)!;

    for (let i = 0; i < photos.length; i++) {
      const blob = await downloadStorageFile(photos[i].storage_path);
      if (blob) {
        const ext = extensionFromPath(photos[i].storage_path);
        folder.file(proofPhotoName(job, i, ext), blob);
      }
    }

    // Signature
    const hasSig =
      !!job.signature &&
      job.signature.startsWith(`${job.id}/`) &&
      /\.(png|jpg|jpeg|webp)$/i.test(job.signature);
    if (hasSig) {
      const blob = await downloadStorageFile(job.signature!);
      if (blob) folder.file(signatureFileName(job), blob);
    }

    done++;
  }

  onProgress?.({ total, done: total, currentJob: 'Zipping…' });
  return zip.generateAsync({ type: 'blob' });
}

// ──────────────────────────────────────────────────────────────────
// Shared internals
// ──────────────────────────────────────────────────────────────────

async function downloadStorageFile(storagePath: string): Promise<Blob | null> {
  try {
    const { data: signed } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(storagePath, SIGNED_URL_TTL);
    if (!signed?.signedUrl) return null;
    const res = await fetch(signed.signedUrl);
    if (!res.ok) return null;
    return res.blob();
  } catch {
    return null;
  }
}

function extensionFromPath(path: string): string {
  const m = path.match(/\.(\w+)$/);
  return m ? m[1].toLowerCase() : 'jpg';
}

export function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
