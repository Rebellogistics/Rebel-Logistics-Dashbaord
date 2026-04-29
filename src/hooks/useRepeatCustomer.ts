import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface RepeatCustomerInfo {
  found: boolean;
  customerName?: string;
  jobCount?: number;
  lastJobDate?: string;
  lastPickup?: string;
  lastDelivery?: string;
  overrideMetroRate?: number;
  overrideHourlyRate?: number;
}

const EMPTY: RepeatCustomerInfo = { found: false };
const MIN_DIGITS = 6;
const DEBOUNCE_MS = 500;

export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

export function useRepeatCustomerLookup(phone: string): {
  info: RepeatCustomerInfo;
  isChecking: boolean;
} {
  const [info, setInfo] = useState<RepeatCustomerInfo>(EMPTY);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    const normalized = normalizePhone(phone);
    if (normalized.length < MIN_DIGITS) {
      setInfo(EMPTY);
      setIsChecking(false);
      return;
    }

    let cancelled = false;
    setIsChecking(true);

    const timer = setTimeout(async () => {
      try {
        const { data, error } = await supabase.rpc('find_repeat_customer', {
          p_phone: phone,
        });

        if (cancelled) return;
        if (error || !data) {
          setInfo(EMPTY);
          setIsChecking(false);
          return;
        }

        const rows = Array.isArray(data) ? data : [data];
        if (rows.length === 0 || !rows[0]) {
          setInfo(EMPTY);
          setIsChecking(false);
          return;
        }

        const row = rows[0] as any;
        if (!row.customer_name) {
          setInfo(EMPTY);
          setIsChecking(false);
          return;
        }

        setInfo({
          found: true,
          customerName: row.customer_name,
          jobCount: Number(row.job_count) || 0,
          lastJobDate: row.last_job_date,
          lastPickup: row.last_pickup,
          lastDelivery: row.last_delivery,
          overrideMetroRate:
            row.override_metro_rate != null ? Number(row.override_metro_rate) : undefined,
          overrideHourlyRate:
            row.override_hourly_rate != null ? Number(row.override_hourly_rate) : undefined,
        });
        setIsChecking(false);
      } catch {
        if (!cancelled) {
          setInfo(EMPTY);
          setIsChecking(false);
        }
      }
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [phone]);

  return { info, isChecking };
}
