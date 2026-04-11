/**
 * Tiny RFC 4180 CSV parser. Handles quoted fields, escaped quotes ("" → "),
 * and CRLF line endings. No external dependency. Returns rows as string arrays.
 */
export function parseCsv(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let i = 0;

  while (i < input.length) {
    const ch = input[i];

    if (inQuotes) {
      if (ch === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += ch;
      i += 1;
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }

    if (ch === ',') {
      row.push(field);
      field = '';
      i += 1;
      continue;
    }

    if (ch === '\r') {
      // Swallow — line break is handled by \n
      i += 1;
      continue;
    }

    if (ch === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      i += 1;
      continue;
    }

    field += ch;
    i += 1;
  }

  // Last field / row
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  // Trim trailing all-empty rows from a stray newline at EOF
  while (rows.length > 0 && rows[rows.length - 1].every((f) => f.trim() === '')) {
    rows.pop();
  }

  return rows;
}

/** Map a parsed CSV (header row + data rows) to objects keyed by header name. */
export function csvToRecords(rows: string[][]): Record<string, string>[] {
  if (rows.length === 0) return [];
  const headers = rows[0].map((h) => h.trim().toLowerCase());
  return rows.slice(1).map((row) => {
    const record: Record<string, string> = {};
    headers.forEach((h, idx) => {
      record[h] = (row[idx] ?? '').trim();
    });
    return record;
  });
}
