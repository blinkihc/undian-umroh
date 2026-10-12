-- Periode undian dan dua wilayahnya (DATABASE.md §3 periode, wilayah; tiket 04).

-- CreateEnum
CREATE TYPE "StatusPeriode" AS ENUM ('DRAF', 'TERKUNCI', 'DIUNDI', 'FINAL', 'DIPUBLIKASI', 'DIBATALKAN');

-- CreateEnum
CREATE TYPE "KodeWilayah" AS ENUM ('W1', 'W2');

-- CreateTable
CREATE TABLE "periode" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "judul" TEXT NOT NULL,
    "tahun_awal" INTEGER NOT NULL DEFAULT 2022,
    "tahun_akhir" INTEGER NOT NULL DEFAULT 2026,
    "batas_lunas" TIMESTAMPTZ(3) NOT NULL,
    "tanggal_acara" DATE,
    "lokasi_acara" TEXT,
    "status" "StatusPeriode" NOT NULL DEFAULT 'DRAF',
    "published_at" TIMESTAMPTZ(3),
    "alasan_batal" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "periode_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "periode_tahun_check" CHECK ("tahun_awal" <= "tahun_akhir"),
    CONSTRAINT "periode_version_positif_check" CHECK ("version" >= 1),
    CONSTRAINT "periode_alasan_batal_check" CHECK (
        "status" <> 'DIBATALKAN'
        OR ("alasan_batal" IS NOT NULL AND length(btrim("alasan_batal")) >= 10)
    )
);

-- CreateTable
CREATE TABLE "wilayah" (
    "id" TEXT NOT NULL,
    "periode_id" TEXT NOT NULL,
    "kode" "KodeWilayah" NOT NULL,
    "nama" TEXT NOT NULL,

    CONSTRAINT "wilayah_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "wilayah_nama_check" CHECK (length(btrim("nama")) BETWEEN 1 AND 50)
);

-- CreateIndex
CREATE UNIQUE INDEX "periode_slug_key" ON "periode"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "wilayah_periode_id_kode_key" ON "wilayah"("periode_id", "kode");

-- Hanya satu periode aktif pada satu waktu (PRD A4, DATABASE §5). Prisma tidak dapat
-- menyatakan index parsial berekspresi, jadi ditulis manual di sini.
CREATE UNIQUE INDEX "periode_satu_aktif" ON "periode" ((true))
    WHERE "status" NOT IN ('DIPUBLIKASI', 'DIBATALKAN');

-- AddForeignKey
ALTER TABLE "periode" ADD CONSTRAINT "periode_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "pengguna"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wilayah" ADD CONSTRAINT "wilayah_periode_id_fkey" FOREIGN KEY ("periode_id") REFERENCES "periode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
