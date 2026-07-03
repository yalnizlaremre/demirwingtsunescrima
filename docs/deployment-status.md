# WTEO — Deployment Durumu / Kaldığımız Yer

> Bu dosya oturumlar arası devamlılık için tutuluyor. "Nerede kaldık" dendiğinde buradan bak.
> Son güncelleme: 2026-07-03 (backup + main merge tamamlandı)

---

## Sunucu Bilgileri

- **IP:** 188.34.180.17 (Hetzner Cloud)
- **Domain:** demirwingtsun.com (GoDaddy'de alındı, DNS zaten sunucuya yönlendirilmiş durumda)
- **SSH:** `ssh root@188.34.180.17` (bu bilgisayardaki `~/.ssh/id_ed25519` anahtarıyla, key-only giriş — şifre auth kapalı)
- **Proje yolu (sunucuda):** `/opt/wteo`
- **Stack:** Docker Compose → `postgres:16-alpine` + `backend` (FastAPI/uvicorn) + `caddy` (frontend static + reverse proxy + otomatik HTTPS)

## Git / Branch Durumu

- **`deploy/production-setup` → `main`'e merge edildi** (2026-07-03, merge commit `3d699f3`)
- Sunucu artık `main`'i takip ediyor: `cd /opt/wteo && git pull origin main && docker compose up -d --build`
- `deploy/production-setup` branch'i hâlâ duruyor ama artık main'in gerisinde kalmayacak şekilde kullanılmayacak; yeni işler doğrudan main üzerinden (veya yeni feature branch'lerden) ilerleyecek

## Bugüne Kadar Tamamlananlar

1. **Backend test suite** — 63 pytest testi (grade_hours, attendance, events, auth, utils), hepsi geçiyor
2. **Prod-hazırlık:** SECRET_KEY validasyonu (prod'da zayıf key ile boot olmuyor), `/docs` prod'da gizli, login/register'da rate limiting (5/dk)
3. **Sunucu hardening:** ufw firewall (22/80/443), fail2ban, SSH key-only, 2GB swap
4. **Docker deployment:** backend Dockerfile, frontend+Caddy Dockerfile, docker-compose.yml, `.env.production.example`
5. **Canlıya alındı:** https://demirwingtsun.com — SSL aktif (Let's Encrypt, otomatik yenilenir)
6. **Süper admin hesabı oluşturuldu** (`emreyalnizlar@gmail.com`) — şifre şifrelenmiş DB'de, gerekirse admin panelden/sıfırlama ile değiştirilebilir
7. **Genel erişime açık ana sayfa** eklendi (`/` artık herkese açık "Hakkımızda" tanıtım sayfası, dashboard `/dashboard`'a taşındı)
8. **KRİTİK BUG DÜZELTİLDİ:** Postgres'e geçince ortaya çıkan tz-aware/naive datetime uyumsuzluğu — dashboard istatistikleri, seminer değerlendirme, talep onaylama, **etkinlik/ders oluşturma** 500 hatası veriyordu. `app/utils.py`'de `NaiveDatetime` pydantic tipi + `utcnow_naive()` helper'ı ile çözüldü, regresyon testi eklendi (`test_utils.py`).
9. **Otomatik yedekleme kuruldu:** Sunucuda her gece 03:00'te cron ile `pg_dump` + `uploads` docker volume yedeği alınıyor (`scripts/backup.sh`, 14 gün retention, `/opt/wteo/backups`). Bilgisayardan `scripts/pull-backup.ps1` ile en güncel yedek manuel çekilebiliyor (S3/off-site servis kullanılmıyor, maliyetsiz çözüm).
10. **`deploy/production-setup` → `main` merge edildi**, sunucu artık `main`'i takip ediyor.

## Bilinen Eksikler / Yapılacaklar (Öncelik Sırasıyla)

### Yüksek Öncelik
- [x] ~~Yedekleme yok~~ → Kuruldu (bkz. madde 9 yukarıda)
- [x] ~~`deploy/production-setup` main'e merge edilmeli~~ → Yapıldı
- [ ] **Sıradaki iş: Anasayfa/Hakkımızda sayfası özelleştirme + admin panelden içerik yönetimi.** Kullanıcı referans siteler verecek, tasarım/içerik olarak benzetme yapılacak. Admin'den fotoğraf ve yazı gibi içerikler eklenebilecek (muhtemelen yeni bir "site content" modeli/tablosu ve admin CRUD ekranı gerekecek).
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
