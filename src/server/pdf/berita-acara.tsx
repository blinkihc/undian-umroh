import 'server-only';

import path from 'node:path';
import fs from 'node:fs';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  renderToBuffer,
} from '@react-pdf/renderer';
import { type WilayahPemenangRespons } from '@/lib/domain/pemenang';
import { type PanitiaItem, type SaksiItem } from '@/lib/domain/berita-acara';
import { formatWaktuWib } from '@/lib/domain/waktu';

const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 40,
    paddingHorizontal: 40,
    fontSize: 9,
    fontFamily: 'Helvetica',
    color: '#1a1a1a',
    lineHeight: 1.3,
  },
  kopContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 2,
    borderBottomColor: '#000000',
    paddingBottom: 8,
    marginBottom: 12,
  },
  kopLogo: {
    width: 48,
    height: 48,
    objectFit: 'contain',
  },
  kopTeksContainer: {
    flex: 1,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  kopHeader1: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
  },
  kopHeader2: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
  },
  kopSub: {
    fontSize: 8,
    color: '#444444',
    marginTop: 2,
  },
  judulDokumen: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    textTransform: 'uppercase',
    marginTop: 6,
  },
  nomorDokumen: {
    fontSize: 9,
    textAlign: 'center',
    marginBottom: 10,
    color: '#333333',
  },
  sectionTitle: {
    fontSize: 9.5,
    fontFamily: 'Helvetica-Bold',
    marginTop: 8,
    marginBottom: 4,
    color: '#111827',
  },
  paragraf: {
    marginBottom: 6,
    textAlign: 'justify',
  },
  metadataTable: {
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  metaLabel: {
    width: 110,
    fontFamily: 'Helvetica-Bold',
  },
  metaColon: {
    width: 10,
  },
  metaValue: {
    flex: 1,
  },
  table: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    marginBottom: 8,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
    fontFamily: 'Helvetica-Bold',
    paddingVertical: 4,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#e2e8f0',
    paddingVertical: 3,
    minHeight: 18,
  },
  colWilayah: { width: '12%', paddingHorizontal: 3 },
  colSlot: { width: '14%', paddingHorizontal: 3 },
  colNop: { width: '22%', paddingHorizontal: 3 },
  colNama: { width: '24%', paddingHorizontal: 3 },
  colKecamatan: { width: '16%', paddingHorizontal: 3 },
  colStatus: { width: '12%', paddingHorizontal: 3 },
  hashBox: {
    backgroundColor: '#f8fafc',
    borderWidth: 0.5,
    borderColor: '#cbd5e1',
    padding: 6,
    marginBottom: 8,
    borderRadius: 3,
  },
  hashText: {
    fontFamily: 'Courier',
    fontSize: 7.5,
    color: '#0f172a',
    marginTop: 1,
  },
  tandaTanganSection: {
    marginTop: 14,
  },
  ttdGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  ttdCol: {
    width: '48%',
  },
  ttdBox: {
    borderWidth: 0.5,
    borderColor: '#e2e8f0',
    padding: 6,
    minHeight: 80,
    marginBottom: 6,
    justifyContent: 'space-between',
  },
  ttdNama: {
    fontFamily: 'Helvetica-Bold',
    textDecoration: 'underline',
    marginTop: 40,
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 40,
    right: 40,
    fontSize: 7,
    color: '#64748b',
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 0.5,
    borderTopColor: '#e2e8f0',
    paddingTop: 4,
  },
});

export type BeritaAcaraPdfData = {
  periode: {
    judul: string;
    tahunPbb: number;
    status: string;
    snapshotHash: string | null;
    hasilHash: string | null;
  };
  beritaAcara: {
    nomor: string;
    tempat: string;
    hariTanggal: string;
    dasarKegiatan: string;
    panitia: PanitiaItem[];
    saksi: SaksiItem[];
  };
  rekapWilayah: Array<{
    kode: string;
    nama: string;
    totalPeserta: number;
  }>;
  totalPesertaSemua: number;
  wilayahList: WilayahPemenangRespons[];
  tanggalCetak: Date;
};

