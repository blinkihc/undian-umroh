-- Optimistic concurrency untuk perubahan akun oleh Admin (API.md §1, PATCH /api/pengguna/:id).
ALTER TABLE "pengguna" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "pengguna" ADD CONSTRAINT "pengguna_version_positif_check" CHECK ("version" >= 1);
