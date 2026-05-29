# Project Context — WTEO (Wing Tsun & Escrima Organization)

## Proje Amacı

Wing Tsun ve Escrima dövüş sanatları okullarını yönetmek için geliştirilmiş çok kiracılı bir okul yönetim sistemi. Öğrenci takibi, derece/belt ilerleme yönetimi, devam takibi, etkinlik/seminer yönetimi, sınav uygunluk kontrolü ve okul bazlı yönetim özellikleri sunar.

---

## Klasör Yapısı

```
wteo/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI uygulama giriş noktası, lifespan, router kayıtları
│   │   ├── auth.py              # JWT auth, role guard dependency'leri
│   │   ├── config.py            # Pydantic Settings (.env okuma)
│   │   ├── database.py          # SQLAlchemy async engine + session factory
│   │   ├── models/              # ORM modelleri
│   │   │   ├── base.py          # UUIDMixin, TimestampMixin
│   │   │   ├── user.py          # User, UserRole, UserStatus, InstructorTitle
│   │   │   ├── school.py        # School, SchoolManager
│   │   │   ├── student.py       # Student, StudentProgress, Branch
│   │   │   ├── lesson.py        # Lesson
│   │   │   ├── lesson_schedule.py
│   │   │   ├── attendance.py    # Attendance → saat takibi
│   │   │   ├── grade.py         # Grade (derece) tanımları
│   │   │   ├── event.py         # Event, EventSchool, EventRegistration, SeminarEvaluation
│   │   │   ├── enrollment.py    # Öğrenci ders kaydı
│   │   │   ├── product.py       # Ürün/eşya kataloğu
│   │   │   ├── request.py       # Üye talepleri
│   │   │   ├── media.py         # Medya (görsel + YouTube)
│   │   │   ├── email_log.py     # Gönderilen mail kaydı
│   │   │   └── audit_log.py     # Denetim logu
│   │   ├── routers/             # FastAPI router'ları (CRUD endpoint'leri)
│   │   │   ├── auth.py          # /api/auth
│   │   │   ├── users.py         # /api/users
│   │   │   ├── schools.py       # /api/schools
│   │   │   ├── students.py      # /api/students
│   │   │   ├── lessons.py       # /api/lessons
│   │   │   ├── lesson_schedules.py
│   │   │   ├── attendance.py    # /api/attendance
│   │   │   ├── events.py        # /api/events (sınav uygunluk + seminer değerlendirme dahil)
│   │   │   ├── grades.py        # /api/grades
│   │   │   ├── enrollments.py   # /api/enrollments
│   │   │   ├── products.py      # /api/products
│   │   │   ├── requests.py      # /api/requests
│   │   │   ├── mail.py          # /api/mail
│   │   │   ├── media.py         # /api/media
│   │   │   └── dashboard.py     # /api/dashboard
│   │   └── schemas/             # Pydantic request/response modelleri
│   │       └── (her router için eşleşen schema dosyası)
│   ├── services/
│   │   ├── audit.py             # create_audit_log yardımcısı
│   │   ├── mail.py              # aiosmtplib ile async SMTP gönderimi
│   │   └── grade_hours.py       # Derece → saat eşlemesi + sınav uygunluk hesabı
│   ├── run.py                   # uvicorn başlatma scripti
│   ├── seed.py                  # Geliştirme ortamı için test verisi
│   ├── create_superuser.py      # İlk süper admin oluşturma scripti
│   ├── requirements.txt
│   ├── .env / .env.example
│   └── wteo.db                  # SQLite veritabanı (geliştirme)
│
└── frontend/
    ├── src/
    │   ├── main.jsx             # ReactDOM render, BrowserRouter
    │   ├── App.jsx              # Route tanımları + rol bazlı guard'lar
    │   ├── context/AuthContext.jsx   # JWT token yönetimi, kullanıcı state
    │   ├── services/api.js      # Axios instance, interceptor (token ekleme + refresh)
    │   ├── components/          # Layout, Modal, PageHeader, ProtectedRoute vb.
    │   └── pages/               # Dashboard, Schools, Students, Lessons, Events,
    │                            #   Grades, Products, Requests, Mail, Media,
    │                            #   Users, Profile, MySchool, PendingStudents, Register
    ├── package.json
    ├── vite.config.js
    └── tailwind.config.js
```

---

## Kullanılan Teknolojiler

### Backend
| Katman | Teknoloji |
|--------|-----------|
| Web framework | FastAPI 0.115 |
| ASGI server | Uvicorn |
| ORM | SQLAlchemy 2.0 (async) |
| Veritabanı | SQLite (aiosqlite) — prod'da PostgreSQL (asyncpg) desteklenir |
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

