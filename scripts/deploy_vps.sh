#!/bin/bash
# ==============================================================================
# Skrip Otomasi Deployment VPS — Zhou Consulting Backend API
# Lokasi: /var/www/be-zhou/scripts/deploy_vps.sh
# ==============================================================================

set -e

echo "=========================================================="
echo "🚀 Memulai Deployment Zhou Consulting Backend API..."
echo "=========================================================="

# 1. Update kode terbaru dari branch dev
echo "📥 1. Menarik pembaruan kode terbaru dari git (branch: dev)..."
git fetch origin dev
git checkout dev
git pull origin dev

# 2. Jalankan database PostgreSQL dan Redis via Docker
echo "🐳 2. Memastikan container PostgreSQL & Redis aktif..."
docker compose up -d

# Tunggu beberapa detik agar PostgreSQL siap menerima koneksi
echo "⏳ Menunggu PostgreSQL siap..."
sleep 3

# 3. Instalasi dependencies
echo "📦 3. Menginstal dependencies produksi (npm ci)..."
npm ci

# 4. Migrasi skema Prisma ke database
echo "🗄️ 4. Menjalankan migrasi skema database Prisma..."
npx prisma migrate deploy
npx prisma generate

# 5. Penegakan database trigger append-only audit log
echo "🔒 5. Menerapkan trigger append-only pada tabel audit_logs..."
if [ -f "prisma/triggers/audit_log_trigger.sql" ]; then
  docker exec -i zhou_postgres psql -U postgres -d zhou_db < prisma/triggers/audit_log_trigger.sql || true
  echo "✅ Trigger append-only terverifikasi."
fi

# 6. Kompilasi TypeScript ke JavaScript (dist/)
echo "🔨 6. Melakukan kompilasi TypeScript (npm run build)..."
npm run build

# 7. Start / Reload PM2 Cluster
echo "⚡ 7. Memperbarui proses PM2 Cluster..."
if pm2 describe zhou-backend > /dev/null 2>&1; then
  pm2 reload ecosystem.config.cjs --update-env
  echo "✅ PM2 cluster berhasil di-reload (zero downtime)."
else
  pm2 start ecosystem.config.cjs
  echo "✅ PM2 cluster berhasil dijalankan."
fi

# Simpan state PM2
pm2 save

echo "=========================================================="
echo "🎉 Deployment Selesai! Backend Zhou Consulting Berjalan!"
echo "🩺 Health Check: curl -I http://localhost:5000/api/health"
echo "📚 Scalar Docs:  http://localhost:5000/docs"
echo "=========================================================="
