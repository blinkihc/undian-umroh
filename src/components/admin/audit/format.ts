const PANJANG_RINGKASAN_MAKS = 120;

function nilaiPendek(nilai: unknown): string {
  if (nilai === null) {
    return '-';
  }
  if (Array.isArray(nilai)) {
    return `[${nilai.length.toString()} item]`;
  }
  if (typeof nilai === 'object') {
    return '{…}';
  }
  if (typeof nilai === 'string') {
    return nilai;
  }
  return typeof nilai === 'number' || typeof nilai === 'boolean' ? nilai.toString() : '-';
}

/** Ringkasan satu baris dari payload audit, mis. `username: op1 · peran: OPERATOR`. */
export function ringkasPayload(payload: unknown): string {
  if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) {
    return '-';
  }
  const bagian = Object.entries(payload).map(([kunci, nilai]) => `${kunci}: ${nilaiPendek(nilai)}`);
  if (bagian.length === 0) {
    return '-';
  }
  const teks = bagian.join(' · ');
  return teks.length > PANJANG_RINGKASAN_MAKS
    ? `${teks.slice(0, PANJANG_RINGKASAN_MAKS - 1)}…`
    : teks;
}

/** Query string halaman Log Audit dengan nilai filter yang terisi saja. */
export function queryAudit(filter: Record<string, string | number | undefined>): string {
  const params = new URLSearchParams();
  for (const [kunci, nilai] of Object.entries(filter)) {
    if (nilai !== undefined && nilai !== '') {
      params.set(kunci, String(nilai));
    }
  }
  const teks = params.toString();
  return teks === '' ? '' : `?${teks}`;
}
