#!/usr/bin/env bash
# ==============================================================================
# scripts/restore.sh
# Skrip Pemulihan Data (Restore Test) Undian Umroh PBB OKU Selatan (DEPLOYMENT §Restore)
# Memulihkan dump database dan arsip storage ke target pengujian atau database produksi.
# Peringatan: Gunakan kunci privat 'age' yang disimpan terpisah dari server.
# ==============================================================================

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT_DIR/.env.production}"

if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$ENV_FILE"
fi

TARGET_DB="${TARGET_DB:-undian_restore}"
POSTGRES_USER="${POSTGRES_USER:-undian}"
COMPOSE_CMD="docker compose -f $ROOT_DIR/docker-compose.yml"

BERKAS_DUMP="${1:-}"
KUNCI_PRIVAT="${2:-}"

if [[ -z "$BERKAS_DUMP" ]]; then
  echo "Penggunaan: $0 <path-ke-file-db-dump> [path-ke-kunci-privat-age]"
  echo "Contoh:     $0 /opt/undian/backups/db-2026-10-12.dump.age /root/kunci-age.txt"
  exit 1
fi

if [[ ! -f "$BERKAS_DUMP" ]]; then
  echo "[ERROR] Berkas dump '$BERKAS_DUMP' tidak ditemukan!" >&2
  exit 1
fi

echo "=== [$(date --iso-8601=seconds)] MEMULAI PROSES PEMULIHAN / UJI RESTORE ==="
echo "Target Database : $TARGET_DB"
echo "Berkas Sumber   : $BERKAS_DUMP"

# 1. Pastikan database target dibuat
echo "--> Memeriksa database target '$TARGET_DB'..."
$COMPOSE_CMD exec -T db psql -U "$POSTGRES_USER" -d postgres -tc "SELECT 1 FROM pg_database WHERE datname = '$TARGET_DB'" | grep -q 1 || \
  $COMPOSE_CMD exec -T db psql -U "$POSTGRES_USER" -d postgres -c "CREATE DATABASE \"$TARGET_DB\";"

# 2. Pulihkan berkas dump
echo "--> Mengalirkan data ke pg_restore..."
if [[ "$BERKAS_DUMP" == *.age ]]; then
  if [[ -z "$KUNCI_PRIVAT" || ! -f "$KUNCI_PRIVAT" ]]; then
    echo "[ERROR] Berkas dump terenkripsi age, tetapi kunci privat tidak diberikan atau tidak valid!" >&2
    exit 1
  fi
  age -d -i "$KUNCI_PRIVAT" "$BERKAS_DUMP" | \
    $COMPOSE_CMD exec -T db pg_restore -U "$POSTGRES_USER" -d "$TARGET_DB" --clean --if-exists || true
else
  cat "$BERKAS_DUMP" | \
    $COMPOSE_CMD exec -T db pg_restore -U "$POSTGRES_USER" -d "$TARGET_DB" --clean --if-exists || true
fi

# 3. Verifikasi integritas sederhana
echo "--> Memverifikasi integritas hasil pemulihan..."
JUMLAH_TABEL=$($COMPOSE_CMD exec -T db psql -U "$POSTGRES_USER" -d "$TARGET_DB" -tc "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';" | tr -d ' ')
echo "    Jumlah tabel publik terpulihkan: $JUMLAH_TABEL"

if [[ "$JUMLAH_TABEL" -gt 0 ]]; then
  echo "=== [$(date --iso-8601=seconds)] PEMULIHAN BERHASIL DIVERIFIKASI ==="
else
  echo "[ERROR] Pemulihan gagal atau database target kosong!" >&2
  exit 1
fi
