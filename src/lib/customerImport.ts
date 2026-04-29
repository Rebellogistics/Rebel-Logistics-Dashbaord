// Customer-import helpers — column auto-detection, dedup, payload shaping.
// Pure functions only; no React, no Supabase. Easier to reason about + test.

import { Customer } from './types';

export type SystemField =
  | 'name'
  | 'phone'
  | 'email'
  | 'companyName'
  | 'abn'
  | 'source'
  | 'notes'
  | 'type'
  | 'vip';

export interface SystemFieldDef {
  key: SystemField;
  label: string;
  required: boolean;
  hint?: string;
}

export const SYSTEM_FIELDS: SystemFieldDef[] = [
  { key: 'name', label: 'Customer name', required: true, hint: 'Required. Falls back to company name if blank.' },
  { key: 'phone', label: 'Phone', required: false, hint: 'At least one of phone or email is required.' },
  { key: 'email', label: 'Email', required: false },
  { key: 'companyName', label: 'Company name', required: false },
  { key: 'abn', label: 'ABN', required: false },
  { key: 'source', label: 'Source', required: false, hint: 'phone / website / referral / google / b2b / other' },
  { key: 'notes', label: 'Notes', required: false },
  { key: 'type', label: 'Type', required: false, hint: 'individual or company' },
  { key: 'vip', label: 'VIP', required: false, hint: 'true / false / yes / no / 1 / 0' },
];

// Common header aliases used by Xero, MYOB, QuickBooks, plain spreadsheets.
// Case-insensitive; punctuation and whitespace stripped before comparison.
const ALIAS_TABLE: Record<SystemField, string[]> = {
  name: [
    'name',
    'customer',
    'customername',
    'contactname',
    'fullname',
    'accountname',
    'displayname',
    'companycontact',
    'firstname', // we'll concat first + last when both are mapped — see assemble()
  ],
  phone: ['phone', 'phonenumber', 'mobile', 'mobilephone', 'tel', 'telephone', 'contactnumber', 'workphone'],
  email: ['email', 'emailaddress', 'mail', 'contactemail'],
  companyName: ['company', 'companyname', 'business', 'businessname', 'organisation', 'organization', 'accountname'],
  abn: ['abn', 'abnnumber', 'taxid', 'taxnumber', 'gstnumber'],
  source: ['source', 'leadsource', 'channel'],
  notes: ['notes', 'note', 'comment', 'comments', 'description'],
  type: ['type', 'customertype', 'category'],
  vip: ['vip', 'priority', 'star', 'favorite', 'favourite'],
};

function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** Best-effort auto-mapping from CSV headers → system fields. */
export function autoMap(csvHeaders: string[]): Partial<Record<SystemField, string>> {
  const norm = csvHeaders.map((h) => ({ raw: h, n: normalizeHeader(h) }));
  const map: Partial<Record<SystemField, string>> = {};
  for (const field of Object.keys(ALIAS_TABLE) as SystemField[]) {
    const aliases = ALIAS_TABLE[field];
    const hit = norm.find((h) => aliases.includes(h.n));
    if (hit) map[field] = hit.raw;
  }
  return map;
}

export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

export interface RawRow {
  rowNumber: number; // 1-indexed in the source file (header is row 1)
  values: Record<string, string>; // keyed by raw CSV header
}

export type RowDecision = 'create' | 'merge' | 'skip';

export interface PreviewRow {
  rowNumber: number;
  payload: Omit<Customer, 'id' | 'createdAt'>;
  matchedCustomerId?: string;
  matchReason?: string;
  errors: string[];
  decision: RowDecision;
}

interface AssembleOptions {
  mapping: Partial<Record<SystemField, string>>;
  /** Optional: also map firstName + lastName when present in the CSV. */
  firstNameHeader?: string;
  lastNameHeader?: string;
  existingCustomers: Pick<Customer, 'id' | 'name' | 'phone' | 'companyName'>[];
}

