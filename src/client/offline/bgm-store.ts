/**
 * Penyimpanan audio Musik Latar (BGM) berbasis IndexedDB.
 * Menyimpan berkas audio (Blob) secara persisten di peramban untuk mode offline
 * dan sinkronisasi antara menu Pengaturan Admin dan Layar Undian Operator.
 */

export type BgmTipeTrack = 'standby' | 'tegang' | 'playlist';

export type BgmTrack = {
  id: string;
  nama: string;
  durasiDetik: number;
  tipe: BgmTipeTrack;
  blob: Blob;
  ukuranBytes: number;
  diunggahAt: string;
};

export type BgmSettings = {
  key: string;
  autoplay: boolean;
  loop: boolean;
  volumeDefault: number; // 0 - 100
  standbyTrackId: string | null;
  tegangTrackId: string | null;
};

const NAMA_DB = 'undian_umroh_bgm';
const VERSI_DB = 1;

export const PENGATURAN_BGM_DEFAULT: BgmSettings = {
  key: 'bgm_config',
  autoplay: false,
  loop: true,
  volumeDefault: 70,
  standbyTrackId: null,
  tegangTrackId: null,
};

function bukaBgmDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB tidak didukung pada peramban ini.'));
      return;
    }

    const request = indexedDB.open(NAMA_DB, VERSI_DB);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('tracks')) {
        db.createObjectStore('tracks', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(new Error(request.error?.message ?? 'Gagal membuka IndexedDB BGM'));
    };
  });
}

/**
 * Menghitung durasi berkas audio menggunakan elemen audio HTML5.
 */
export function hitungDurasiAudio(file: Blob): Promise<number> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(0);
      return;
    }
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    audio.preload = 'metadata';

    const bersihkan = (): void => {
      audio.removeEventListener('loadedmetadata', onLoaded);
      audio.removeEventListener('error', onError);
      URL.revokeObjectURL(url);
    };

    const onLoaded = (): void => {
      const durasi = Math.round(audio.duration || 0);
      bersihkan();
      resolve(durasi);
    };

    const onError = (): void => {
      bersihkan();
      resolve(0);
    };

    audio.addEventListener('loadedmetadata', onLoaded);
    audio.addEventListener('error', onError);
    audio.src = url;
  });
}

/**
 * Format detik menjadi format "MM:SS".
 */
export function formatDurasiMenitDetik(detik: number): string {
  if (!Number.isFinite(detik) || detik <= 0) return '0:00';
  const menit = Math.floor(detik / 60);
  const sisaDetik = Math.floor(detik % 60);
  return `${menit}:${sisaDetik.toString().padStart(2, '0')}`;
}

/**
 * Menyimpan berkas audio ke IndexedDB.
 */
export async function simpanTrackBgm(
  file: File | Blob,
  nama: string,
  tipe: BgmTipeTrack,
): Promise<BgmTrack> {
  const durasiDetik = await hitungDurasiAudio(file);
  const id = `track_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const track: BgmTrack = {
    id,
    nama,
    durasiDetik,
    tipe,
    blob: file,
    ukuranBytes: file.size,
    diunggahAt: new Date().toISOString(),
  };

  const db = await bukaBgmDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(['tracks'], 'readwrite');
    const store = tx.objectStore('tracks');
    const req = store.put(track);

    req.onsuccess = () => resolve();
    req.onerror = () => reject(new Error(req.error?.message ?? 'Gagal menyimpan track audio'));
  });

  // Jika tipe standby atau tegang, otomatis tautkan di pengaturan
  if (tipe === 'standby') {
    await simpanPengaturanBgm({ standbyTrackId: id });
  } else if (tipe === 'tegang') {
    await simpanPengaturanBgm({ tegangTrackId: id });
  }

  return track;
}

/**
 * Mengambil daftar seluruh track audio dari IndexedDB.
 */
export async function daftarTrackBgm(): Promise<BgmTrack[]> {
  const db = await bukaBgmDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['tracks'], 'readonly');
    const store = tx.objectStore('tracks');
    const req = store.getAll();

    req.onsuccess = () => {
      resolve((req.result as BgmTrack[]) ?? []);
    };
    req.onerror = () => {
      reject(new Error(req.error?.message ?? 'Gagal membaca daftar track audio'));
    };
  });
}

/**
 * Mengambil satu track audio berdasarkan ID.
 */
export async function ambilTrackBgm(id: string): Promise<BgmTrack | null> {
  const db = await bukaBgmDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['tracks'], 'readonly');
    const store = tx.objectStore('tracks');
    const req = store.get(id);

    req.onsuccess = () => {
      resolve((req.result as BgmTrack) ?? null);
    };
    req.onerror = () => {
      reject(new Error(req.error?.message ?? 'Gagal membaca track audio'));
    };
  });
}

/**
 * Menghapus track audio dari IndexedDB.
 */
export async function hapusTrackBgm(id: string): Promise<void> {
  const db = await bukaBgmDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(['tracks'], 'readwrite');
    const store = tx.objectStore('tracks');
    const req = store.delete(id);

    req.onsuccess = () => resolve();
    req.onerror = () => reject(new Error(req.error?.message ?? 'Gagal menghapus track audio'));
  });

  // Bersihkan dari pengaturan jika sedang menjadi slot aktif
  const settings = await bacaPengaturanBgm();
  let perluUpdate = false;
  const update: Partial<BgmSettings> = {};

  if (settings.standbyTrackId === id) {
    update.standbyTrackId = null;
    perluUpdate = true;
  }
  if (settings.tegangTrackId === id) {
    update.tegangTrackId = null;
    perluUpdate = true;
  }

  if (perluUpdate) {
    await simpanPengaturanBgm(update);
  }
}

/**
 * Membaca konfigurasi preferensi BGM dari IndexedDB.
 */
export async function bacaPengaturanBgm(): Promise<BgmSettings> {
  try {
    const db = await bukaBgmDb();
    return await new Promise((resolve) => {
      const tx = db.transaction(['settings'], 'readonly');
      const store = tx.objectStore('settings');
      const req = store.get(PENGATURAN_BGM_DEFAULT.key);

      req.onsuccess = () => {
        if (req.result) {
          resolve({ ...PENGATURAN_BGM_DEFAULT, ...(req.result as Partial<BgmSettings>) });
        } else {
          resolve(PENGATURAN_BGM_DEFAULT);
        }
      };
      req.onerror = () => {
        resolve(PENGATURAN_BGM_DEFAULT);
      };
    });
  } catch {
    return PENGATURAN_BGM_DEFAULT;
  }
}

/**
 * Menyimpan konfigurasi preferensi BGM ke IndexedDB.
 */
export async function simpanPengaturanBgm(
  perubahan: Partial<BgmSettings>,
): Promise<BgmSettings> {
  const sekarang = await bacaPengaturanBgm();
  const baru: BgmSettings = {
    ...sekarang,
    ...perubahan,
    key: PENGATURAN_BGM_DEFAULT.key,
  };

  const db = await bukaBgmDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(['settings'], 'readwrite');
    const store = tx.objectStore('settings');
    const req = store.put(baru);

    req.onsuccess = () => resolve();
    req.onerror = () => reject(new Error(req.error?.message ?? 'Gagal menyimpan pengaturan BGM'));
  });

  return baru;
}
