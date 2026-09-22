// A merge-import must never clear a field the spreadsheet simply didn't carry.
//
// useUpdateCustomer sends every key through normaliseUpdates, where `undefined`
// means "clear this field". An import payload always carries every key. Before
// mergePatchFrom, a re-import nulled phone / email / company / ABN / source /
// notes on 169 matched records and zeroed their job counts. 40 of those records
// keep their only stored address in `notes`.
import { mergePatchFrom } from '../src/lib/customerImport';

const payload = {
  name: 'Bayliss Rugs',
  phone: undefined,
  email: undefined,
  companyName: 'Bayliss Rugs',
  abn: undefined,
  source: undefined,
  notes: undefined,
  type: 'individual',
  vip: false,
  totalJobs: 0,
  totalSpent: 0,
} as any;

const patch = mergePatchFrom(payload);
const keys = Object.keys(patch).sort();

const checks: Array<[string, boolean]> = [
  ['carries the name it does have', patch.name === 'Bayliss Rugs'],
  ['carries the company it does have', patch.companyName === 'Bayliss Rugs'],
  ['omits a blank phone rather than nulling it', !('phone' in patch)],
  ['omits a blank email', !('email' in patch)],
  ['omits a blank ABN', !('abn' in patch)],
  ['omits blank notes — this is where the Postal: addresses live', !('notes' in patch)],
  ['never resets totalJobs', !('totalJobs' in patch)],
  ['never resets totalSpent', !('totalSpent' in patch)],
  ['never demotes type from a sheet with no company column', !('type' in patch)],
  ['never clears the VIP flag', !('vip' in patch)],
  ['sends nothing else', keys.every((k) => ['name', 'companyName'].includes(k))],
  [
    'an empty string counts as absent, not as a clear',
    !('phone' in mergePatchFrom({ ...payload, phone: '   ' })),
  ],
  [
    'a real value still gets through',
    mergePatchFrom({ ...payload, phone: '0412 884 021' }).phone === '0412 884 021',
  ],
];

let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}`);
  if (!ok) failed += 1;
}
console.log(
  failed === 0
    ? `\nall ${checks.length} hold — a merge-import cannot clear what it was never given`
    : `\n${failed} of ${checks.length} FAILED`,
);
process.exit(failed === 0 ? 0 : 1);
