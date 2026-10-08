#!/bin/bash
# Sunucuda BIR KEZ calistirilir. Repo'yu degistirmeden (git show ile) calisir:
#   ssh root@188.34.180.17 "cd /opt/wteo && git fetch -q origin main && git show origin/main:scripts/install-auto-deploy.sh | bash"
# auto-deploy.sh'yi /usr/local/bin'e kurar, dakikada bir calisan systemd
# timer'ini acar ve hemen ilk deploy'u yapar.
set -euo pipefail
cd /opt/wteo
git fetch -q origin main
git show origin/main:scripts/auto-deploy.sh > /usr/local/bin/wteo-auto-deploy
chmod +x /usr/local/bin/wteo-auto-deploy

cat > /etc/systemd/system/wteo-auto-deploy.service <<'UNIT'
[Unit]
Description=WTEO - GitHub main dalindan otomatik deploy
After=docker.service network-online.target

[Service]
Type=oneshot
ExecStart=/usr/local/bin/wteo-auto-deploy
UNIT

cat > /etc/systemd/system/wteo-auto-deploy.timer <<'UNIT'
[Unit]
Description=WTEO otomatik deploy kontrolu (dakikada bir)

[Timer]
OnActiveSec=30s
OnBootSec=2min
OnUnitActiveSec=60s
Unit=wteo-auto-deploy.service

[Install]
WantedBy=timers.target
UNIT

systemctl daemon-reload
systemctl enable --now wteo-auto-deploy.timer
echo "Otomatik deploy kuruldu. Ilk deploy simdi calisiyor..."
/usr/local/bin/wteo-auto-deploy --force
echo
echo "Durum: systemctl list-timers wteo-auto-deploy.timer"
echo "Log:   tail -f /var/log/wteo-deploy.log"
