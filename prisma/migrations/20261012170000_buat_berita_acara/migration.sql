-- CreateTable
CREATE TABLE "berita_acara" (
    "id" TEXT NOT NULL,
    "periode_id" TEXT NOT NULL,
    "isi" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "updated_by_id" TEXT NOT NULL,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "berita_acara_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "berita_acara_periode_id_key" ON "berita_acara"("periode_id");

-- AddForeignKey
ALTER TABLE "berita_acara" ADD CONSTRAINT "berita_acara_periode_id_fkey" FOREIGN KEY ("periode_id") REFERENCES "periode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "berita_acara" ADD CONSTRAINT "berita_acara_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "pengguna"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
