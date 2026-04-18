import { Job, Customer } from './types';

/**
 * Pure helpers that turn Rebel jobs into Xero invoice payloads.
 *
 * The actual API call lives behind Yamen's Xero OAuth app (see DEFERRED.md §4).
 * Keeping the payload shape separate means: when creds arrive, the only work
 * is the POST. The line-item logic, tax config, and contact upsert shape are
 * already decided and testable.
 *
 * Shape mirrors Xero's /api.xro/2.0/Invoices POST body. We don't import the
 * full SDK — it's heavyweight and we only need a narrow slice.
 */

// ──────────────────────────────────────────────────────────────────
// Configuration (can be surfaced in Settings → Integrations → Xero once
// Yamen confirms the numbers for his Xero chart of accounts).
// ──────────────────────────────────────────────────────────────────

export interface XeroInvoiceConfig {
  /** GL account code for income. Per the actionables doc, 200 = Sales. */
  accountCode: string;
  /** Xero tax type code. "OUTPUT" = GST on Income at 10% (AU). */
  taxType: string;
  /** Line amount convention: "Exclusive" / "Inclusive" / "NoTax". */
  lineAmountTypes: 'Exclusive' | 'Inclusive' | 'NoTax';
  /** Invoice status. "DRAFT" so Yamen can review in Xero before sending. */
  status: 'DRAFT' | 'SUBMITTED' | 'AUTHORISED';
}

export const DEFAULT_XERO_CONFIG: XeroInvoiceConfig = {
  accountCode: '200',
  taxType: 'OUTPUT',
  lineAmountTypes: 'Exclusive',
  status: 'DRAFT',
};

// ──────────────────────────────────────────────────────────────────
// Payload types (narrowed from Xero's full schema)
// ──────────────────────────────────────────────────────────────────

export interface XeroContact {
  Name: string;
  EmailAddress?: string;
  Phones?: Array<{ PhoneType: 'MOBILE' | 'DEFAULT'; PhoneNumber: string }>;
  ContactStatus?: 'ACTIVE';
}

export interface XeroLineItem {
  Description: string;
  Quantity: number;
  UnitAmount: number;
  AccountCode: string;
  TaxType: string;
}

export interface XeroInvoicePayload {
  Type: 'ACCREC';
  Contact: XeroContact;
  Date: string; // YYYY-MM-DD
  DueDate: string; // YYYY-MM-DD
  LineAmountTypes: XeroInvoiceConfig['lineAmountTypes'];
  Status: XeroInvoiceConfig['status'];
  LineItems: XeroLineItem[];
  Reference?: string;
}

// ──────────────────────────────────────────────────────────────────
// Builders
// ──────────────────────────────────────────────────────────────────

const NET_DAYS = 14; // Default payment terms. Surface in Settings later if needed.

/** Build a draft invoice payload for a single job. */
export function buildInvoiceFromJob(
  job: Job,
  customer: Customer | null,
  config: XeroInvoiceConfig = DEFAULT_XERO_CONFIG,
): XeroInvoicePayload {
  const date = job.date || new Date().toISOString().slice(0, 10);
  return {
    Type: 'ACCREC',
    Contact: buildContact(customer, job),
    Date: date,
    DueDate: addDays(date, NET_DAYS),
    LineAmountTypes: config.lineAmountTypes,
    Status: config.status,
    LineItems: lineItemsForJob(job, config),
    Reference: `Rebel Logistics · ${job.id}`,
  };
}

/**
 * Build a single draft invoice combining N completed, un-invoiced jobs for a
 * single customer. Order is preserved. Per Yamen's call: "one client multiple
 * jobs… so then that means I'll have to copy paste them so they're in one
 * invoice because then it becomes like a spam of invoices".
 */
export function buildBatchInvoice(
  jobs: Job[],
  customer: Customer,
  config: XeroInvoiceConfig = DEFAULT_XERO_CONFIG,
): XeroInvoicePayload {
  if (jobs.length === 0) {
    throw new Error('buildBatchInvoice requires at least one job');
  }
  const latestDate = jobs
    .map((j) => j.date)
    .filter((d): d is string => !!d)
    .sort()
    .pop() ?? new Date().toISOString().slice(0, 10);

  const lineItems = jobs.flatMap((j) => lineItemsForJob(j, config));

  return {
    Type: 'ACCREC',
    Contact: buildContact(customer, jobs[0]),
    Date: latestDate,
    DueDate: addDays(latestDate, NET_DAYS),
    LineAmountTypes: config.lineAmountTypes,
    Status: config.status,
    LineItems: lineItems,
    Reference: `Rebel Logistics · ${jobs.length} jobs for ${customer.companyName || customer.name}`,
  };
}

// ──────────────────────────────────────────────────────────────────
// Internals
// ──────────────────────────────────────────────────────────────────

function buildContact(customer: Customer | null, job: Job): XeroContact {
  const name = customer?.companyName?.trim() || customer?.name || job.customerName;
  const contact: XeroContact = {
    Name: name,
    ContactStatus: 'ACTIVE',
  };
  const email = customer?.email?.trim();
  const phone = (customer?.phone || job.customerPhone)?.trim();
  if (email) contact.EmailAddress = email;
  if (phone) {
    contact.Phones = [{ PhoneType: 'MOBILE', PhoneNumber: phone }];
  }
  return contact;
}

function lineItemsForJob(job: Job, config: XeroInvoiceConfig): XeroLineItem[] {
  const items: XeroLineItem[] = [];
  const pickupShort = shortAddress(job.pickupAddress);
  const deliveryShort = shortAddress(job.deliveryAddress);

  // Primary line — description + unit amount shape depends on pricing type.
  if (job.pricingType === 'hourly' && job.hourlyRate && job.hoursEstimated) {
    items.push({
      Description: `Hourly move — ${job.hoursEstimated}h × $${job.hourlyRate.toFixed(2)} (${pickupShort} → ${deliveryShort})`,
      Quantity: job.hoursEstimated,
      UnitAmount: round2(job.hourlyRate),
      AccountCode: config.accountCode,
      TaxType: config.taxType,
    });
  } else {
    const label = `${job.type} delivery from ${pickupShort} to ${deliveryShort}`;
    const baseFee = job.fee ?? 0;
    if (baseFee > 0) {
      items.push({
        Description: label,
        Quantity: 1,
        UnitAmount: round2(baseFee),
        AccountCode: config.accountCode,
        TaxType: config.taxType,
      });
    } else {
      items.push({
        Description: label,
        Quantity: 1,
        UnitAmount: 0,
        AccountCode: config.accountCode,
        TaxType: config.taxType,
      });
    }
  }

  // Separate fuel levy line so the tax breakdown reads clearly in Xero.
  if (job.fuelLevy && job.fuelLevy > 0) {
    items.push({
      Description: `Fuel levy (${job.distanceKm ? `${job.distanceKm} km` : 'long-distance'})`,
      Quantity: 1,
      UnitAmount: round2(job.fuelLevy),
      AccountCode: config.accountCode,
      TaxType: config.taxType,
    });
  }

  return items;
}

function shortAddress(addr: string | undefined): string {
  if (!addr) return '—';
  return addr.split(',')[0].trim() || addr;
}

function addDays(iso: string, days: number): string {
  try {
    const d = new Date(`${iso}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
  } catch {
    return iso;
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** True when a job is ready to be sent to Xero (completed, not yet invoiced). */
export function canSendJobToXero(job: Job): boolean {
  if (job.xeroInvoiceId) return false;
  return job.status === 'Completed' || job.status === 'Invoiced';
}
