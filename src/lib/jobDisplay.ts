import type { Job } from './types';

/**
 * Phase 16: how to render a job's "who" line.
 *
 * - Company customers (Yamin's most common case — Bayliss Rugs, etc.):
 *   show the company as the primary identity. The contact-person name
 *   becomes a secondary sub-line.
 * - Individual customers: just one line with their name. They ARE their
 *   own brand for our purposes; no separate company field.
 *
 * Existing jobs created before Phase 16 have customerCompanyName = null
 * and fall through to the single-line rendering automatically — no
 * backfill needed.
 */
export interface JobCustomerDisplay {
  /** Always present. Big / bold line on the card or dialog. */
  primary: string;
  /** Contact person, only set when the customer is a company. */
  secondary: string | null;
}

export function customerDisplay(job: Pick<Job, 'customerName' | 'customerCompanyName'>): JobCustomerDisplay {
  const company = (job.customerCompanyName ?? '').trim();
  const name = (job.customerName ?? '').trim();
  if (company) {
    return {
      primary: company,
      secondary: name && name !== company ? name : null,
    };
  }
  return { primary: name, secondary: null };
}
