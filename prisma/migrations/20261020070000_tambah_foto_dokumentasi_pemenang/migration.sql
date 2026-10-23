-- AlterTable
ALTER TABLE "slot_hasil" ADD COLUMN "diserahkan_at" TIMESTAMPTZ(3),
ADD COLUMN "diserahkan_catatan" TEXT,
ADD COLUMN "foto_dokumentasi" TEXT[] DEFAULT ARRAY[]::TEXT[];
