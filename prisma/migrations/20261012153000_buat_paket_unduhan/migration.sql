-- CreateTable
CREATE TABLE "paket_unduhan" (
    "id" TEXT NOT NULL,
    "periode_id" TEXT NOT NULL,
    "snapshot_hash" TEXT NOT NULL,
    "tema_config_hash" TEXT NOT NULL,
    "paket_sha256" TEXT NOT NULL,
    "unduh_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "paket_unduhan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "paket_unduhan_periode_id_created_at_idx" ON "paket_unduhan"("periode_id", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "paket_unduhan" ADD CONSTRAINT "paket_unduhan_periode_id_fkey" FOREIGN KEY ("periode_id") REFERENCES "periode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paket_unduhan" ADD CONSTRAINT "paket_unduhan_unduh_by_id_fkey" FOREIGN KEY ("unduh_by_id") REFERENCES "pengguna"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
