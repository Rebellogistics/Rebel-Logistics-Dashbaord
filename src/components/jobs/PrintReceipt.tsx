import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Job } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { supabase } from '@/lib/supabase';

interface PrintReceiptProps {
  job: Job;
}

/**
 * Print-only receipt block. Renders into a portal at the document root with
 * the `.print-receipt` class so global @media print rules can hide everything
 * else and reveal just this. Loads the signature image as a signed URL so it
 * shows up on the printout.
 */
export function PrintReceipt({ job }: PrintReceiptProps) {
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!job.signature) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase.storage
          .from('job-proofs')
          .createSignedUrl(job.signature!, 600);
        if (!cancelled) setSignatureUrl(data?.signedUrl ?? null);
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [job.signature]);

  if (typeof document === 'undefined') return null;

  const total = job.fee + (job.fuelLevy ?? 0);
  const receiptDate = (() => {
    try {
      return job.date ? format(parseISO(job.date), 'd MMMM yyyy') : '—';
    } catch {
      return job.date;
    }
  })();
  const issuedAt = format(new Date(), 'd MMMM yyyy · HH:mm');

  return createPortal(
    <div className="print-receipt">
      <div style={{ maxWidth: '160mm', margin: '0 auto', padding: '0' }}>
        {/* Letterhead */}
        <header
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingBottom: '14px',
            borderBottom: '2px solid #0D1220',
            marginBottom: '20px',
          }}
        >
          <div>
            <img
              src="/logo.png"
              alt="Rebel Logistics"
              style={{ height: '48px', width: 'auto', display: 'block' }}
            />
            <p style={{ fontSize: '10px', color: '#5B6477', margin: '6px 0 0 0', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Delivery Receipt
            </p>
          </div>
          <div style={{ textAlign: 'right', fontSize: '10px', color: '#5B6477' }}>
            <p style={{ margin: 0 }}>Issued {issuedAt}</p>
            <p style={{ margin: '2px 0 0 0', fontFamily: 'monospace' }}>#{job.id.slice(0, 8).toUpperCase()}</p>
          </div>
        </header>

        {/* Customer & job */}
        <section style={{ marginBottom: '20px' }}>
          <h2
            style={{
              fontSize: '10px',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: '#5B6477',
              fontWeight: 700,
              margin: '0 0 6px 0',
            }}
          >
            Customer
          </h2>
          <p style={{ margin: 0, fontSize: '14px', fontWeight: 700 }}>{job.customerName}</p>
          {job.customerPhone && (
            <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#5B6477', fontFamily: 'monospace' }}>
              {job.customerPhone}
            </p>
          )}
        </section>

        <section
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '16px',
            marginBottom: '20px',
            paddingBottom: '20px',
            borderBottom: '1px solid #E6E9F2',
          }}
        >
          <ReceiptField label="Date" value={receiptDate} />
          <ReceiptField label="Job type" value={job.type} />
          <ReceiptField label="Pickup" value={job.pickupAddress || '—'} />
          <ReceiptField label="Delivery" value={job.deliveryAddress || '—'} />
          {job.assignedTruck && <ReceiptField label="Truck" value={job.assignedTruck} />}
          {job.distanceKm != null && <ReceiptField label="Distance" value={`${job.distanceKm} km`} />}
        </section>

        {/* Fee breakdown */}
        <section style={{ marginBottom: '20px' }}>
          <h2
            style={{
              fontSize: '10px',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: '#5B6477',
              fontWeight: 700,
              margin: '0 0 8px 0',
            }}
          >
            Charges
          </h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <tbody>
              <FeeRow label={`${job.type} fee`} value={`$${job.fee.toFixed(2)}`} />
              {job.fuelLevy > 0 && (
                <FeeRow label="Fuel levy" value={`$${job.fuelLevy.toFixed(2)}`} />
              )}
              <tr style={{ borderTop: '2px solid #0D1220' }}>
                <td style={{ padding: '10px 0 0 0', fontWeight: 800, fontSize: '14px' }}>Total</td>
                <td style={{ padding: '10px 0 0 0', textAlign: 'right', fontWeight: 800, fontSize: '14px', fontFamily: 'monospace' }}>
                  ${total.toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* Signature */}
        {signatureUrl && (
          <section style={{ marginBottom: '20px' }}>
            <h2
              style={{
                fontSize: '10px',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: '#5B6477',
                fontWeight: 700,
                margin: '0 0 8px 0',
              }}
            >
              Signature
            </h2>
            <div
              style={{
                border: '1px solid #E6E9F2',
                borderRadius: '8px',
                padding: '8px',
                display: 'flex',
                justifyContent: 'center',
              }}
            >
              <img
                src={signatureUrl}
                alt="Customer signature"
                style={{ maxHeight: '80px', maxWidth: '100%', objectFit: 'contain' }}
                referrerPolicy="no-referrer"
              />
            </div>
            <p style={{ fontSize: '9px', color: '#5B6477', margin: '6px 0 0 0', textAlign: 'center' }}>
              Signed by recipient
            </p>
          </section>
        )}

        {/* Notes */}
        {job.notes && (
          <section style={{ marginBottom: '20px' }}>
            <h2
              style={{
                fontSize: '10px',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: '#5B6477',
                fontWeight: 700,
                margin: '0 0 6px 0',
              }}
            >
              Notes
            </h2>
            <pre
              style={{
                fontFamily: 'monospace',
                fontSize: '10.5px',
                whiteSpace: 'pre-wrap',
                color: '#5B6477',
                margin: 0,
              }}
            >
              {job.notes}
            </pre>
          </section>
        )}

        {/* Footer */}
        <footer style={{ marginTop: '32px', paddingTop: '12px', borderTop: '1px solid #E6E9F2', textAlign: 'center', fontSize: '9px', color: '#9AA1B2' }}>
          Thank you for choosing Rebel Logistics. Generated automatically on {issuedAt}.
        </footer>
      </div>
    </div>,
    document.body,
  );
}

function ReceiptField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#5B6477', fontWeight: 700, margin: 0 }}>
        {label}
      </p>
      <p style={{ fontSize: '11.5px', margin: '3px 0 0 0', wordBreak: 'break-word' }}>{value}</p>
    </div>
  );
}

function FeeRow({ label, value }: { label: string; value: string }) {
  return (
    <tr>
      <td style={{ padding: '4px 0', color: '#5B6477' }}>{label}</td>
      <td style={{ padding: '4px 0', textAlign: 'right', fontFamily: 'monospace' }}>{value}</td>
    </tr>
  );
}
