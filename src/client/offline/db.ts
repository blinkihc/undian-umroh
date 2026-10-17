import { type MetaData } from '@/lib/package/kontrak';
import { type SnapshotData } from '@/lib/package/snapshot';
import { type ThemeConfig } from '@/lib/package/theme';
import { type StateUndian } from '@/lib/draw/types';

const NAMA_DB = 'undian_umroh_offline';
const VERSI_DB = 1;

export type PaketTersimpan = {
  periodeId: string;
  meta: MetaData;
  snapshot: SnapshotData;
  tema: ThemeConfig;
  dimuatAt: string;
};

/**
 * Membuka koneksi IndexedDB dengan penanganan upgrade skema.
 */
function bukaDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB tidak didukung pada lingkungan ini.'));
      return;
    }

    const request = indexedDB.open(NAMA_DB, VERSI_DB);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('paket')) {
        db.createObjectStore('paket', { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains('state')) {
        db.createObjectStore('state', { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains('perangkat')) {
        db.createObjectStore('perangkat', { keyPath: 'key' });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };
    request.onerror = () => {
      reject(new Error(request.error?.message ?? 'Gagal membuka IndexedDB'));
    };
  });
}

/**
 * Menyimpan paket yang telah divalidasi ke IndexedDB.
 */
export async function simpanPaketKeDb(paket: PaketTersimpan): Promise<void> {
  const db = await bukaDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['paket'], 'readwrite');
    const store = tx.objectStore('paket');
    const item = { key: 'aktif', ...paket };
    const req = store.put(item);

    req.onsuccess = () => {
      resolve();
    };
    req.onerror = () => {
      reject(new Error(req.error?.message ?? 'Gagal menyimpan paket'));
    };
  });
}

/**
 * Membaca paket aktif dari IndexedDB.
 */
export async function bacaPaketDariDb(): Promise<PaketTersimpan | null> {
  const db = await bukaDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['paket'], 'readonly');
    const store = tx.objectStore('paket');
    const req = store.get('aktif');

    req.onsuccess = () => {
      const data = req.result as ({ key: string } & PaketTersimpan) | undefined;
      if (data === undefined) {
        resolve(null);
      } else {
        const { key: _, ...rest } = data;
        resolve(rest);
      }
    };
    req.onerror = () => {
      reject(new Error(req.error?.message ?? 'Gagal membaca paket'));
    };
  });
}

/**
 * Menyimpan state progres undian secara atomik ke IndexedDB (Tiket 15: Pulih setelah crash).
 */
export async function simpanStateKeDb(state: StateUndian): Promise<void> {
  const db = await bukaDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['state'], 'readwrite');
    const store = tx.objectStore('state');
    const req = store.put({ key: 'undian', ...state });

    req.onsuccess = () => {
      resolve();
    };
    req.onerror = () => {
      reject(new Error(req.error?.message ?? 'Gagal menyimpan state'));
    };
  });
}

/**
 * Membaca state progres undian dari IndexedDB.
 */
export async function bacaStateDariDb(): Promise<StateUndian | null> {
  const db = await bukaDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['state'], 'readonly');
    const store = tx.objectStore('state');
    const req = store.get('undian');

    req.onsuccess = () => {
      const data = req.result as ({ key: string } & StateUndian) | undefined;
      if (data === undefined) {
        resolve(null);
      } else {
        const { key: _, ...rest } = data;
        resolve(rest);
      }
    };
    req.onerror = () => {
      reject(new Error(req.error?.message ?? 'Gagal membaca state'));
    };
  });
}

/**
 * Menghapus data paket dan state undian dari IndexedDB.
 */
export async function hapusDataUndianDariDb(): Promise<void> {
  const db = await bukaDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['paket', 'state'], 'readwrite');
    tx.objectStore('paket').clear();
    tx.objectStore('state').clear();

    tx.oncomplete = () => {
      resolve();
    };
    tx.onerror = () => {
      reject(new Error(tx.error?.message ?? 'Gagal membersihkan data IndexedDB'));
    };
  });
}

/**
 * Menghapus hanya state progres undian tanpa menghapus paket data peserta.
 */
export async function resetStateUndianDb(): Promise<void> {
  const db = await bukaDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['state'], 'readwrite');
    tx.objectStore('state').clear();

    tx.oncomplete = () => {
      resolve();
    };
    tx.onerror = () => {
      reject(new Error(tx.error?.message ?? 'Gagal mengosongkan state undian'));
    };
  });
}

/**
 * Membaca atau membuat ID perangkat unik per instalasi browser/PWA.
 */
export async function ambilPerangkatId(): Promise<string> {
  const db = await bukaDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['perangkat'], 'readwrite');
    const store = tx.objectStore('perangkat');
    const req = store.get('id');

    req.onsuccess = () => {
      const ada = req.result as { key: string; value: string } | undefined;
      if (ada !== undefined) {
        resolve(ada.value);
      } else {
        const buffer = new Uint8Array(8);
        crypto.getRandomValues(buffer);
        let idBaru = 'dev_';
        for (const b of buffer) {
          idBaru += b.toString(16).padStart(2, '0');
        }
        store.put({ key: 'id', value: idBaru });
        resolve(idBaru);
      }
    };
    req.onerror = () => {
      reject(new Error(req.error?.message ?? 'Gagal mengakses perangkat ID'));
    };
  });
}
