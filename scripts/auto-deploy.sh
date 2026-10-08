#!/bin/bash
# Sunucuda calisir (systemd timer ile dakikada bir, bkz. install-auto-deploy.sh).
#
# GitHub'daki `main` dalinda sunucuda olmayan yeni bir commit varsa, elle
# yapilan deploy adimlarinin aynisini sirayla uygular:
#   1) Postgres yedegi (pg_dump)  2) git pull origin main
#   3) docker compose up -d --build  4) saglik kontrolu
# Yeni commit yoksa hicbir sey yapmaz. `--force` ile commit kontrolu atlanir.
set -euo pipefail

PROJECT_DIR="/opt/wteo"
BACKUP_DIR="$PROJECT_DIR/backups"
LOG_FILE="/var/log/wteo-deploy.log"
KEEP_DEPLOY_BACKUPS=20

log() { echo "[$(date '+%F %T')] $*" | tee -a "$LOG_FILE"; }

# Ayni anda iki deploy calismasin
exec 9>/tmp/wteo-deploy.lock
flock -n 9 || exit 0

cd "$PROJECT_DIR"
git fetch -q origin main

if [ "${1:-}" != "--force" ] && git merge-base --is-ancestor origin/main HEAD; then
  exit 0  # main'de yeni bir sey yok
fi

OLD=$(git rev-parse --short HEAD)
NEW=$(git rev-parse --short origin/main)
log "Deploy basliyor: $OLD -> $NEW ($(git log -1 --format=%s origin/main))"

mkdir -p "$BACKUP_DIR"
TS=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/predeploy_${TS}_${OLD}.sql.gz"
docker compose exec -T postgres pg_dump -U wteo wteo | gzip > "$BACKUP_FILE"
log "Veritabani yedegi alindi: $BACKUP_FILE ($(du -h "$BACKUP_FILE" | cut -f1))"
ls -1t "$BACKUP_DIR"/predeploy_*.sql.gz 2>/dev/null | tail -n +$((KEEP_DEPLOY_BACKUPS + 1)) | xargs -r rm --

git pull --no-edit -q origin main
docker compose up -d --build >> "$LOG_FILE" 2>&1
docker image prune -f > /dev/null 2>&1 || true

# Backend (migration'lar dahil) ayaga kalkana kadar bekle
for i in $(seq 1 30); do
  if docker compose exec -T backend python -c "import urllib.request;urllib.request.urlopen('http://localhost:8000/api/health',timeout=3)" > /dev/null 2>&1; then
    log "Deploy tamamlandi: $(git rev-parse --short HEAD) - /api/health OK"
    exit 0
  fi
  sleep 5
done
log "UYARI: Deploy sonrasi /api/health 150 sn icinde yanit vermedi. 'docker compose logs backend' kontrol edin. Yedek: $BACKUP_FILE"
exit 1
