import 'server-only';

import ExcelJS from 'exceljs';

import { netralkanFormulaExcel } from '@/lib/domain/berita-acara';
import { isoWib } from '@/lib/domain/waktu';
import { type SlotPemenangRespons, type WilayahPemenangRespons } from '@/lib/domain/pemenang';

export async function buatWorkbookPemenang(
  wilayahList: WilayahPemenangRespons[],
  judulPeriode: string,
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Bapenda Kabupaten OKU Selatan';
  wb.created = new Date();

  const ws = wb.addWorksheet('Daftar Pemenang');

  ws.columns = [
    { header: 'No', key: 'no', width: 6 },
    { header: 'Wilayah', key: 'wilayah', width: 12 },
    { header: 'Kode Slot', key: 'slot', width: 14 },
    { header: 'NOP Tersamar', key: 'nop', width: 26 },
    { header: 'NIK Tersamar', key: 'nik', width: 20 },
    { header: 'Nama Wajib Pajak', key: 'nama', width: 28 },
    { header: 'Kecamatan', key: 'kecamatan', width: 20 },
    { header: 'Kelurahan', key: 'kelurahan', width: 20 },
    { header: 'Alamat WP', key: 'alamat', width: 35 },
    { header: 'Status Terkini', key: 'status', width: 16 },
    { header: 'Penerima Hadiah', key: 'aktif', width: 16 },
    { header: 'Alasan Gugur', key: 'alasan', width: 24 },
    { header: 'Catatan', key: 'catatan', width: 35 },
  ];

  let no = 1;
  const semuaRiwayat: Array<{
    slot: string;
    dari: string;
    ke: string;
    alasanGugur: string;
    catatan: string;
    oleh: string;
    at: string;
  }> = [];

  for (const w of wilayahList) {
    for (const slot of w.slot) {
      ws.addRow({
        no,
        wilayah: netralkanFormulaExcel(`${w.kode} - ${w.nama}`),
        slot: netralkanFormulaExcel(slot.kode),
        nop: netralkanFormulaExcel(slot.peserta.nopFormat),
        nik: netralkanFormulaExcel(slot.peserta.nikMasked),
        nama: netralkanFormulaExcel(slot.peserta.nama),
        kecamatan: netralkanFormulaExcel(slot.peserta.kecamatan),
        kelurahan: netralkanFormulaExcel(slot.peserta.kelurahan),
        alamat: netralkanFormulaExcel(slot.peserta.alamatWp),
        status: netralkanFormulaExcel(slot.status),
        aktif: slot.penerimaAktif ? 'Ya' : 'Tidak',
        alasan: netralkanFormulaExcel(slot.alasanGugur ?? '-'),
        catatan: netralkanFormulaExcel(slot.catatan ?? '-'),
      });
      no++;

      for (const r of slot.riwayat) {
        semuaRiwayat.push({
          slot: slot.kode,
          dari: r.dari,
          ke: r.ke,
          alasanGugur: r.alasanGugur ?? '-',
          catatan: r.catatan ?? '-',
          oleh: r.oleh,
          at: isoWib(new Date(r.at)),
        });
      }
    }
  }

  // Lembar kedua: Riwayat Perubahan Status
  const wsRiwayat = wb.addWorksheet('Riwayat Perubahan Status');
  wsRiwayat.columns = [
    { header: 'Slot', key: 'slot', width: 14 },
    { header: 'Dari Status', key: 'dari', width: 16 },
    { header: 'Ke Status', key: 'ke', width: 16 },
    { header: 'Alasan Gugur', key: 'alasan', width: 24 },
    { header: 'Catatan', key: 'catatan', width: 35 },
    { header: 'Diubah Oleh', key: 'oleh', width: 20 },
    { header: 'Waktu (WIB)', key: 'waktu', width: 22 },
  ];

  for (const r of semuaRiwayat) {
    wsRiwayat.addRow({
      slot: netralkanFormulaExcel(r.slot),
      dari: netralkanFormulaExcel(r.dari),
      ke: netralkanFormulaExcel(r.ke),
      alasan: netralkanFormulaExcel(r.alasanGugur),
      catatan: netralkanFormulaExcel(r.catatan),
      oleh: netralkanFormulaExcel(r.oleh),
      waktu: netralkanFormulaExcel(r.at),
    });
  }

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export type ItemAuditLog = {
  id: bigint;
  at: Date;
  aktorLabel: string;
  aksi: string;
  targetTipe: string;
  targetId: string | null;
  payload: unknown;
  ip: string | null;
};

export async function buatWorkbookAudit(
  logs: ItemAuditLog[],
  judulPeriode: string,
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Bapenda Kabupaten OKU Selatan';
  wb.created = new Date();

  const ws = wb.addWorksheet('Log Audit');
  ws.columns = [
    { header: 'ID', key: 'id', width: 10 },
    { header: 'Waktu (WIB)', key: 'waktu', width: 22 },
    { header: 'Aktor', key: 'aktor', width: 18 },
    { header: 'Kode Aksi', key: 'aksi', width: 24 },
    { header: 'Tipe Target', key: 'targetTipe', width: 16 },
    { header: 'ID Target', key: 'targetId', width: 28 },
    { header: 'Payload (Ringkasan)', key: 'payload', width: 45 },
    { header: 'Alamat IP', key: 'ip', width: 18 },
  ];

  for (const log of logs) {
    ws.addRow({
      id: Number(log.id),
      waktu: netralkanFormulaExcel(isoWib(log.at)),
      aktor: netralkanFormulaExcel(log.aktorLabel),
      aksi: netralkanFormulaExcel(log.aksi),
      targetTipe: netralkanFormulaExcel(log.targetTipe),
      targetId: netralkanFormulaExcel(log.targetId ?? '-'),
      payload: netralkanFormulaExcel(
        typeof log.payload === 'object' ? JSON.stringify(log.payload) : String(log.payload),
      ),
      ip: netralkanFormulaExcel(log.ip ?? '-'),
    });
  }

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
