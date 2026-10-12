import { bentukHasil, type HasilApi } from './api';

/**
 * Unggah `multipart/form-data` dengan laporan kemajuan unggah (fetch belum menyediakannya).
 * `onKemajuan` menerima 0–1 selama unggah, lalu 1 saat server mulai memproses.
 */
export function unggahForm<T>(
  url: string,
  form: FormData,
  onKemajuan: (bagian: number) => void,
): Promise<HasilApi<T>> {
  return new Promise((selesai) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.withCredentials = true;
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) onKemajuan(event.loaded / event.total);
    };
    xhr.upload.onload = () => {
      onKemajuan(1);
    };
    xhr.onload = () => {
      let data: unknown = null;
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        data = null;
      }
      selesai(bentukHasil<T>(xhr.status, data));
    };
    xhr.onerror = () => {
      selesai({
        ok: false,
        status: 0,
        code: 'JARINGAN',
        message: 'Unggahan terputus. Data belum tersimpan. Ulangi unggah dari awal.',
        fields: {},
        details: {},
      });
    };
    xhr.send(form);
  });
}
