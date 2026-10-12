-- Impor dan peserta (DATABASE.md §3 impor, peserta; tiket 05).
-- CreateTable
CREATE TABLE "impor" (
    "id" TEXT NOT NULL,
    "periode_id" TEXT NOT NULL,
    "nama_file" TEXT NOT NULL,
    "file_sha256" TEXT NOT NULL,
    "total_baris" INTEGER NOT NULL,
    "jumlah_lolos" INTEGER NOT NULL,
    "jumlah_gugur" INTEGER NOT NULL,
    "ringkasan" JSONB NOT NULL,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "imported_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "impor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "peserta" (
    "id" TEXT NOT NULL,
    "periode_id" TEXT NOT NULL,
    "impor_id" TEXT NOT NULL,
    "baris" INTEGER NOT NULL,
    "nop" TEXT NOT NULL,
    "nik_enc" BYTEA,
    "nik_masked" TEXT NOT NULL,
    "nik_valid" BOOLEAN NOT NULL,
    "nama" TEXT NOT NULL,
    "alamat_wp" TEXT NOT NULL,
    "alamat_op" TEXT NOT NULL,
    "kecamatan_raw" TEXT NOT NULL,
    "kecamatan" TEXT NOT NULL,
    "kelurahan" TEXT NOT NULL,
    "lunas_2022" TIMESTAMPTZ(3),
    "lunas_2023" TIMESTAMPTZ(3),
    "lunas_2024" TIMESTAMPTZ(3),
    "lunas_2025" TIMESTAMPTZ(3),
    "lunas_2026" TIMESTAMPTZ(3),
    "lunas_raw" JSONB NOT NULL,
    "eligible" BOOLEAN NOT NULL,
    "alasan" TEXT[],
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "peserta_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "impor_periode_id_created_at_idx" ON "impor"("periode_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "peserta_periode_id_eligible_idx" ON "peserta"("periode_id", "eligible");

-- CreateIndex
CREATE INDEX "peserta_periode_id_kecamatan_idx" ON "peserta"("periode_id", "kecamatan");

-- CreateIndex
CREATE INDEX "peserta_periode_id_nop_idx" ON "peserta"("periode_id", "nop");

-- CreateIndex
CREATE INDEX "peserta_alasan_idx" ON "peserta" USING GIN ("alasan");

-- CreateIndex
CREATE INDEX "peserta_periode_id_nama_idx" ON "peserta"("periode_id", "nama");

-- AddForeignKey
ALTER TABLE "impor" ADD CONSTRAINT "impor_periode_id_fkey" FOREIGN KEY ("periode_id") REFERENCES "periode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "impor" ADD CONSTRAINT "impor_imported_by_id_fkey" FOREIGN KEY ("imported_by_id") REFERENCES "pengguna"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "peserta" ADD CONSTRAINT "peserta_periode_id_fkey" FOREIGN KEY ("periode_id") REFERENCES "periode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "peserta" ADD CONSTRAINT "peserta_impor_id_fkey" FOREIGN KEY ("impor_id") REFERENCES "impor"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Hanya satu impor aktif per periode; impor ulang menonaktifkan impor lama di transaksi yang sama.
CREATE UNIQUE INDEX "impor_satu_aktif" ON "impor"("periode_id") WHERE "aktif";

