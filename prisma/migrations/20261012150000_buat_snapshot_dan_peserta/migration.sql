-- CreateTable
CREATE TABLE "snapshot" (
    "id" TEXT NOT NULL,
    "periode_id" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "jumlah_w1" INTEGER NOT NULL,
    "jumlah_w2" INTEGER NOT NULL,
    "file_path" TEXT NOT NULL,
    "locked_by_id" TEXT NOT NULL,
    "locked_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "snapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "snapshot_peserta" (
    "snapshot_id" TEXT NOT NULL,
    "urut" INTEGER NOT NULL,
    "peserta_id" TEXT NOT NULL,
    "nop" TEXT NOT NULL,
    "wilayah" "KodeWilayah" NOT NULL,

    CONSTRAINT "snapshot_peserta_pkey" PRIMARY KEY ("snapshot_id","urut")
);

-- CreateIndex
CREATE UNIQUE INDEX "snapshot_periode_id_key" ON "snapshot"("periode_id");

-- CreateIndex
CREATE UNIQUE INDEX "snapshot_peserta_peserta_id_key" ON "snapshot_peserta"("peserta_id");

-- CreateIndex
CREATE UNIQUE INDEX "snapshot_peserta_snapshot_id_nop_key" ON "snapshot_peserta"("snapshot_id", "nop");

-- AddForeignKey
ALTER TABLE "snapshot" ADD CONSTRAINT "snapshot_periode_id_fkey" FOREIGN KEY ("periode_id") REFERENCES "periode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "snapshot" ADD CONSTRAINT "snapshot_locked_by_id_fkey" FOREIGN KEY ("locked_by_id") REFERENCES "pengguna"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "snapshot_peserta" ADD CONSTRAINT "snapshot_peserta_snapshot_id_fkey" FOREIGN KEY ("snapshot_id") REFERENCES "snapshot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "snapshot_peserta" ADD CONSTRAINT "snapshot_peserta_peserta_id_fkey" FOREIGN KEY ("peserta_id") REFERENCES "peserta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Trigger immutable (DATABASE.md §3, §7; tolak UPDATE dan DELETE lewat tolak_ubah_tabel_immutable)
CREATE TRIGGER "snapshot_tolak_update_delete"
  BEFORE UPDATE OR DELETE ON "snapshot"
  FOR EACH ROW EXECUTE FUNCTION "tolak_ubah_tabel_immutable"();

CREATE TRIGGER "snapshot_tolak_truncate"
  BEFORE TRUNCATE ON "snapshot"
  FOR EACH STATEMENT EXECUTE FUNCTION "tolak_ubah_tabel_immutable"();

CREATE TRIGGER "snapshot_peserta_tolak_update_delete"
  BEFORE UPDATE OR DELETE ON "snapshot_peserta"
  FOR EACH ROW EXECUTE FUNCTION "tolak_ubah_tabel_immutable"();

CREATE TRIGGER "snapshot_peserta_tolak_truncate"
  BEFORE TRUNCATE ON "snapshot_peserta"
  FOR EACH STATEMENT EXECUTE FUNCTION "tolak_ubah_tabel_immutable"();
