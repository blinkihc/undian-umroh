/**
 * Membuat file impor sintetis (TESTING §7): `npm run fixture:generate -- --rows 46000`.
 * Opsi: `--format csv|xlsx` (bawaan csv), `--seed <angka>`, `--out <path>`.
 * Bawaan keluaran: `tests/fixtures/impor/generated/sintetis-<rows>.<format>` (di-gitignore).
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { parseArgs } from 'node:util';

import ExcelJS from 'exceljs';

import { HEADER_IMPOR } from '@/lib/domain';

import { barisSintetis, csvSintetis } from './lib/data-sintetis';

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      rows: { type: 'string', default: '46000' },
      format: { type: 'string', default: 'csv' },
      seed: { type: 'string', default: '20261012' },
      out: { type: 'string' },
    },
  });
  const rows = Number(values.rows);
  const seed = Number(values.seed);
  const format = values.format;
  if (!Number.isInteger(rows) || rows < 1 || rows > 100_000) {
    throw new Error('--rows harus bilangan bulat 1–100000.');
  }
  if (format !== 'csv' && format !== 'xlsx') {
    throw new Error('--format harus csv atau xlsx.');
  }
  const out = values.out ?? `tests/fixtures/impor/generated/sintetis-${rows.toString()}.${format}`;
  mkdirSync(dirname(out), { recursive: true });
  if (format === 'csv') {
    writeFileSync(out, csvSintetis({ rows, seed }), 'utf8');
  } else {
    const buku = new ExcelJS.Workbook();
    const lembar = buku.addWorksheet('Data');
    lembar.addRow([...HEADER_IMPOR]);
    for (const baris of barisSintetis({ rows, seed })) lembar.addRow(baris);
    await buku.xlsx.writeFile(out);
  }
  console.log(`Data sintetis ${rows.toString()} baris ditulis ke ${out}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
