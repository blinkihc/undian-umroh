-- CreateEnum
CREATE TYPE "Peran" AS ENUM ('ADMIN', 'OPERATOR');

-- CreateTable
CREATE TABLE "pengguna" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "peran" "Peran" NOT NULL,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "must_change_password" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "pengguna_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" BIGSERIAL NOT NULL,
    "at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aktor_id" TEXT,
    "aktor_label" TEXT NOT NULL,
    "aksi" TEXT NOT NULL,
    "target_tipe" TEXT NOT NULL,
    "target_id" TEXT,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "ip" INET,
    "user_agent" VARCHAR(256),

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pengguna_username_key" ON "pengguna"("username");

-- CreateIndex
CREATE INDEX "audit_log_at_idx" ON "audit_log"("at" DESC);

-- CreateIndex
CREATE INDEX "audit_log_aksi_at_idx" ON "audit_log"("aksi", "at" DESC);

-- CreateIndex
CREATE INDEX "audit_log_aktor_id_at_idx" ON "audit_log"("aktor_id", "at" DESC);

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_aktor_id_fkey" FOREIGN KEY ("aktor_id") REFERENCES "pengguna"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- SQL manual (tidak dihasilkan Prisma) ----------------------------------------------------------

-- Username: huruf kecil, 3-32 karakter [a-z0-9._-] (DATABASE.md, tabel pengguna).
ALTER TABLE "pengguna" ADD CONSTRAINT "pengguna_username_format_check"
  CHECK ("username" ~ '^[a-z0-9._-]{3,32}$');

-- audit_log append-only (SECURITY.md §9, DATABASE.md §7). Fungsi ini dipakai ulang oleh tabel
-- immutable lain (snapshot, snapshot_peserta, hasil_undian) pada migrasi tiket pemiliknya.
CREATE FUNCTION "tolak_ubah_tabel_immutable"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Tabel % bersifat immutable; operasi % ditolak.', TG_TABLE_NAME, TG_OP
    USING ERRCODE = 'restrict_violation';
END;
$$;

CREATE TRIGGER "audit_log_tolak_update_delete"
  BEFORE UPDATE OR DELETE ON "audit_log"
  FOR EACH ROW EXECUTE FUNCTION "tolak_ubah_tabel_immutable"();

-- TRUNCATE tidak memicu trigger baris, jadi dijaga dengan trigger pernyataan terpisah.
CREATE TRIGGER "audit_log_tolak_truncate"
  BEFORE TRUNCATE ON "audit_log"
  FOR EACH STATEMENT EXECUTE FUNCTION "tolak_ubah_tabel_immutable"();