/**
 * Build the importable payloads from raw rows + a mapping.
 * Validates required fields, runs duplicate detection, and assigns a
 * default decision (skip-on-error, merge-on-dupe, create otherwise).
 */
export function buildPreview(rows: RawRow[], opts: AssembleOptions): PreviewRow[] {
  const phoneIndex = new Map<string, Pick<Customer, 'id' | 'name'>>();
  const nameIndex = new Map<string, Pick<Customer, 'id' | 'name'>>();
  for (const c of opts.existingCustomers) {
    if (c.phone) {
      const norm = normalizePhone(c.phone);
      if (norm.length >= 6) phoneIndex.set(norm, { id: c.id, name: c.name });
    }
    if (c.companyName) {
      nameIndex.set(c.companyName.trim().toLowerCase(), { id: c.id, name: c.name });
    } else if (c.name) {
      nameIndex.set(c.name.trim().toLowerCase(), { id: c.id, name: c.name });
    }
  }

  return rows.map((row) => {
    const v = (field: SystemField | undefined): string => {
      if (!field) return '';
      const header = opts.mapping[field];
      if (!header) return '';
      return (row.values[header] ?? '').trim();
    };

    const firstName = opts.firstNameHeader ? (row.values[opts.firstNameHeader] ?? '').trim() : '';
    const lastName = opts.lastNameHeader ? (row.values[opts.lastNameHeader] ?? '').trim() : '';

    let name = v('name');
    if (!name) name = [firstName, lastName].filter(Boolean).join(' ').trim();
    const companyName = v('companyName');
    if (!name) name = companyName; // last-resort fallback

    const phone = v('phone');
    const email = v('email');
    const abn = v('abn');
    const source = v('source');
    const notes = v('notes');
    const typeRaw = v('type').toLowerCase();
    const type: 'individual' | 'company' = typeRaw === 'company' || (companyName && !firstName) ? 'company' : 'individual';
    const vipRaw = v('vip').toLowerCase();
    const vip = vipRaw === 'true' || vipRaw === '1' || vipRaw === 'yes' || vipRaw === 'y';

    const errors: string[] = [];
    if (!name) errors.push('No name (and no company name to fall back on)');
    if (!phone && !email) errors.push('No phone or email — at least one is required');

    let matchedCustomerId: string | undefined;
    let matchReason: string | undefined;
    if (phone) {
      const norm = normalizePhone(phone);
      if (norm.length >= 6) {
        const hit = phoneIndex.get(norm);
        if (hit) {
          matchedCustomerId = hit.id;
          matchReason = `Phone matches existing customer "${hit.name}"`;
        }
      }
    }
    if (!matchedCustomerId && companyName) {
      const hit = nameIndex.get(companyName.trim().toLowerCase());
      if (hit) {
        matchedCustomerId = hit.id;
        matchReason = `Company name matches existing customer "${hit.name}"`;
      }
    }
    if (!matchedCustomerId && name) {
      const hit = nameIndex.get(name.trim().toLowerCase());
      if (hit) {
        matchedCustomerId = hit.id;
        matchReason = `Name matches existing customer "${hit.name}"`;
      }
    }

    const decision: RowDecision = errors.length > 0
      ? 'skip'
      : matchedCustomerId
        ? 'merge'
        : 'create';

    return {
      rowNumber: row.rowNumber,
      payload: {
        name,
        phone: phone || undefined,
        email: email || undefined,
        companyName: companyName || undefined,
        abn: abn || undefined,
        source: source || undefined,
        notes: notes || undefined,
        type,
        vip,
        totalJobs: 0,
        totalSpent: 0,
      },
      matchedCustomerId,
      matchReason,
      errors,
      decision,
    };
  });
}

/** Build the import_batch tag, e.g. "xero-2026-04-28-1". */
export function makeBatchTag(prefix: string, isoDate: string, attempt: number): string {
  return `${prefix}-${isoDate}${attempt > 1 ? `-${attempt}` : ''}`;
}
