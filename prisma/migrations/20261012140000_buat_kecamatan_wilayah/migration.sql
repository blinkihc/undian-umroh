-- Pemetaan kecamatan ke wilayah (DATABASE.md §3 kecamatan_wilayah; tiket 08).
-- CreateTable
CREATE TABLE "kecamatan_wilayah" (
    "id" TEXT NOT NULL,
    "periode_id" TEXT NOT NULL,
    "kecamatan" TEXT NOT NULL,
    "wilayah_id" TEXT,

    CONSTRAINT "kecamatan_wilayah_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "kecamatan_wilayah_periode_id_kecamatan_key" ON "kecamatan_wilayah"("periode_id", "kecamatan");

-- AddForeignKey
ALTER TABLE "kecamatan_wilayah" ADD CONSTRAINT "kecamatan_wilayah_periode_id_fkey" FOREIGN KEY ("periode_id") REFERENCES "periode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kecamatan_wilayah" ADD CONSTRAINT "kecamatan_wilayah_wilayah_id_fkey" FOREIGN KEY ("wilayah_id") REFERENCES "wilayah"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


