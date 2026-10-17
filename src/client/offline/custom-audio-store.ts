/**
 * Penyimpanan berkas audio kustom fase mengacak & pemenang di IndexedDB.
 * Menyimpan Blob audio agar tidak hilang saat halaman di-refresh tanpa perlu unggah ke server.
 */

const NAMA_DB = 'undian_umroh_audio_kustom';
const VERSI_DB = 1;

type RekamanAudioKustom = {
  fase: 'mengacak' | 'pemenang';
  blob: Blob;
  nama: string;
  ukuranBytes: number;
  tipeMime: string;
  diunggahAt: string;
};

function bukaDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB tidak didukung pada lingkungan ini.'));
      return;
    }

    const request = indexedDB.open(NAMA_DB, VERSI_DB);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('fase_audio')) {
        db.createObjectStore('fase_audio', { keyPath: 'fase' });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(new Error(request.error?.message ?? 'Gagal membuka IndexedDB Audio Kustom.'));
    };
  });
}

export async function simpanAudioKustomFase(
  fase: 'mengacak' | 'pemenang',
  berkas: File | Blob,
  namaBerkas?: string,
): Promise<{ url: string; nama: string }> {
  const db = await bukaDatabase();
  const nama = namaBerkas ?? (berkas instanceof File ? berkas.name : `audio_${fase}.mp3`);

  const rekaman: RekamanAudioKustom = {
    fase,
    blob: berkas,
    nama,
    ukuranBytes: berkas.size,
    tipeMime: berkas.type || 'audio/mpeg',
    diunggahAt: new Date().toISOString(),
  };

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('fase_audio', 'readwrite');
    const store = tx.objectStore('fase_audio');
    const putReq = store.put(rekaman);

    putReq.onsuccess = () => resolve();
    putReq.onerror = () => reject(new Error(putReq.error?.message ?? 'Gagal menyimpan audio kustom.'));
  });

  const url = URL.createObjectURL(berkas);
  return { url, nama };
}

export async function ambilAudioKustomFase(
  fase: 'mengacak' | 'pemenang',
): Promise<{ blob: Blob; nama: string; url: string } | null> {
  if (typeof indexedDB === 'undefined') return null;

  try {
    const db = await bukaDatabase();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction('fase_audio', 'readonly');
      const store = tx.objectStore('fase_audio');
      const getReq = store.get(fase);

      getReq.onsuccess = () => {
        const item = getReq.result as RekamanAudioKustom | undefined;
        if (!item || !item.blob) {
          resolve(null);
          return;
        }
        const url = URL.createObjectURL(item.blob);
        resolve({ blob: item.blob, nama: item.nama, url });
      };

      getReq.onerror = () => {
        reject(new Error(getReq.error?.message ?? 'Gagal mengambil audio kustom.'));
      };
    });
  } catch {
    return null;
  }
}

export async function hapusAudioKustomFase(fase: 'mengacak' | 'pemenang'): Promise<void> {
  if (typeof indexedDB === 'undefined') return;

  try {
    const db = await bukaDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('fase_audio', 'readwrite');
      const store = tx.objectStore('fase_audio');
      const delReq = store.delete(fase);

      delReq.onsuccess = () => resolve();
      delReq.onerror = () => reject(new Error(delReq.error?.message ?? 'Gagal menghapus audio kustom.'));
    });
  } catch {
    // Abaikan jika tidak ditemukan
  }
}
