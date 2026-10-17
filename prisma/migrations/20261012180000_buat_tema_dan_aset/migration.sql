-- CreateEnum
CREATE TYPE "JenisAset" AS ENUM ('AUDIO', 'GAMBAR');

-- CreateEnum
CREATE TYPE "FaseAudio" AS ENUM ('MENUNGGU', 'MENGACAK', 'PEMENANG');

-- CreateEnum
CREATE TYPE "SumberTema" AS ENUM ('MANUAL', 'AI');

-- AlterTable
ALTER TABLE "periode" ADD COLUMN "tema_id" TEXT;

-- CreateTable
CREATE TABLE "tema" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "config_hash" TEXT NOT NULL,
    "sumber" "SumberTema" NOT NULL DEFAULT 'MANUAL',
    "bawaan" BOOLEAN NOT NULL DEFAULT false,
    "created_by_id" TEXT NOT NULL,
    "updated_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "tema_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aset" (
    "id" TEXT NOT NULL,
    "jenis" "JenisAset" NOT NULL,
    "fase" "FaseAudio",
    "nama" TEXT NOT NULL,
    "deskripsi" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "ukuran" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "durasi_detik" DECIMAL(6,2),
    "lisensi" TEXT NOT NULL,
    "bawaan" BOOLEAN NOT NULL DEFAULT false,
    "created_by_id" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "aset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "aset_sha256_key" ON "aset"("sha256");

-- CreateIndex
CREATE INDEX "aset_jenis_fase_idx" ON "aset"("jenis", "fase");

-- AddForeignKey
ALTER TABLE "periode" ADD CONSTRAINT "periode_tema_id_fkey" FOREIGN KEY ("tema_id") REFERENCES "tema"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tema" ADD CONSTRAINT "tema_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "pengguna"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tema" ADD CONSTRAINT "tema_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "pengguna"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aset" ADD CONSTRAINT "aset_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "pengguna"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
