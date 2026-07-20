# WTEO — Deployment Durumu / Kaldığımız Yer

> Bu dosya oturumlar arası devamlılık için tutuluyor. "Nerede kaldık" dendiğinde buradan bak.
> Son güncelleme: 2026-07-21 — **Bekleyen iş yok.** `main` ile `origin/main` ve prod aynı hizada (son commit `bb457f5`). Bu oturumda yapılanların özeti hemen altta, sonraki oturum burdan devam edebilir ya da yeni bir iş için sıfırdan başlayabilir.

## Bu oturumda yapılanlar (2026-07-21)

Kullanıcı canlıda gezerken 5 eksik/kırık nokta bildirdi, hepsi planlanıp aynı oturumda tamamlandı, test edildi ve canlıya alındı:

1. **Üye portalı karşılama sayfası** (`app.demirwingtsun.com/`, giriş öncesi): jenerik "Shield" ikonu yerine gerçek logo, başlık "Demir Wing Tsun Akademi Üye Portalı" oldu, giriş yapmış kullanıcı için buton "Panele Devam Et" oldu.
2. **Öğrenciler sayfası:** artık bir öğrenciyi seçip düzenlemek mümkün (doğum tarihi, acil durum kişisi/telefon, notlar — herkes; okul ataması sadece admin/super admin). Yeni backend ucu: `PUT /api/students/{id}` (önceden var olan ama hiç bağlanmamış `StudentUpdate` şeması kullanıldı). Ayrıca mobilde Okul kolonunu gizleyen bir CSS class'ı kaldırıldı (kullanıcının "okulunu göremiyorum" şikayetinin gerçek sebebi buymuş).
3. **Kullanıcılar sayfası:** admin/super admin artık bir öğrenciyi (rol=USER) doğrudan okula atayabiliyor — arka planda `PUT /students/{id}` ucunu kullanıyor (tek yetki noktası, tekrar yok).
4. **Dereceler sayfası:** tüm öğrenciler artık görünür bir tabloda (Ad/Okul/WT-Esc derece+saat), satırdan WT/Esc butonlarıyla direkt derece değiştirme modalı açılıyor.
5. **Eğitmen (MANAGER) derece değişikliği onay akışı:** MANAGER rolü artık Dereceler sayfasına erişebiliyor (kendi okulundaki öğrenciler, backend zaten scope'luyor), bir derece değişikliği **talep** edebiliyor (`POST /grades/change-requests`, PENDING) ama admin/super admin onaylamadan (`.../approve`) derece değişmiyor; reddedilirse (`.../reject`) hiçbir şey değişmiyor. Yeni tablo: `grade_change_requests` + migration `b67918eb8dfe`. Enrollment/Request pattern'iyle aynı yapı (audit log, `handled_by`/`handled_at`).

**Yan bulgu (kullanıcının "sanırım bağlı değil" şüphesinin gerçek sebebi):** `Grades.jsx`'teki öğrenci dropdown'ı `/students/?limit=200` çağırıyordu, ama backend `limit` üst sınırı 100 — istek sessizce 422 dönüyordu (`.catch(() => {})` ile yutuluyordu). `limit=100`'e düşürülerek düzeltildi.

**Test:** 15 yeni backend testi (`test_students_update.py`, `test_grade_change_requests.py`), toplam **97/97 test geçiyor**. Chrome'da uçtan uca doğrulandı: local'de geçici test kullanıcıları/öğrencileri oluşturulup 5 özellik de gerçek tarayıcıda denendi (manager scope kontrolü, admin direkt değişiklik, manager talep→admin onay/red), sonra hepsi temizlendi — local DB'de kalıcı iz yok.

**Deploy:** commit `bb457f5` → push → sunucuda `git pull` + `docker compose up -d --build`, alembic migration `b67918eb8dfe` otomatik uygulandı, `docker compose ps` tüm container `Up`, `/api/health` ve `app.demirwingtsun.com` doğrulandı.

**Not:** Bu oturumda local dev sunucular (backend :8000, frontend :5173) arka planda açık bırakıldı, sonraki oturumda hâlâ ayakta olmayabilir.

---

## Önceki oturum (2026-07-16/17, sırasıyla)
1. Site İçeriği: aynı slug'a birden fazla içerik ekleme kısıtı kaldırıldı (backend + public site + admin panel) — canlıya alındı.
2. Site İçeriği formuna gerçek dosya seçici (görsel yükleme) ve YouTube linki için canlı önizleme eklendi — canlıya alındı, Chrome'da uçtan uca test edildi.
3. Medya/avatar yükleme yetkilerinde bulunan güvenlik açığı düzeltildi: `MEMBER` rolü artık hiçbir şey yükleyemiyor (öncesinde backend'den doğrudan istekle yükleyebiliyordu) — canlıya alındı, regresyon testleri eklendi (82/82 test geçiyor).

Detaylar için aşağıdaki "Yetki açığı düzeltmesi" ve "TAMAMLANDI (2026-07-16/17 oturumu)" bölümlerine bak.

**Not:** Local dev sunucular (backend :8000, frontend :5173) bu oturumda arka planda açık bırakıldı, sonraki oturumda hâlâ ayakta olmayabilir — gerekirse yeniden başlatılmalı.

## Yetki açığı düzeltmesi (2026-07-17, aynı oturumun üçüncü turu)

Kullanıcı "super admin ve adminler dışında kimse resim/video yükleyebiliyor mu" diye sordu. İnceleme sonucu bulunan: `backend/app/routers/media.py`'deki dosya yükleme (`POST /media/upload`) ve YouTube import (`POST /media/youtube`) uçlarındaki rol kontrolü sadece tam olarak `USER` rolünü engelliyordu; sistemdeki en düşük/varsayılan rol olan `MEMBER` (her yeni kayıt olan kullanıcının başlangıç rolü, bir okula öğrenci kaydı onaylanana kadar bu rolde kalıyor) kontrolsüz kalıyordu. Arayüzde buton gizliydi ama backend'e doğrudan istek atan bir MEMBER dosya/YouTube linki yükleyebiliyordu. Profil fotoğrafı ucu (`/students/my-profile/avatar`) ise hiç rol kontrolü yapmıyordu — herkes (MEMBER dahil) yükleyebiliyordu.

Kullanıcıyla karar verilen nihai kural: **MEMBER hiçbir şey yükleyemez** (ne medya ne profil fotoğrafı), **USER sadece profil fotoğrafı yükleyebilir** (mevcut davranış), **MANAGER/ADMIN/SUPER_ADMIN değişmedi**.

Yapılan: `media.py`'deki iki kontrol de `MEMBER`'ı kapsayacak şekilde genişletildi, `students.py`'deki avatar ucuna `MEMBER` engeli eklendi, `Profile.jsx`'te MEMBER rolündeyken kamera/yükleme ikonu arayüzden gizlendi. Regresyon için `backend/tests/test_media_permissions.py` eklendi (7 yeni test), toplam **82/82 test geçiyor**. Commit `cf5c826`, push + `docker compose up -d --build` ile deploy edildi, `/api/health` doğrulandı. **Tamamlandı, kalan iş yok.**

## TAMAMLANDI (2026-07-16/17 oturumu)

Prod'da (`app.demirwingtsun.com/site-content`) bir slug'a (örn. `iletisim`) ilk içerik eklendiğinde "X içeriği ekle" kısayol butonu kayboluyordu — yani admin panelinden bir slug'a **sadece tek içerik** eklenebiliyordu, halbuki public site birden fazla bloğu art arda gösterebilecek şekilde tasarlanmıştı. Kullanıcı (canlı admin panelden ekran görüntüsü: `screenshots/icerik-create.png`) bunu fark edip "kısıt olmasın, public site ile aynı olsun" dedi.

**Bu oturumda tamamlanıp local'de commit'lendi:**
- Backend: `SiteContent.slug` artık unique değil (model + `alembic/versions/aad8091cba1c_site_content_slug_not_unique.py` migration)
- Backend: `POST /api/site-content/` içindeki duplicate-slug reddi kaldırıldı
- Backend: `GET /api/public/content/{slug}` artık tek obje değil `{items: [...]}` listesi dönüyor (slug'a ait tüm kayıtlar, `created_at` sırasına göre)
- `frontend-public`: Anasayfa/DemirWteo/Iletisim sayfaları artık `items` dizisini işliyor — ilk kayıt "ana blok", geri kalanı sayfada alt alta ek blok olarak render ediliyor
- `frontend` admin panel (`SiteContent.jsx`): "X içeriği ekle" kısayol butonları artık slug'da içerik olsa da kaybolmuyor, her zaman görünüyor; slug etiketindeki yanıltıcı "(benzersiz anahtar)" ifadesi kaldırılıp yerine "aynı slug'a birden fazla içerik eklenebilir" açıklaması eklendi
- Backend testleri güncellendi (`test_duplicate_slug_rejected` → `test_duplicate_slug_allowed_and_ordered`), **75/75 test geçiyor**
- `main`'e push edildi (`627c1bc..db24f61`), sunucuda `git pull` + `docker compose up -d --build` ile deploy edildi (2026-07-17)
- Doğrulandı: `docker compose ps` tüm container'lar `Up`/`healthy`, `alembic upgrade head` hatasız uygulandı, `https://api.demirwingtsun.com/api/health` → `{"status":"ok"}`, `https://demirwingtsun.com/api/public/content/iletisim` artık `{"items":[...]}` listesi dönüyor
- Aynı deploy'a sidebar/login/register logo değişikliği de dahil oldu (`frontend/public/logo.png`, `favicon.png`)

**İkinci tur (aynı oturum, 2026-07-17): Site İçeriği formuna görsel yükleme + YouTube önizleme**
Kullanıcı devamında görsel URL'sini elle yazmak yerine dosya seçici, YouTube linki için de basit bir doğrulama/önizleme istedi.
- `SiteContent.jsx`: "Dosya Seç" butonu eklendi, mevcut `POST /media/upload` ucuna yükleyip dönen `file_url`'i otomatik `image_url`'e yazıyor; küçük önizleme + kaldır (X) butonu var. Manuel URL yapıştırma da hâlâ mümkün.
- YouTube linki artık her formatta (izle/kısa/embed/shorts) tanınıyor; yapıştırılır yapıştırılmaz küçük video kapak resmiyle "Video tanındı" ya da tanınamazsa kırmızı uyarı gösteriyor.
- İçerik kartlarındaki ham URL metinleri gerçek küçük resimlere çevrildi.
- Chrome üzerinden uçtan uca test edildi: local dev'de (`localhost:5173`) admin girişi yapıldı, dosya yükleme + YouTube linki ile gerçek bir "iletisim" kaydı oluşturuldu, kartta doğru göründü, sonra silindi (test verisi kalmadı).
- Commit (`37cfaf9`) → push → sunucuda `docker compose up -d --build` → `docker compose ps` tüm container `Up`, `/api/health` `{"status":"ok"}` — **canlıya alındı, doğrulandı**.
- Kalan iş yok, bu iş tamamlandı.

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
- [x] ~~Backend: SiteContent modeli + School/User yeni alanlar + public/admin endpoint'ler + register/onay akışı~~ → Yapıldı (2026-07-05, bkz. madde 12 aşağıda)
- [x] ~~Frontend (app): Bekleyen Üyeler + Site İçeriği admin ekranları + portal karşılama sayfası~~ → Yapıldı (2026-07-05)
- [x] ~~Yeni public marketing frontend projesi (`frontend-public/`)~~ → Yapıldı, local'de build+browser test edildi (2026-07-05)
- [x] ~~Deployment: Caddyfile 3-block + docker-compose + CORS + DNS~~ → **CANLIYA ALINDI** (2026-07-05) — DNS eklendi, sunucuya deploy edildi, 3 domain de SSL ile doğrulandı (bkz. madde 14 aşağıda)
- [ ] **SIRADAKİ İŞ (yarın devam):** Prod'da henüz gerçek `SiteContent`/`School`/`User` içeriği yok — `https://app.demirwingtsun.com`'a admin olarak giriş yapıp **Site İçeriği** (Anasayfa/DemirWteo/İletişim metinleri), **Okullar** (Kozyatağı/Tekirdağ kapak görseli+açıklama, `picture/` klasöründeki fotoğraflarla) ve **Kullanıcılar** (Sifu Emre/Sifu Saffet'i `is_featured_instructor` yapıp avatar+bio girme) ekranlarından gerçek içerik girilmeli. O zaman `demirwingtsun.com` placeholder değil gerçek içerikle görünecek.
- [ ] Aynı tz-aware/naive datetime hatasının başka gizli noktaları olabilir mi diye tekrar tarama yapılabilir (şimdilik bulunan 4 nokta düzeltildi: dashboard.py x2, events.py, requests.py + ilgili şemalar)

### Orta Öncelik (docs/prd.md'de de not düşülmüş, henüz yapılmadı)
- [ ] Refresh token revocation yok (stateless JWT, logout sonrası token 7 gün geçerli kalıyor)
- [ ] Mail hâlâ kapalı (`MAIL_ENABLED=false`) — gerçek SMTP bilgisi girilmedi

### Düşük Öncelik
- [ ] `GradeRequirement` tablosu kullanılmıyor (hardcoded `grade_hours.py` üzerinden hesaplanıyor)
- [ ] Kapasite kontrolü, ürün stok takibi, audit log görüntüleme arayüzü gibi PRD'de listelenen eksik özellikler

## Çoklu Sayfa + Subdomain Planı — İlerleme Durumu (2026-07-05)

Karar verilen mimari (plan dosyası: bir önceki oturumda `wild-coalescing-sundae.md` olarak onaylandı):

**Sayfalar:** Anasayfa, Okullar, DemirWteo, Eğitmenler, İletişim — hepsi admin panelinden (dashboard tarafı) yönetiliyor.

**Mimari — subdomain ayrımı:**
- `demirwingtsun.com` (+ `www`) → **yeni, ayrı bir frontend projesi** (public marketing site, 5 sayfa) — **henüz oluşturulmadı**
- `app.demirwingtsun.com` → mevcut dashboard uygulaması — `Home.jsx` artık hafif bir "portal karşılama" ekranı (Giriş Yap / Kayıt Ol butonları), ağır tanıtım içeriği kaldırıldı
- `api.demirwingtsun.com` → backend, iki frontend de buraya istek atacak — **CORS_ORIGINS'e yeni origin'ler henüz eklenmedi**

### Tamamlanan (bu oturumda)
- **Backend veri modeli:** `SiteContent` modeli (slug/title/body/image_url/youtube_url) eklendi; `School`'a `cover_image_url`/`long_description`/`youtube_url`, `User`'a `bio`/`display_order`/`is_featured_instructor` eklendi. Alembic migration (`2a9eb32c2c56_site_content_and_public_fields.py`) üretildi ve local'de uygulandı — **prod'a henüz uygulanmadı** (deploy sırasında `alembic upgrade head` otomatik çalışacak, entrypoint zaten bunu yapıyor).
- **Backend public router** (`app/routers/public.py`, `/api/public/...`): `GET /schools`, `GET /schools/{id}`, `GET /instructors` (sadece `is_featured_instructor=true`), `GET /content`, `GET /content/{slug}` — hepsi auth'suz.
- **Backend admin CRUD** (`app/routers/site_content.py`, `/api/site-content/...`): SiteContent create/update/delete, `require_admin_or_above` yetkili. School/User güncellemeleri mevcut `/api/schools`, `/api/users` PUT endpoint'lerine yeni alanlar eklenerek yapıldı (yeni endpoint gerekmedi).
- **Üyelik onay akışı:** `POST /api/auth/register` artık `status=PENDING` ile başlıyor (önceden auto-ACTIVE'di). Yeni `GET /api/users/pending` + `POST /api/users/{id}/approve` endpoint'leri (`require_manager_or_above`) — dikkat: bu, `/api/students/pending`+`approve` (Student kaydı üzerinden) ve `/api/enrollments` (okul kayıt talebi) akışlarından **ayrı**, üçüncü bir onay mekanizması.
- **Avatar upload:** Yeni endpoint gerekmedi — mevcut `POST /api/students/my-profile/avatar` zaten Student kaydına bakmıyor, herhangi bir login olmuş `User` için çalışıyor.
- **Backend testleri:** 12 yeni test eklendi (register→PENDING, onay akışı, public endpoint'ler, site-content CRUD) — toplam **75/75 test geçiyor**.
- **Frontend (app):** Yeni "Bekleyen Üyeler" sayfası (`PendingUsers.jsx`, `/users/pending`), yeni "Site İçeriği" admin sayfası (`SiteContent.jsx`, `/site-content` — SiteContent CRUD, slug önerileri: anasayfa/demirwteo/iletisim), Schools.jsx ve Users.jsx düzenleme formlarına yeni alanlar eklendi, Register.jsx'te onay bekleme mesajı güncellendi.
- **Not:** Bu oturumda ortamda Node.js kurulu olmadığından frontend değişiklikleri `npm run build` ile doğrulanamadı — sadece elle kod incelemesi yapıldı. Bir sonraki oturumda önce `npm run build`/`npm run dev` ile gerçek tarayıcıda test edilmeli.

### Tamamlanan (devamı — aynı gün ikinci tur, 2026-07-05)
- Kullanıcı iki referans site paylaştı (balabanhybridtraining.com/tr, makinatrainingclub.com) — analiz edildi, `User`'a `instagram_url` alanı eklendi (migration `859ad2d0532c`), eğitmen kartlarında Instagram linki gösterilecek. İletişim sayfasında form/WhatsApp yok — kullanıcı tercihi: sadece Instagram DM.
- **`frontend-public/` projesi kuruldu:** Vite+React+Tailwind, mevcut `frontend/` ile aynı stack/renk paleti (dark tema, primary kırmızı). 5 sayfa: `Anasayfa.jsx`, `Okullar.jsx`, `DemirWteo.jsx`, `Egitmenler.jsx`, `Iletisim.jsx` — hepsi `/api/public/...` endpoint'lerinden veri çekiyor. `Nav.jsx`'teki "Giriş Yap" butonu `VITE_APP_URL` (varsayılan `https://app.demirwingtsun.com`) adresine yönlendiriyor. **Not:** Bu projede `npm install` hiç çalıştırılmadı, ortamda Node.js yoktu — sadece elle kod incelemesi yapıldı, bir sonraki oturumda mutlaka gerçek ortamda denenmeli.
- **Deployment kodu:** Repo köküne `Caddyfile` (3 site bloğu: `{$DOMAIN} www.{$DOMAIN}` → `/srv/public`, `{$APP_DOMAIN}` → `/srv/app`, `{$API_DOMAIN}` → doğrudan backend proxy) ve `docker/Caddy.Dockerfile` (iki ayrı Node build stage'i — `frontend/` ve `frontend-public/` — tek Caddy image'ına kopyalanıyor) eklendi. Eski `frontend/Dockerfile` ve `frontend/Caddyfile` silindi (yerini bunlar aldı). `docker-compose.yml`'deki `caddy` servisi artık repo kökünü build context olarak kullanıyor ve `APP_DOMAIN`/`API_DOMAIN` env değişkenlerini alıyor. `.env.production.example`'a `APP_DOMAIN=app.demirwingtsun.com`, `API_DOMAIN=api.demirwingtsun.com` eklendi, `CORS_ORIGINS`'e `https://app.demirwingtsun.com` eklendi.
- **Mimari notu:** Her subdomain kendi `/api` ve `/uploads` yolunu doğrudan backend'e proxy'liyor (aynı-origin), yani tarayıcıdan CORS'a gerek kalmadan çalışıyor — `api.demirwingtsun.com` şu an asıl olarak ileride (mobil app vb.) doğrudan API erişimi için hazır duruyor, iki web frontend'i için şart değil.

### Local test tamamlandı (aynı gün üçüncü tur, 2026-07-05)
- Node.js winget ile kuruldu (`OpenJS.NodeJS.LTS`, v24.18.0), hem `frontend/` hem `frontend-public/` için `npm install` + `npm run build` hatasız tamamlandı.
- Backend (`uvicorn`, port 8000), `frontend` (port 5173), `frontend-public` (port 5174) local'de ayağa kaldırılıp Chrome üzerinden gerçek tarayıcıda test edildi:
  - `frontend-public` 5 sayfa da (Anasayfa/Okullar/DemirWteo/Eğitmenler/İletişim) doğru render oluyor, gerçek okul/eğitmen fotoğrafları görünüyor, konsol hatası yok.
  - Uçtan uca üyelik onay akışı doğrulandı: kayıt ol → PENDING → login 403 ("Hesabınız henüz aktif değil...") → admin "Bekleyen Üyeler"den onayladı → kullanıcı login olabildi.
  - "Site İçeriği" admin sayfası (demirwteo kaydını gösteriyor, Anasayfa/İletişim için "ekle" kısayolları) çalışıyor.
  - **Düzeltme:** `Home.jsx`'teki portal karşılama metninde Türkçe karakterler eksikti ("Uye", "Giris Yap" vb.) — düzeltildi, projenin geri kalanıyla tutarlı hale getirildi.
- **Dev sunucular hâlâ arka planda açık** (kullanıcı kendisi de local'de incelemeye devam edebilir): backend :8000, frontend :5173, frontend-public :5174.

### CANLIYA ALINDI (aynı gün dördüncü tur, 2026-07-05)
- Tüm değişiklikler commit'lenip `main`'e push edildi (`3a217bd`).
- Kullanıcı GoDaddy'de `app` ve `api` için A kaydı ekledi (`188.34.180.17`), DNS aynı gün yayıldı.
- Sunucuda (`root@188.34.180.17`, `/opt/wteo`): `git pull origin main`, `.env`'e `APP_DOMAIN=app.demirwingtsun.com` + `API_DOMAIN=api.demirwingtsun.com` eklendi, `CORS_ORIGINS`'e `https://app.demirwingtsun.com` eklendi (`.env` yedeği `.env.bak.<timestamp>` olarak alındı).
- `docker compose up -d --build` ile yeniden build edildi — Postgres migration'ları (`2a9eb32c2c56`, `859ad2d0532c`) `entrypoint.sh` üzerinden otomatik uygulandı.
- **Doğrulandı:** 3 domain de SSL ile (Caddy otomatik Let's Encrypt) çalışıyor — `https://demirwingtsun.com` (yeni public site, title doğru), `https://app.demirwingtsun.com` (dashboard, title doğru), `https://api.demirwingtsun.com/api/health` → `{"status":"ok"}`. `demirwingtsun.com/api/public/schools` şu an `[]` dönüyor — beklenen, çünkü prod DB'de henüz gerçek School/User/SiteContent verisi yok (local'deki seed sadece dev DB'yi etkilemişti).

### Şimdi yapılması gereken (sıradaki iş)
- **Admin panelden (`https://app.demirwingtsun.com` → Site İçeriği / Okullar / Kullanıcılar) gerçek içerik girilmeli**: Anasayfa/DemirWteo/İletişim metinleri, okul kapak görselleri, öne çıkan eğitmen fotoğrafları/bio'ları — aksi halde `demirwingtsun.com` placeholder metinlerle görünür.
- `picture/` klasöründeki fotoğraflar admin panel üzerinden (Medya/Site İçeriği/Okullar/Kullanıcılar upload alanlarından) prod'a da yüklenmeli — local seed prod'u etkilemedi.

### Not: repo köküne gerçek fotoğraflar bırakıldı (`picture/`)
Kullanıcı bu oturumda repo köküne `picture/` klasörü altında gerçek okul/eğitmen fotoğrafları bıraktı (Kozyatağı, Tekirdağ şubeleri; Sifu Emre Yalnızlar, Sifu Saffet Demir; `demirwteo-logo.jpeg`; ayrıca henüz kullanılmamış ekstra fotoğraflar: Kozyatağı-SifuSerhat, MarmaraUni-SifuSerhat, Urla-Kamp, Tekirdag-Zabıta, Sifu Saffet.jpeg).

Bunları **sadece local dev DB'ye** (SQLite, `backend/wteo.db`) bağlamak için `backend/seed_public_content.py` scripti yazıldı ve çalıştırıldı (`python seed_public_content.py`) — fotoğrafları `backend/uploads/`'a kopyalayıp şu kayıtları oluşturdu:
- School: Kozyatağı (`cover_image_url`), Tekirdağ (`cover_image_url`)
- User: Emre Yalnızlar (`emreyalnizlar@gmail.com`, SUPER_ADMIN, SIFU, `is_featured_instructor=true`, avatar), Saffet Demir (`saffet.demir@wteo.local`, MANAGER, SIFU, `is_featured_instructor=true`, avatar) — **local test şifresi `changeme123`, prod'daki gerçek `emreyalnizlar@gmail.com` hesabıyla karıştırılmamalı**
- SiteContent: `demirwteo` slug'ı, logo görseli ile

Bio/adres/açıklama gibi metin alanları **kasıtlı olarak boş bırakıldı** (uydurma içerik yazılmadı) — bunlar admin panelden (Site İçeriği / Okullar / Kullanıcılar) gerçek metinle doldurulmalı. **Bu sadece local'i etkiledi, prod'a hiçbir şey yansımadı** — prod'da aynı içerik gerçek admin hesabıyla panel üzerinden ayrıca girilmesi gerekiyor (prod'un kendi ayrı veritabanı ve uploads volume'u var).

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
