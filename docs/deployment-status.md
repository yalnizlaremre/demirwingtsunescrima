# WTEO — Deployment Durumu / Kaldığımız Yer

> Bu dosya oturumlar arası devamlılık için tutuluyor. "Nerede kaldık" dendiğinde buradan bak.
> Son güncelleme: 2026-07-03

---

## Sunucu Bilgileri

- **IP:** 188.34.180.17 (Hetzner Cloud)
- **Domain:** demirwingtsun.com (GoDaddy'de alındı, DNS zaten sunucuya yönlendirilmiş durumda)
- **SSH:** `ssh root@188.34.180.17` (bu bilgisayardaki `~/.ssh/id_ed25519` anahtarıyla, key-only giriş — şifre auth kapalı)
- **Proje yolu (sunucuda):** `/opt/wteo`
- **Stack:** Docker Compose → `postgres:16-alpine` + `backend` (FastAPI/uvicorn) + `caddy` (frontend static + reverse proxy + otomatik HTTPS)

## Git / Branch Durumu

- **Aktif branch:** `deploy/production-setup` — henüz `main`'e merge edilmedi
- PR linki: https://github.com/yalnizlaremre/demirwingtsunescrima/pull/new/deploy/production-setup
- Sunucu bu branch'ten `git pull` ile güncelleniyor (`cd /opt/wteo && git pull origin deploy/production-setup && docker compose up -d --build`)
- main'e ne zaman merge edileceğine henüz karar verilmedi

## Bugüne Kadar Tamamlananlar

1. **Backend test suite** — 63 pytest testi (grade_hours, attendance, events, auth, utils), hepsi geçiyor
2. **Prod-hazırlık:** SECRET_KEY validasyonu (prod'da zayıf key ile boot olmuyor), `/docs` prod'da gizli, login/register'da rate limiting (5/dk)
3. **Sunucu hardening:** ufw firewall (22/80/443), fail2ban, SSH key-only, 2GB swap
4. **Docker deployment:** backend Dockerfile, frontend+Caddy Dockerfile, docker-compose.yml, `.env.production.example`
5. **Canlıya alındı:** https://demirwingtsun.com — SSL aktif (Let's Encrypt, otomatik yenilenir)
6. **Süper admin hesabı oluşturuldu** (`emreyalnizlar@gmail.com`) — şifre şifrelenmiş DB'de, gerekirse admin panelden/sıfırlama ile değiştirilebilir
7. **Genel erişime açık ana sayfa** eklendi (`/` artık herkese açık "Hakkımızda" tanıtım sayfası, dashboard `/dashboard`'a taşındı)
8. **KRİTİK BUG DÜZELTİLDİ:** Postgres'e geçince ortaya çıkan tz-aware/naive datetime uyumsuzluğu — dashboard istatistikleri, seminer değerlendirme, talep onaylama, **etkinlik/ders oluşturma** 500 hatası veriyordu. `app/utils.py`'de `NaiveDatetime` pydantic tipi + `utcnow_naive()` helper'ı ile çözüldü, regresyon testi eklendi (`test_utils.py`).

## Bilinen Eksikler / Yapılacaklar (Öncelik Sırasıyla)

### Yüksek Öncelik
- [ ] **Yedekleme yok** — Postgres verisi ve `uploads/` şu an sadece bu tek sunucuda, hiç yedek alınmıyor. Bir sonraki oturumda yapılacak: günlük `pg_dump` cron + `uploads/` yedeği (belki Hetzner snapshot ya da off-site rsync).
- [ ] **`deploy/production-setup` main'e merge edilmeli** (ya da bilinçli olarak ayrı tutulacaksa not düşülmeli)
- [ ] Aynı tz-aware/naive datetime hatasının başka gizli noktaları olabilir mi diye tekrar tarama yapılabilir (şimdilik bulunan 4 nokta düzeltildi: dashboard.py x2, events.py, requests.py + ilgili şemalar)

### Orta Öncelik (docs/prd.md'de de not düşülmüş, henüz yapılmadı)
- [ ] Alembic migration'a geçiş yok — hâlâ `create_all` + SQLite-only inline migration (`_migrate_sqlite`, Postgres'te hiç çalışmıyor zaten)
- [ ] Refresh token revocation yok (stateless JWT, logout sonrası token 7 gün geçerli kalıyor)
- [ ] Mail hâlâ kapalı (`MAIL_ENABLED=false`) — gerçek SMTP bilgisi girilmedi

### Düşük Öncelik
- [ ] `GradeRequirement` tablosu kullanılmıyor (hardcoded `grade_hours.py` üzerinden hesaplanıyor)
- [ ] Kapasite kontrolü, ürün stok takibi, audit log görüntüleme arayüzü gibi PRD'de listelenen eksik özellikler

## Hızlı Komutlar (Hatırlatma)

```bash
# Sunucuya bağlan
ssh root@188.34.180.17

# Güncelleme deploy et
cd /opt/wteo && git pull origin deploy/production-setup && docker compose up -d --build

# Logları izle
docker compose logs backend --tail=100 -f

# Container durumu
docker compose ps
```
