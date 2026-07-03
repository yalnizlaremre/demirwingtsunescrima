#!/bin/bash
# Sunucuda calisir (cron ile). Postgres dump + uploads volume'unu yedekler,
# son 14 gunluk yedegi tutar, daha eskilerini siler.
set -euo pipefail

PROJECT_DIR="/opt/wteo"
BACKUP_DIR="$PROJECT_DIR/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=14

mkdir -p "$BACKUP_DIR"
cd "$PROJECT_DIR"

# Postgres dump
docker compose exec -T postgres pg_dump -U wteo wteo | gzip > "$BACKUP_DIR/db_${TIMESTAMP}.sql.gz"

# Uploads volume (docker volume adi proje klasor adina gore onekleniyor: wteo_uploads_data)
UPLOADS_VOLUME=$(docker volume ls -q --filter name=uploads_data | head -n1)
docker run --rm \
  -v "${UPLOADS_VOLUME}:/data:ro" \
  -v "$BACKUP_DIR:/backup" \
  alpine tar czf "/backup/uploads_${TIMESTAMP}.tar.gz" -C /data .

# 14 gunden eski yedekleri sil
find "$BACKUP_DIR" -name "db_*.sql.gz" -mtime "+${RETENTION_DAYS}" -delete
find "$BACKUP_DIR" -name "uploads_*.tar.gz" -mtime "+${RETENTION_DAYS}" -delete

echo "[$(date)] Backup tamamlandi: db_${TIMESTAMP}.sql.gz, uploads_${TIMESTAMP}.tar.gz"
