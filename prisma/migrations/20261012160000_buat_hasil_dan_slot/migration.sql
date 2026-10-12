-- CreateEnum
CREATE TYPE "KodeSlot" AS ENUM ('W1_UTAMA', 'W1_C1', 'W1_C2', 'W2_UTAMA', 'W2_C1', 'W2_C2');

-- CreateEnum
CREATE TYPE "StatusPemenang" AS ENUM ('MENANG', 'CADANGAN', 'TERVERIFIKASI', 'GUGUR', 'PERLU_KEPUTUSAN');

-- CreateTable
CREATE TABLE "hasil_undian" (
    "id" TEXT NOT NULL,
    "periode_id" TEXT NOT NULL,
    "hasil_hash" TEXT NOT NULL,
    "snapshot_hash" TEXT NOT NULL,
    "isi" JSONB NOT NULL,
    "dimulai_at" TIMESTAMPTZ(3) NOT NULL,
    "selesai_at" TIMESTAMPTZ(3) NOT NULL,
    "uploaded_by_id" TEXT NOT NULL,
    "uploaded_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hasil_undian_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "slot_hasil" (
    "id" TEXT NOT NULL,
    "hasil_id" TEXT NOT NULL,
    "periode_id" TEXT NOT NULL,
    "slot" "KodeSlot" NOT NULL,
    "urutan" INTEGER NOT NULL,
    "wilayah" "KodeWilayah" NOT NULL,
    "snapshot_urut" INTEGER NOT NULL,
    "peserta_id" TEXT NOT NULL,
    "diundi_at" TIMESTAMPTZ(3) NOT NULL,
    "status" "StatusPemenang" NOT NULL,
    "penerima_aktif" BOOLEAN NOT NULL DEFAULT false,
    "alasan_gugur" TEXT,
    "catatan" TEXT,
    "status_changed_by_id" TEXT,
    "status_changed_at" TIMESTAMPTZ(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "slot_hasil_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "riwayat_status_pemenang" (
    "id" TEXT NOT NULL,
    "slot_hasil_id" TEXT NOT NULL,
    "dari" "StatusPemenang" NOT NULL,
    "ke" "StatusPemenang" NOT NULL,
    "alasan_gugur" TEXT,
    "catatan" TEXT,
    "oleh_id" TEXT NOT NULL,
    "at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "riwayat_status_pemenang_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "hasil_undian_periode_id_key" ON "hasil_undian"("periode_id");

-- CreateIndex
CREATE UNIQUE INDEX "slot_hasil_periode_id_slot_key" ON "slot_hasil"("periode_id", "slot");

-- CreateIndex
CREATE UNIQUE INDEX "slot_hasil_periode_id_peserta_id_key" ON "slot_hasil"("periode_id", "peserta_id");

-- CreateIndex
CREATE INDEX "slot_hasil_periode_id_wilayah_idx" ON "slot_hasil"("periode_id", "wilayah");

-- CreateIndex
CREATE INDEX "slot_hasil_hasil_id_idx" ON "slot_hasil"("hasil_id");

-- CreateIndex
CREATE INDEX "riwayat_status_pemenang_slot_hasil_id_at_idx" ON "riwayat_status_pemenang"("slot_hasil_id", "at" DESC);

-- AddForeignKey
ALTER TABLE "hasil_undian" ADD CONSTRAINT "hasil_undian_periode_id_fkey" FOREIGN KEY ("periode_id") REFERENCES "periode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hasil_undian" ADD CONSTRAINT "hasil_undian_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "pengguna"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slot_hasil" ADD CONSTRAINT "slot_hasil_hasil_id_fkey" FOREIGN KEY ("hasil_id") REFERENCES "hasil_undian"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slot_hasil" ADD CONSTRAINT "slot_hasil_periode_id_fkey" FOREIGN KEY ("periode_id") REFERENCES "periode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slot_hasil" ADD CONSTRAINT "slot_hasil_peserta_id_fkey" FOREIGN KEY ("peserta_id") REFERENCES "peserta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slot_hasil" ADD CONSTRAINT "slot_hasil_status_changed_by_id_fkey" FOREIGN KEY ("status_changed_by_id") REFERENCES "pengguna"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "riwayat_status_pemenang" ADD CONSTRAINT "riwayat_status_pemenang_slot_hasil_id_fkey" FOREIGN KEY ("slot_hasil_id") REFERENCES "slot_hasil"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "riwayat_status_pemenang" ADD CONSTRAINT "riwayat_status_pemenang_oleh_id_fkey" FOREIGN KEY ("oleh_id") REFERENCES "pengguna"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Trigger immutable untuk hasil_undian (DATABASE.md §3, §7; menolak UPDATE, DELETE, TRUNCATE lewat tolak_ubah_tabel_immutable)
CREATE TRIGGER "hasil_undian_tolak_update_delete"
  BEFORE UPDATE OR DELETE ON "hasil_undian"
  FOR EACH ROW EXECUTE FUNCTION "tolak_ubah_tabel_immutable"();

CREATE TRIGGER "hasil_undian_tolak_truncate"
  BEFORE TRUNCATE ON "hasil_undian"
  FOR EACH STATEMENT EXECUTE FUNCTION "tolak_ubah_tabel_immutable"();
