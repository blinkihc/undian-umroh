#!/usr/bin/env bash
# ==============================================================================
# scripts/watch.sh
# Skrip Pemantau Sederhana Undian Umroh PBB OKU Selatan (OBSERVABILITY §Monitoring)
# Memeriksa kapasitas disk, umur backup terakhir, dan kesehatan kontainer.
# ==============================================================================

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-/opt/undian/backups}"
STATUS_FILE="$BACKUP_DIR/.last_backup_status"
APP_URL="${APP_URL:-http://localhost:3000}"

KODE_KELUAR=0
PESAN_PERINGATAN=()

echo "=== [$(date --iso-8601=seconds)] PEMERIKSAAN KESEHATAN SISTEM ==="

# 1. Periksa Kapasitas Disk (Root dan Direktori Backup)
DISK_USAGE=$(df -h "$ROOT_DIR" | awk 'NR==2 {print $5}' | tr -d '%')
echo "--> Pemakaian disk: ${DISK_USAGE}%"
if [[ "$DISK_USAGE" -ge 90 ]]; then
  PESAN_PERINGATAN+=("[KRITIS] Kapasitas disk mencapai ${DISK_USAGE}% (ambang kritis 90%)!")
  KODE_KELUAR=2
elif [[ "$DISK_USAGE" -ge 80 ]]; then
  PESAN_PERINGATAN+=("[PERINGATAN] Kapasitas disk mencapai ${DISK_USAGE}% (ambang peringatan 80%)!")
  [[ $KODE_KELUAR -lt 1 ]] && KODE_KELUAR=1
fi

# 2. Periksa Umur dan Status Backup Terakhir
if [[ -f "$STATUS_FILE" ]]; then
  STATUS_TERAKHIR=$(cat "$STATUS_FILE")
  echo "--> Catatan backup terakhir: $STATUS_TERAKHIR"
  
  if [[ "$STATUS_TERAKHIR" == FAILED* ]]; then
    PESAN_PERINGATAN+=("[KRITIS] Backup terakhir berstatus GAGAL!")
    KODE_KELUAR=2
  fi

  # Hitung umur file dalam jam
  MOD_TIME=$(stat -c %Y "$STATUS_FILE" 2>/dev/null || stat -f %m "$STATUS_FILE" 2>/dev/null || echo 0)
  SEKARANG=$(date +%s)
  SELISIH_DETIK=$((SEKARANG - MOD_TIME))
  SELISIH_JAM=$((SELISIH_DETIK / 3600))
  echo "    Umur backup: ${SELISIH_JAM} jam"

  if [[ "$SELISIH_JAM" -ge 26 ]]; then
    PESAN_PERINGATAN+=("[PERINGATAN] Backup terakhir berumur ${SELISIH_JAM} jam (melebihi batas 26 jam)!")
    [[ $KODE_KELUAR -lt 1 ]] && KODE_KELUAR=1
  fi
else
  PESAN_PERINGATAN+=("[PERINGATAN] Berkas status backup belum ditemukan di '$STATUS_FILE'!")
  [[ $KODE_KELUAR -lt 1 ]] && KODE_KELUAR=1
fi

# 3. Periksa Endpoint Kesehatan Aplikasi (/api/health)
echo "--> Memeriksa endpoint kesehatan: $APP_URL/api/health"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$APP_URL/api/health" || echo "000")
if [[ "$HTTP_CODE" == "200" ]]; then
  echo "    Status API: Sehat (HTTP 200)"
else
  PESAN_PERINGATAN+=("[KRITIS] Endpoint /api/health mengembalikan HTTP ${HTTP_CODE}!")
  KODE_KELUAR=2
fi

# 4. Ringkasan Hasil
echo "--------------------------------------------------"
if [[ ${#PESAN_PERINGATAN[@]} -eq 0 ]]; then
  echo "[OK] Seluruh parameter operasional dalam keadaan prima."
else
  echo "[HASIL EVALUASI]:"
  for p in "${PESAN_PERINGATAN[@]}"; do
    echo "  $p"
  done
fi
echo "=== SELESAI (Exit Code: $KODE_KELUAR) ==="

exit $KODE_KELUAR