export function BeritaAcaraDocument({ data }: { data: BeritaAcaraPdfData }) {
  const logoOkusPath = path.join(process.cwd(), 'public', 'brand', 'logo-okus.png');
  const logoBapendaPath = path.join(process.cwd(), 'public', 'brand', 'logo-bapenda.png');

  const hasLogoOkus = fs.existsSync(logoOkusPath);
  const hasLogoBapenda = fs.existsSync(logoBapendaPath);

  return (
    <Document title={`Berita Acara - ${data.periode.judul}`} author="Bapenda OKU Selatan">
      <Page size="A4" style={styles.page}>
        {/* Kop Surat Berlogo */}
        <View style={styles.kopContainer}>
          {hasLogoOkus ? (
            <Image src={logoOkusPath} style={styles.kopLogo} />
          ) : (
            <View style={styles.kopLogo} />
          )}
          <View style={styles.kopTeksContainer}>
            <Text style={styles.kopHeader1}>Pemerintah Kabupaten Ogan Komering Ulu Selatan</Text>
            <Text style={styles.kopHeader2}>Badan Pendapatan Daerah</Text>
            <Text style={styles.kopSub}>
              Kompleks Perkantoran Pemkab OKU Selatan, Muaradua | Pajak Daerah untuk Pembangunan OKU Selatan
            </Text>
          </View>
          {hasLogoBapenda ? (
            <Image src={logoBapendaPath} style={styles.kopLogo} />
          ) : (
            <View style={styles.kopLogo} />
          )}
        </View>

        {/* Judul & Nomor */}
        <Text style={styles.judulDokumen}>BERITA ACARA PELAKSANAAN UNDIAN UMROH GRATIS</Text>
        <Text style={styles.nomorDokumen}>
          Nomor: {data.beritaAcara.nomor || '...................................................'}
        </Text>

        {/* Paragraf Pembuka */}
        <Text style={styles.paragraf}>
          Pada hari ini, {data.beritaAcara.hariTanggal || '........................'}, bertempat di{' '}
          {data.beritaAcara.tempat || '........................'}, telah diselenggarakan Pengundian Hadiah Umroh
          Bagi Wajib Pajak Bumi dan Bangunan Perdesaan dan Perkotaan (PBB-P2) Kabupaten Ogan Komering Ulu Selatan untuk
          Tahun Pajak {data.periode.tahunPbb}.
        </Text>

        {/* Rincian Dasar Kegiatan */}
        <View style={styles.metadataTable}>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Dasar Kegiatan</Text>
            <Text style={styles.metaColon}>:</Text>
            <Text style={styles.metaValue}>{data.beritaAcara.dasarKegiatan || '-'}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Total Peserta Sah</Text>
            <Text style={styles.metaColon}>:</Text>
            <Text style={styles.metaValue}>
              {data.totalPesertaSemua.toLocaleString('id-ID')} wajib pajak (tersebar di {data.rekapWilayah.length} wilayah)
            </Text>
          </View>
        </View>

        {/* Rekap Peserta per Wilayah */}
        <Text style={styles.sectionTitle}>I. Rekapitulasi Peserta per Wilayah</Text>
        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={{ width: '20%', paddingHorizontal: 3 }}>Kode</Text>
            <Text style={{ width: '50%', paddingHorizontal: 3 }}>Nama Wilayah</Text>
            <Text style={{ width: '30%', paddingHorizontal: 3, textAlign: 'right' }}>Jumlah Peserta</Text>
          </View>
          {data.rekapWilayah.map((rw) => (
            <View key={rw.kode} style={styles.tableRow}>
              <Text style={{ width: '20%', paddingHorizontal: 3 }}>{rw.kode}</Text>
              <Text style={{ width: '50%', paddingHorizontal: 3 }}>{rw.nama}</Text>
              <Text style={{ width: '30%', paddingHorizontal: 3, textAlign: 'right' }}>
                {rw.totalPeserta.toLocaleString('id-ID')} WP
              </Text>
            </View>
          ))}
        </View>

        {/* Bukti Integritas Kriptografis */}
        <Text style={styles.sectionTitle}>II. Integritas Kriptografis Data (SHA-256)</Text>
        <View style={styles.hashBox}>
          <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold' }}>Hash Snapshot Peserta Terkunci:</Text>
          <Text style={styles.hashText}>{data.periode.snapshotHash ?? '(Belum terkunci)'}</Text>
          <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', marginTop: 4 }}>Hash Unggahan Hasil Undian:</Text>
          <Text style={styles.hashText}>{data.periode.hasilHash ?? '(Belum ada hasil)'}</Text>
        </View>

        {/* Daftar Pemenang */}
        <Text style={styles.sectionTitle}>III. Hasil Penetapan Pemenang</Text>
        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={styles.colWilayah}>Wilayah</Text>
            <Text style={styles.colSlot}>Slot</Text>
            <Text style={styles.colNop}>NOP Tersamar</Text>
            <Text style={styles.colNama}>Nama Wajib Pajak</Text>
            <Text style={styles.colKecamatan}>Kecamatan</Text>
            <Text style={styles.colStatus}>Status</Text>
          </View>
          {data.wilayahList.flatMap((w) =>
            w.slot.map((s) => (
              <View key={`${w.kode}-${s.kode}`} style={styles.tableRow}>
                <Text style={styles.colWilayah}>{w.kode}</Text>
                <Text style={styles.colSlot}>{s.kode}</Text>
                <Text style={styles.colNop}>{s.peserta.nopFormat}</Text>
                <Text style={styles.colNama}>{s.peserta.nama}</Text>
                <Text style={styles.colKecamatan}>{s.peserta.kecamatan}</Text>
                <Text style={styles.colStatus}>
                  {s.status}
                  {s.penerimaAktif ? ' (Penerima)' : ''}
                </Text>
              </View>
            )),
          )}
        </View>

        {/* Tanda Tangan */}
        <View style={styles.tandaTanganSection}>
          <Text style={styles.sectionTitle}>IV. Pengesahan Panitia dan Saksi</Text>
          <View style={styles.ttdGrid}>
            {/* Panitia */}
            <View style={styles.ttdCol}>
              <Text style={{ fontFamily: 'Helvetica-Bold', marginBottom: 4 }}>Panitia Pelaksana:</Text>
              {data.beritaAcara.panitia.length > 0 ? (
                data.beritaAcara.panitia.map((p, idx) => (
                  <View key={`panitia-${idx}`} style={styles.ttdBox}>
                    <Text style={{ fontSize: 7.5, color: '#475569' }}>{p.jabatan}</Text>
                    <Text style={styles.ttdNama}>{p.nama}</Text>
                  </View>
                ))
              ) : (
                <View style={styles.ttdBox}>
                  <Text style={{ fontSize: 7.5, color: '#94a3b8' }}>Panitia 1</Text>
                  <Text style={styles.ttdNama}>( ........................................ )</Text>
                </View>
              )}
            </View>

            {/* Saksi */}
            <View style={styles.ttdCol}>
              <Text style={{ fontFamily: 'Helvetica-Bold', marginBottom: 4 }}>Saksi-Saksi:</Text>
              {data.beritaAcara.saksi.length > 0 ? (
                data.beritaAcara.saksi.map((s, idx) => (
                  <View key={`saksi-${idx}`} style={styles.ttdBox}>
                    <Text style={{ fontSize: 7.5, color: '#475569' }}>{s.instansi}</Text>
                    <Text style={styles.ttdNama}>{s.nama}</Text>
                  </View>
                ))
              ) : (
                <View style={styles.ttdBox}>
                  <Text style={{ fontSize: 7.5, color: '#94a3b8' }}>Saksi 1</Text>
                  <Text style={styles.ttdNama}>( ........................................ )</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text>Dicetak pada: {formatWaktuWib(data.tanggalCetak)}</Text>
          <Text
            render={({ pageNumber, totalPages }) => `Halaman ${pageNumber} dari ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}

export async function buatPdfBeritaAcara(data: BeritaAcaraPdfData): Promise<Buffer> {
  const document = <BeritaAcaraDocument data={data} />;
  return await renderToBuffer(document);
}
