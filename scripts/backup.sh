#!/usr/bin/env bash
# ==============================================================================
# scripts/backup.sh
# Skrip Backup Terenkripsi Harian Undian Umroh PBB OKU Selatan (DEPLOYMENT §Backup)
# Menjalankan dump database PostgreSQL & arsip penyimpanan storage, mengenkripsi
# dengan kunci publik 'age', serta menerapkan rotasi 30 hari (harian) dan 365 hari (bulanan).
# ==============================================================================

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT_DIR/.env.production}"

if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$ENV_FILE"
else
  echo "[ERROR] File konfigurasi lingkungan '$ENV_FILE' tidak ditemukan!" >&2
  exit 1
fi

BACKUP_DIR="${BACKUP_DIR:-/opt/undian/backups}"
mkdir -p "$BACKUP_DIR"

POSTGRES_USER="${POSTGRES_USER:-undian}"
POSTGRES_DB="${POSTGRES_DB:-undian}"
BACKUP_AGE_RECIPIENT="${BACKUP_AGE_RECIPIENT:-}"
STATUS_FILE="$BACKUP_DIR/.last_backup_status"

TS="$(date +%F)"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
DB_DUMP_FILE="$BACKUP_DIR/db-$TS.dump"
STORAGE_TAR_FILE="$BACKUP_DIR/storage-$TS.tar"

echo "=== [$(date --iso-8601=seconds)] MEMULAI PROSES BACKUP ==="

# 1. Pastikan docker compose aktif
COMPOSE_CMD="docker compose -f $ROOT_DIR/docker-compose.yml"

# 2. Dump PostgreSQL 16
echo "--> Melakukan pg_dump database '$POSTGRES_DB'..."
if command -v age >/dev/null 2>&1 && [[ -n "$BACKUP_AGE_RECIPIENT" ]]; then
  $COMPOSE_CMD exec -T db pg_dump -U "$POSTGRES_USER" -Fc "$POSTGRES_DB" | age -r "$BACKUP_AGE_RECIPIENT" > "$DB_DUMP_FILE.age"
  echo "    Tersimpan terenkripsi: $DB_DUMP_FILE.age"
else
  echo "[PERINGATAN] Kunci age/perintah age tidak tersedia, menyimpan dump format kustom terkompresi..."
  $COMPOSE_CMD exec -T db pg_dump -U "$POSTGRES_USER" -Fc "$POSTGRES_DB" > "$DB_DUMP_FILE"
  echo "    Tersimpan: $DB_DUMP_FILE"
fi

# 3. Arsipkan direktori storage / volume app-storage
echo "--> Mengarsipkan berkas penyimpanan aplikasi..."
STORAGE_PATH="${STORAGE_DIR:-$ROOT_DIR/.storage}"
if [[ -d "$STORAGE_PATH" ]]; then
  if command -v age >/dev/null 2>&1 && [[ -n "$BACKUP_AGE_RECIPIENT" ]]; then
    tar -C "$STORAGE_PATH" -cf - . | age -r "$BACKUP_AGE_RECIPIENT" > "$STORAGE_TAR_FILE.age"
    echo "    Tersimpan terenkripsi: $STORAGE_TAR_FILE.age"
  else
    tar -C "$STORAGE_PATH" -czf "$STORAGE_TAR_FILE.gz" .
    echo "    Tersimpan: $STORAGE_TAR_FILE.gz"
  fi
else
  echo "[INFO] Direktori storage fisik '$STORAGE_PATH' belum berisi berkas, melewati arsip storage."
fi

# 4. Rotasi Berkas Backup
# - Harian: hapus file > 30 hari yang BUKAN tanggal 01 (-01)
# - Bulanan: hapus file tanggal 01 (-01) yang berumur > 365 hari
echo "--> Menerapkan kebijakan rotasi backup..."
find "$BACKUP_DIR" -type f \( -name 'db-*.dump*' -o -name 'storage-*.tar*' \) -mtime +30 ! -name '*-01.*' -delete
find "$BACKUP_DIR" -type f \( -name 'db-*-01.*' -o -name 'storage-*-01.*' \) -mtime +365 -delete

# 5. Catat timestamp keberhasilan untuk pemantau (watch.sh)
echo "SUCCESS:$TIMESTAMP" > "$STATUS_FILE"

echo "=== [$(date --iso-8601=seconds)] PROSES BACKUP SELESAI DENGAN SUKSES ==="
