/**
 * Modul murni logika tantangan dan solusi Captcha Proof-of-Work (SECURITY §5, DECISIONS 020).
 * Tanpa skrip pihak ketiga, kompatibel di server dan browser.
 */

export type TantanganCaptcha = {
  salt: string;
  target: string;
  expiresAt: string;
  signature: string;
};

export type SolusiCaptcha = {
  salt: string;
  nonce: number;
  expiresAt: string;
  signature: string;
};

/**
 * Pemecah proof-of-work di sisi klien.
 * Mencari nonce sedemikian rupa sehingga sha256Hex(`${salt}:${nonce}`) berawalan dengan `target`.
 */
export async function pecahkanCaptcha(tantangan: TantanganCaptcha): Promise<SolusiCaptcha> {
  const { salt, target, expiresAt, signature } = tantangan;
  const encoder = new TextEncoder();
  const targetLen = target.length;
  let nonce = 0;

  while (true) {
    const data = encoder.encode(`${salt}:${nonce}`);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = new Uint8Array(hashBuffer);

    let cocok = true;
    for (let i = 0; i < targetLen; i++) {
      const byte = hashArray[Math.floor(i / 2)] ?? 0;
      const nibble = i % 2 === 0 ? (byte >> 4) & 0x0f : byte & 0x0f;
      const targetChar = target[i] ?? '0';
      const targetNibble = parseInt(targetChar, 16);
      if (nibble !== targetNibble) {
        cocok = false;
        break;
      }
    }

    if (cocok) {
      return { salt, nonce, expiresAt, signature };
    }
    nonce++;
  }
}
