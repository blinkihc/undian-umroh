/** Nilai field teks dari FormData; nilai bukan teks (berkas) dianggap kosong. */
export function teksForm(data: FormData, nama: string): string {
  const nilai = data.get(nama);
  return typeof nilai === 'string' ? nilai : '';
}

/** Galat zod per nama field teratas (pesan pertama per field). */
export function galatPerField(
  isu: readonly { path: readonly PropertyKey[]; message: string }[],
): Record<string, string> {
  const hasil: Record<string, string> = {};
  for (const i of isu) {
    const nama = String(i.path[0] ?? '');
    hasil[nama] ??= i.message;
  }
  return hasil;
}
