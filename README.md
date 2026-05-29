# WTEO — Wing Tsun & Escrima Organization

Çok kiracılı dövüş sanatları okulu yönetim sistemi. Wing Tsun ve Escrima okulları için öğrenci takibi, derece/belt ilerlemesi, devam yönetimi, etkinlik/seminer organizasyonu ve sınav uygunluk kontrolü sunar.

---

## İçindekiler

- [Özellikler](#özellikler)
- [Mimari](#mimari)
- [Teknoloji Stack'i](#teknoloji-stacki)
- [Kurulum](#kurulum)
- [Geliştirme Ortamı](#geliştirme-ortamı)
- [Deployment](#deployment)
- [Kullanıcı Rolleri](#kullanıcı-rolleri)
- [API Yapısı](#api-yapısı)

---

## Özellikler

- **Çok kiracılı okul yönetimi** — Her okul bağımsız öğrenci, ders ve etkinlik verisi ile yönetilir
- **Öğrenci & derece takibi** — Wing Tsun ve Escrima şubeleri için ayrı saat ve derece ilerleme kaydı
- **Devam takibi** — Her derse ait katılım ve tamamlanan saat güncellemesi
- **Sınav uygunluk kontrolü** — Seminer kaydında otomatik uygunluk hesabı (ELIGIBLE / NEEDS_APPROVAL / NOT_ELIGIBLE)
- **Seminer değerlendirmesi** — Geçen öğrencilerin derecesi otomatik olarak artırılır, saatler sıfırlanır
- **Etkinlik & seminer yönetimi** — Kayıt, uygunluk onayı ve değerlendirme akışı
- **Async mail gönderimi** — Her alıcıya ayrı SMTP gönderimi; geliştirmede `MAIL_ENABLED=false` ile devre dışı
- **Medya yönetimi** — Görsel yükleme veya YouTube URL kaydı, okul bazlı erişim kısıtlaması
- **Denetim logu** — Tüm kritik işlemler `audit_log` tablosunda kayıt altına alınır
- **JWT kimlik doğrulama** — Access (30 dk) + Refresh (7 gün) token; frontend otomatik yenileme

---

## Mimari

```
wteo/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI giriş noktası, lifespan, router kayıtları
│   │   ├── auth.py              # JWT auth, rol guard dependency'leri
│   │   ├── config.py            # Pydantic Settings (.env okuma)
│   │   ├── database.py          # SQLAlchemy async engine + session factory
│   │   ├── models/              # ORM modelleri (User, School, Student, Lesson, Event …)
│   │   ├── routers/             # FastAPI router'ları — CRUD endpoint'leri
│   │   └── schemas/             # Pydantic request/response modelleri
│   └── services/
│       ├── audit.py             # Denetim logu yardımcısı
│       ├── mail.py              # Async SMTP gönderimi
│       └── grade_hours.py       # Derece → saat eşlemesi, sınav uygunluk hesabı
│
└── frontend/
    └── src/
        ├── App.jsx              # Route tanımları + rol bazlı guard'lar
        ├── context/AuthContext.jsx   # JWT token yönetimi
        ├── services/api.js      # Axios instance, interceptor (token + refresh)
        ├── components/          # Layout, Modal, PageHeader, ProtectedRoute …
        └── pages/               # Dashboard, Schools, Students, Events, Grades …
```

**Temel iş akışları:**

1. **Sınav & Derece İlerlemesi** — `StudentProgress`, şube bazlı saat ve derece tutar. Seminer kaydında `check_exam_eligibility()` çağrılır; seminer sonrası değerlendirme ile derece otomatik güncellenir.
2. **Devam & Saat Takibi** — Attendance kaydı, ilgili öğrencinin `completed_hours` değerini günceller.
3. **Kimlik Doğrulama** — 401 alındığında frontend interceptor otomatik token yeniler; başarısız olursa `/login`'e yönlendirir.
4. **Mail** — `MAIL_ENABLED=false` ise gönderim sessizce atlanır.

---

## Teknoloji Stack'i

### Backend

| Katman | Teknoloji |
|--------|-----------|
| Web framework | FastAPI 0.115 |
| ASGI server | Uvicorn |
| ORM | SQLAlchemy 2.0 (async) |
| Veritabanı | SQLite / aiosqlite (geliştirme) — PostgreSQL / asyncpg (üretim) |
| Kimlik doğrulama | JWT (python-jose) + bcrypt (passlib) |
| Validation | Pydantic v2 + pydantic-settings |
| Mail | aiosmtplib (async SMTP) |
| Dosya yükleme | python-multipart + aiofiles |
| UUID | uuid6 |

### Frontend

| Katman | Teknoloji |
|--------|-----------|
| UI framework | React 18 |
| Routing | React Router v6 |
| HTTP | Axios (interceptor + auto-refresh) |
| Stil | Tailwind CSS v3 |
| Build | Vite |
| İkonlar | lucide-react |
| Toast | react-hot-toast |

---

## Kurulum

### Gereksinimler

- Python 3.11+
- Node.js 18+
- (Üretim) PostgreSQL 15+

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# .env dosyasını düzenleyin (SECRET_KEY, DATABASE_URL, MAIL_* vb.)

python create_superuser.py  # İlk süper admin oluşturma
python seed.py              # (Opsiyonel) Test verisi yükleme
python run.py               # Sunucuyu başlat → http://localhost:8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev   # → http://localhost:5173
```

---

## Geliştirme Ortamı

### Önemli `.env` Değişkenleri

| Değişken | Açıklama | Varsayılan |
|----------|----------|------------|
| `DATABASE_URL` | Veritabanı bağlantı URL'i | `sqlite+aiosqlite:///./wteo.db` |
| `SECRET_KEY` | JWT imzalama anahtarı — **üretimde mutlaka değiştirin** | `CHANGE_ME_IN_PRODUCTION` |
| `CORS_ORIGINS` | İzin verilen frontend origin'leri | `http://localhost:5173` |
| `MAIL_ENABLED` | Mail gönderimini etkinleştirir | `false` |
| `UPLOAD_DIR` | Yüklenen dosyaların dizini | `uploads/` |

### Veritabanı Migration

Geliştirmede `Base.metadata.create_all` ile tablolar otomatik oluşturulur. Küçük schema değişiklikleri `_migrate_sqlite()` ile yönetilir.

> ⚠️ **Üretimde Alembic kullanılması önerilir.** Mevcut inline migration yöntemi schema drift riskine açıktır.

### Sağlık Kontrolü

```
GET /api/health
```

---

## Deployment

### Üretim için Kontrol Listesi

- [ ] `SECRET_KEY` güçlü, rastgele bir değerle değiştirildi
- [ ] `DATABASE_URL` PostgreSQL bağlantısına güncellendi
- [ ] `MAIL_ENABLED=true` ve SMTP bilgileri girildi
- [ ] `CORS_ORIGINS` yalnızca gerçek domain'leri içeriyor
- [ ] `wteo.db` ve `uploads/` `.gitignore`'a eklendi
- [ ] Alembic kuruldu ve migration'lar hazırlandı
- [ ] `uploads/` için kalıcı depolama (object storage) yapılandırıldı

### Backend (üretim)

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

### Frontend (build)

```bash
npm run build   # dist/ klasörü oluşturulur; Nginx / CDN ile servis edilebilir
```

### Vite Proxy (geliştirme)

`vite.config.js` içinde `/api` istekleri `http://localhost:8000`'e proxy'lenir.

---

## Kullanıcı Rolleri

```
SUPER_ADMIN → ADMIN → MANAGER → USER → MEMBER
```

| Rol | Yetkiler |
|-----|----------|
| **SUPER_ADMIN** | Tüm erişim; sistem geneli yönetim |
| **ADMIN** | Okul, öğrenci, ders, etkinlik yönetimi |
| **MANAGER** | Okul bazlı yönetim, devam takibi, mail gönderimi |
| **USER** | Kendi okul bilgileri, etkinliklere kayıt |
| **MEMBER** | Medya görüntüleme, etkinlik listesi |

---

## API Yapısı

Tüm endpoint'ler `/api` prefix'i altındadır.

| Router | Endpoint | Açıklama |
|--------|----------|----------|
| Auth | `/api/auth` | Login, logout, token yenileme |
| Users | `/api/users` | Kullanıcı CRUD |
| Schools | `/api/schools` | Okul yönetimi |
| Students | `/api/students` | Öğrenci CRUD, ilerleme takibi |
| Lessons | `/api/lessons` | Ders yönetimi |
| Lesson Schedules | `/api/lesson-schedules` | Ders programları |
| Attendance | `/api/attendance` | Devam kaydı, saat güncelleme |
| Events | `/api/events` | Etkinlik/seminer, sınav uygunluk, değerlendirme |
| Grades | `/api/grades` | Derece tanımları |
| Enrollments | `/api/enrollments` | Öğrenci ders kaydı |
| Products | `/api/products` | Ürün/eşya kataloğu |
| Requests | `/api/requests` | Üye talepleri |
| Mail | `/api/mail` | Mail gönderimi |
| Media | `/api/media` | Görsel yükleme, YouTube kaydı |
| Dashboard | `/api/dashboard` | Özet istatistikler |
| Health | `/api/health` | Servis sağlık kontrolü |

### Kimlik Doğrulama

Tüm korumalı endpoint'ler `Authorization: Bearer <token>` header'ı gerektirir.

### Sınav Uygunluk Akışı

```
POST /api/events/{id}/register
  → check_exam_eligibility()
      ├── ELIGIBLE          → Doğrudan kayıt
      ├── NEEDS_APPROVAL    → needs_manager_approval=true, yönetici onayı bekler
      └── NOT_ELIGIBLE      → 400 hatası, kayıt reddedilir

POST /api/events/{id}/evaluate
  → Geçen öğrenciler: grade +1, completed_hours sıfırlanır
```

---

## Bilinen Riskler

| Alan | Risk |
|------|------|
| Migration | Üretimde Alembic yok; schema drift riski yüksek |
| SECRET_KEY | `.env.example` değeri üretimde değiştirilmezse kritik güvenlik açığı |
| SQLite dosyası | `wteo.db` yanlışlıkla commit'lenebilir — `.gitignore`'a ekleyin |
| Dosya depolama | `uploads/` local disk'te; yatay scaling veya yeniden deploy'da kaybolabilir |
| Token revocation | Refresh token DB'de saklanmıyor; logout sonrası token iptal edilemiyor |
| Rate limiting | Auth endpoint'lerinde brute-force koruması yok |
| Test coverage | Test dosyası yok |