## Entry Point'ler

- **Backend başlangıcı:** `backend/run.py` → `uvicorn app.main:app`
- **Uygulama giriş noktası:** `backend/app/main.py` — lifespan ile tablo oluşturma + SQLite migration, tüm router'lar burada kayıtlı
- **İlk kurulum:** `backend/create_superuser.py` (süper admin), `backend/seed.py` (test verisi)
- **Frontend başlangıcı:** `frontend/src/main.jsx` → `App.jsx`
- **API health check:** `GET /api/health`

---

## Rol Hiyerarşisi

```
SUPER_ADMIN → ADMIN → MANAGER → USER → MEMBER
```

- **SUPER_ADMIN:** Tüm erişim
- **ADMIN:** Okul, öğrenci, ders, etkinlik yönetimi
- **MANAGER:** Okul bazlı yönetim, devam, mail
- **USER:** Kendi okul bilgileri, etkinliklere kayıt
- **MEMBER:** Medya görüntüleme, etkinlikler

---

## Ana İş Akışları

### 1. Öğrenci Sınav & Derece İlerlemesi
- `StudentProgress` her öğrenci + şube (Wing Tsun / Escrima) için ayrı saat ve derece tutar
- `grade_hours.py`: derece aralığına göre gerekli saat eşlemesi
- Seminer kaydında `check_exam_eligibility()` çağrılır:
  - `ELIGIBLE` → doğrudan sınava alınır
  - `NEEDS_APPROVAL` → yönetici onayı gerekir (`needs_manager_approval=True`)
  - `NOT_ELIGIBLE` → sınav kaydı reddedilir
- Seminer değerlendirmesi (`POST /events/{id}/evaluate`): geçen öğrencilerin derecesi +1 artırılır, saatler sıfırlanır

### 2. Devam & Saat Takibi
- Her ders kaydı (Attendance) öğrencinin `completed_hours` değerini günceller
- `grade_hours.py::update_progress_hours()` saat ekler/çıkarır

### 3. Kimlik Doğrulama
- Access token (30 dk) + Refresh token (7 gün)
- Frontend `api.js` interceptor: 401 alındığında otomatik token yenileme, başarısızsa `/login`'e yönlendirme

### 4. Mail Gönderimi
- `MAIL_ENABLED=false` ise sessizce atlar (geliştirme güvenliği)
- `services/mail.py`: her alıcıya ayrı ayrı async SMTP gönderimi, başarı/hata sayısı döner

### 5. Medya
- Görsel yükleme (`/uploads` static mount) veya YouTube URL kaydı
- Okul bazlı erişim kısıtlaması

---

## Config & Deployment

- **Yapılandırma:** `.env` dosyası (`.env.example`'dan kopyalanır)
- **Önemli değişkenler:** `DATABASE_URL`, `SECRET_KEY`, `CORS_ORIGINS`, `MAIL_ENABLED`, `UPLOAD_DIR`
- **Veritabanı migration:** Geliştirmede `Base.metadata.create_all` + inline `_migrate_sqlite()` (ALTER TABLE); **üretimde Alembic kullanılması önerilir** (kod içinde de not düşülmüş)
- **Static dosyalar:** `uploads/` klasörü, FastAPI'nin `StaticFiles` ile mount'u
- **Frontend proxy:** Vite `vite.config.js` muhtemelen `/api` → `localhost:8000` proxy tanımı içeriyor

---

## Eksik / Riskli Noktalar

| Alan | Risk |
|------|------|
| **Migration** | Üretimde Alembic yok; inline `_migrate_sqlite()` ile elle yapılıyor — schema drift riski yüksek |
| **SECRET_KEY** | `.env.example`'da `CHANGE_ME_IN_PRODUCTION` — üretimde değiştirilmezse kritik güvenlik açığı |
| **SQLite** | `wteo.db` dosyası repo'da (`backend/wteo.db`) — production verisi yanlışlıkla commit'lenebilir |
| **`uploads/`** | Yüklenen dosyalar `backend/uploads/` altında local disk'te; yatay scaling veya yeniden deploy'da kaybolur |
| **Test** | Test dosyası görünmüyor — sıfır test coverage |
| **Error handling** | Generic `500` handler var, ama router düzeyinde tutarsız hata mesajları (Türkçe/İngilizce karışık) |
| **Rate limiting** | Auth endpoint'lerinde brute-force koruması yok |
| **Token revocation** | Refresh token DB'de saklanmıyor — logout sonrası token geçerliliğini iptal etmek mümkün değil |
| **`nul` dosyası** | Kök dizinde `nul` adlı dosya var (Windows `> nul` yönlendirmesinden oluşmuş olabilir) — temizlenmeli |
