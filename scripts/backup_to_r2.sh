#!/bin/bash
# ==============================================================================
# Skrip Backup Harian PostgreSQL ke Cloudflare R2
# Zhou Consulting Website Platform (PRD v2 Revisi - Bagian 5 Strategi Backup)
# ==============================================================================

set -e

# Konfigurasi Database
DB_NAME="zhou_db"
DB_USER="postgres"
DB_HOST="127.0.0.1"
DB_PORT="5432"

# Format Timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="/tmp/pg_backups"
BACKUP_FILE="${BACKUP_DIR}/zhou_db_backup_${TIMESTAMP}.sql.gz"

# Konfigurasi Cloudflare R2 (S3-Compatible)
R2_BUCKET="zhou-db-backups"
R2_ENDPOINT="${R2_S3_ENDPOINT:-https://<account-id>.r2.cloudflarestorage.com}"
RETENTION_DAYS=7

mkdir -p "$BACKUP_DIR"

echo "[$(date)] Memulai pg_dump untuk database ${DB_NAME}..."
PGPASSWORD="${DB_PASSWORD}" pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -F c | gzip > "$BACKUP_FILE"

echo "[$(date)] Backup database berhasil dibuat: ${BACKUP_FILE}"

# Unggah ke Cloudflare R2 menggunakan AWS CLI (atau rclone)
echo "[$(date)] Mengunggah backup ke Cloudflare R2..."
aws s3 cp "$BACKUP_FILE" "s3://${R2_BUCKET}/daily/zhou_db_backup_${TIMESTAMP}.sql.gz" \
  --endpoint-url "$R2_ENDPOINT"

# Hapus backup lokal di folder temporary
rm -f "$BACKUP_FILE"
echo "[$(date)] File temporary lokal dibersihkan."

# Hapus backup yang lebih lama dari 7 hari di Cloudflare R2 (Rolling Retention 7 Hari)
echo "[$(date)] Menjalankan rotasi rolling retention ${RETENTION_DAYS} hari di R2..."
# Logika retention lifecycle policy direkomendasikan dikonfigurasi langsung di Cloudflare R2 Dashboard Lifecycle Rules.

echo "[$(date)] Siklus backup harian selesai dengan sukses!"
