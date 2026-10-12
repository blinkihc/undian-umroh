/** Nilai field teks dari FormData; nilai bukan teks (berkas) dianggap kosong. */
export function teksForm(data: FormData, nama: string): string {
  const nilai = data.get(nama);
  return typeof nilai === 'string' ? nilai : '';
}

/**
 * Galat zod per nama field (pesan pertama per field). Field bersarang memakai titik, mis.
 * `namaWilayah.W1`, sama dengan `details.fields` dari server.
 */
export function galatPerField(
  isu: readonly { path: readonly PropertyKey[]; message: string }[],
): Record<string, string> {
  const hasil: Record<string, string> = {};
  for (const i of isu) {
    const nama = i.path.map(String).join('.');
    hasil[nama] ??= i.message;
  }
  return hasil;
}
