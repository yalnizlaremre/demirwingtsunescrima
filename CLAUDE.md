# Demir Wing Tsun Akademi (WTEO)

Kullanıcı "nerede kaldık" dediğinde: önce **`docs/deployment-status.md`** dosyasının en üstündeki
"ŞU AN NEREDEYİZ" bölümünü oku (bekleyen işler + sıradaki tur planı), kullanıcıya özetle ve
oradan devam et. Her iş bitiminde bu dosyayı güncelle.

- Yapı: `backend/` (FastAPI + Alembic), `frontend/` (panel, app.demirwingtsun.com),
  `frontend-public/` (tanıtım sitesi, demirwingtsun.com), `Caddyfile`, `docker-compose.yml`.
- Deploy: `main`'e push yeterli — sunucudaki `wteo-auto-deploy` timer'ı dakikada bir kontrol edip
  yedek alır, `git pull` + `docker compose up -d --build` yapar (bkz. `scripts/auto-deploy.sh`).
- Dil: kullanıcıyla Türkçe konuş; arayüz metinlerinde Türkçe karakterleri (ç, ğ, ı, İ, ö, ş, ü) eksiksiz kullan.
