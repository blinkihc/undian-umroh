import { describe, expect, it } from 'vitest';

import { queryAudit, ringkasPayload } from '@/components/admin/audit/format';

describe('ringkasPayload', () => {
  it('meringkas pasangan kunci-nilai dalam satu baris', () => {
    expect(ringkasPayload({ username: 'op1', peranLama: 'OPERATOR', peranBaru: 'ADMIN' })).toBe(
      'username: op1 · peranLama: OPERATOR · peranBaru: ADMIN',
    );
  });

  it('menampilkan angka, boolean, null, array, dan objek bersarang secara ringkas', () => {
    expect(ringkasPayload({ n: 3, b: true, k: null, a: [1, 2], o: { x: 1 } })).toBe(
      'n: 3 · b: true · k: - · a: [2 item] · o: {…}',
    );
  });

  it('memotong ringkasan yang terlalu panjang dan memberi tanda strip untuk payload kosong', () => {
    const panjang = ringkasPayload({ teks: 'x'.repeat(300) });

    expect(panjang).toHaveLength(120);
    expect(panjang.endsWith('…')).toBe(true);
    expect(ringkasPayload({})).toBe('-');
    expect(ringkasPayload(null)).toBe('-');
    expect(ringkasPayload([1])).toBe('-');
  });
});

describe('queryAudit', () => {
  it('hanya menyertakan nilai yang terisi', () => {
    expect(queryAudit({ aksi: 'LOGIN_GAGAL', aktor: '', page: 2, dari: undefined })).toBe(
      '?aksi=LOGIN_GAGAL&page=2',
    );
    expect(queryAudit({})).toBe('');
  });
});
