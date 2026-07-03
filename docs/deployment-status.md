# WTEO — Deployment Durumu / Kaldığımız Yer

> Bu dosya oturumlar arası devamlılık için tutuluyor. "Nerede kaldık" dendiğinde buradan bak.
> Son güncelleme: 2026-07-03 (Alembic migration kurulumu + yeni sayfa/subdomain planı)

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
11. **Alembic migration altyapısı kuruldu** — `create_all` + SQLite-only inline migration (`_migrate_sqlite`) yerine artık gerçek migration sistemi var. Mevcut modellerle birebir eşleşen baseline migration (`4370257db015_baseline.py`) oluşturuldu; prod Postgres şeması modellerle tam örtüştüğü doğrulanıp veriye dokunmadan `alembic stamp head` ile işaretlendi. Dockerfile artık `entrypoint.sh` ile container başlamadan önce Postgres için `alembic upgrade head` çalıştırıyor (SQLite/dev akışı değişmedi). Prod'a deploy edilip doğrulandı (`/api/health` 200 dönüyor), 63 test hâlâ geçiyor. Bundan sonra şema değişikliği gerektiren her yeni özellik `alembic revision --autogenerate` ile güvenle üretilip uygulanabilir.

## Bilinen Eksikler / Yapılacaklar (Öncelik Sırasıyla)

### Yüksek Öncelik
- [x] ~~Yedekleme yok~~ → Kuruldu (bkz. madde 9 yukarıda)
- [x] ~~`deploy/production-setup` main'e merge edilmeli~~ → Yapıldı
- [x] ~~Alembic migration'a geçiş yok~~ → Kuruldu (bkz. madde 11 yukarıda)
- [ ] **SIRADAKİ İŞ — büyük özellik, plan aşağıda:** Anasayfa yerine çoklu public sayfa yapısı (Anasayfa, Okullar, DemirWteo, Eğitmenler, İletişim) + admin panelden içerik yönetimi + subdomain ile mimari ayrım. Kullanıcı yarın referans siteler paylaşacak, tasarım/içerik o örneklere göre şekillenecek.
- [ ] Aynı tz-aware/naive datetime hatasının başka gizli noktaları olabilir mi diye tekrar tarama yapılabilir (şimdilik bulunan 4 nokta düzeltildi: dashboard.py x2, events.py, requests.py + ilgili şemalar)

### Orta Öncelik (docs/prd.md'de de not düşülmüş, henüz yapılmadı)
- [ ] Refresh token revocation yok (stateless JWT, logout sonrası token 7 gün geçerli kalıyor)
- [ ] Mail hâlâ kapalı (`MAIL_ENABLED=false`) — gerçek SMTP bilgisi girilmedi

### Düşük Öncelik
- [ ] `GradeRequirement` tablosu kullanılmıyor (hardcoded `grade_hours.py` üzerinden hesaplanıyor)
- [ ] Kapasite kontrolü, ürün stok takibi, audit log görüntüleme arayüzü gibi PRD'de listelenen eksik özellikler

## YARIN DEVAM: Çoklu Sayfa + Subdomain Planı

Kullanıcı yarın referans siteler paylaşacak (tasarım/içerik benzetmesi için). Karar verilen mimari:

**Sayfalar:** Anasayfa, Okullar, DemirWteo, Eğitmenler, İletişim — hepsi admin panelinden (dashboard tarafı) yönetilecek.

**Mimari — subdomain ayrımı (kullanıcı bunu tercih etti, yeni domain almadan):**
- `demirwingtsun.com` (+ `www`) → **yeni, ayrı bir frontend projesi** (public marketing site, 5 sayfa)
- `app.demirwingtsun.com` → mevcut dashboard uygulaması (Home.jsx'teki public içerik kaldırılacak, login sonrası akış aynen kalıyor)
- `api.demirwingtsun.com` → backend, iki frontend de buraya istek atacak (CORS'a yeni origin'ler eklenecek)
- DNS: GoDaddy'de `app` ve `api` için A kaydı eklenecek (aynı IP, ücretsiz — yeni domain değil)
- Caddyfile 3 site bloğuna çıkarılacak, docker-compose güncellenecek (Let's Encrypt sertifikaları Caddy otomatik yönetir)

**Veri modeli önerisi (kod tabanı incelemesinden çıkan sonuç):**
- Anasayfa / DemirWteo / İletişim → genel bir `SiteContent` tablosu (slug + başlık + metin + görsel, admin'de tek ekranda tab'lı düzenleme)
- Okullar → mevcut `School` modeline `cover_image_url`, `long_description` gibi yeni alanlar (School zaten var, çoklu okul/şube destekleniyor) — **artık Alembic sayesinde bu tür alan eklemeleri güvenli**
- Eğitmenler → `User` modeline `bio`, `display_order`, `is_featured_instructor` gibi alanlar (fotoğraf için `avatar_url` zaten var, `instructor_title` enum'u da mevcut: SIFU/SIHING)
- Görsel yükleme: mevcut `media.py` upload altyapısı ve `/uploads` static serving doğrudan reuse edilebilir

**Henüz karar verilmemiş/yapılmamış:**
- Yeni public frontend projesinin iskeleti henüz oluşturulmadı
- Backend'de public (auth'suz) GET endpoint'leri (okullar, öne çıkan eğitmenler, site içeriği) henüz yazılmadı
- CORS_ORIGINS'e yeni origin'ler henüz eklenmedi
- DNS kayıtları henüz eklenmedi, Caddyfile henüz güncellenmedi

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
