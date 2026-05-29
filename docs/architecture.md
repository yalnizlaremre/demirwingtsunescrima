# WTEO — Sistem Mimarisi

> **Wing Tsun & Escrima Organization** — Çok kiracılı dövüş sanatları okulu yönetim sistemi için teknik mimari dokümantasyonu.

---

## İçindekiler

1. [Genel Bakış](#1-genel-bakış)
2. [Backend Mimarisi](#2-backend-mimarisi)
3. [Frontend Mimarisi](#3-frontend-mimarisi)
4. [Veritabanı Modeli](#4-veritabanı-modeli)
5. [Yetkilendirme Akışı](#5-yetkilendirme-akışı)
6. [Öğrenci İlerleme Sistemi](#6-öğrenci-i̇lerleme-sistemi)
7. [Event / Seminer Sistemi](#7-event--seminer-sistemi)
8. [Mail Sistemi](#8-mail-sistemi)

---

## 1. Genel Bakış

WTEO, React tabanlı bir SPA frontend ile FastAPI tabanlı async bir REST backend'den oluşur. İki katman birbirinden bağımsız geliştirilip deploy edilebilir; iletişim yalnızca `/api/*` endpoint'leri üzerinden gerçekleşir.

```mermaid
graph TD
    Browser["🌐 Tarayıcı\n(React SPA)"]
    Vite["Vite Dev Server\nlocalhost:5173"]
    FastAPI["FastAPI\nlocalhost:8000"]
    DB["Veritabanı\nSQLite / PostgreSQL"]
    SMTP["SMTP Sunucusu\n(async)"]
    Disk["Dosya Sistemi\nuploads/"]

    Browser -->|HTTP + JWT| Vite
    Vite -->|proxy /api| FastAPI
    FastAPI -->|SQLAlchemy async| DB
    FastAPI -->|aiosmtplib| SMTP
    FastAPI -->|StaticFiles mount| Disk
    Browser -->|GET /uploads/...| FastAPI
```

---

## 2. Backend Mimarisi

### 2.1 Katman Yapısı

```mermaid
graph TD
    subgraph "Giriş Katmanı"
        A["main.py\nlifespan · router kayıtları\nCORS · StaticFiles · exception handler"]
    end

    subgraph "Router Katmanı (app/routers/)"
        B1[auth.py]
        B2[users.py]
        B3[schools.py]
        B4[students.py]
        B5[lessons.py]
        B6[attendance.py]
        B7[events.py]
        B8[grades.py]
        B9[enrollments.py]
        B10[mail.py]
        B11[media.py]
        B12[dashboard.py]
    end

    subgraph "Servis Katmanı (services/)"
        C1["audit.py\ncreate_audit_log()"]
        C2["mail.py\nasync SMTP"]
        C3["grade_hours.py\nsınav uygunluk\nsaat hesabı"]
    end

    subgraph "Model Katmanı (app/models/)"
        D["SQLAlchemy ORM\nUUIDMixin · TimestampMixin"]
    end

    subgraph "Altyapı"
        E1["database.py\nasync engine · session factory"]
        E2["auth.py\nJWT · rol guard dependency'leri"]
        E3["config.py\nPydantic Settings · .env"]
    end

    A --> B1 & B2 & B3 & B4 & B5 & B6 & B7 & B8 & B9 & B10 & B11 & B12
    B4 & B6 & B7 --> C3
    B10 --> C2
    B1 & B2 & B3 & B4 & B7 --> C1
    B1 & B2 & B3 & B4 & B5 & B6 & B7 & B8 & B9 & B10 & B11 & B12 --> D
    D --> E1
    A --> E2
    E1 & E2 --> E3
```

### 2.2 Request Yaşam Döngüsü

```mermaid
sequenceDiagram
    participant Client
    participant FastAPI
    participant AuthDep as "auth dependency\n(role guard)"
    participant Router
    participant Service
    participant DB

    Client->>FastAPI: HTTP Request + Bearer token
    FastAPI->>AuthDep: token doğrulama
    AuthDep-->>FastAPI: User nesnesi (veya 401/403)
    FastAPI->>Router: route handler çağrısı
    Router->>DB: async SQLAlchemy sorgu
    Router->>Service: iş mantığı (saat, uygunluk, mail)
    Service->>DB: ek sorgular / güncelleme
    DB-->>Router: sonuç
    Router->>DB: audit_log kaydı
    Router-->>FastAPI: Pydantic response şeması
    FastAPI-->>Client: JSON response
```

### 2.3 Klasör Yapısı

```
backend/
├── app/
│   ├── main.py              # Uygulama giriş noktası
│   ├── auth.py              # JWT decode, require_role()
│   ├── config.py            # Settings (DATABASE_URL, SECRET_KEY …)
│   ├── database.py          # async_engine, AsyncSessionLocal, get_db()
│   ├── models/
│   │   ├── base.py          # UUIDMixin, TimestampMixin
│   │   ├── user.py          # User, UserRole, UserStatus, InstructorTitle
│   │   ├── school.py        # School, SchoolManager
│   │   ├── student.py       # Student, StudentProgress, Branch
│   │   ├── lesson.py        # Lesson
│   │   ├── lesson_schedule.py
│   │   ├── attendance.py    # Attendance (saat takibi)
│   │   ├── grade.py         # Grade
│   │   ├── event.py         # Event, EventSchool, EventRegistration, SeminarEvaluation
│   │   ├── enrollment.py    # Enrollment
│   │   ├── product.py
│   │   ├── request.py
│   │   ├── media.py
│   │   ├── email_log.py
│   │   └── audit_log.py
│   ├── routers/             # Her model için ayrı router
│   └── schemas/             # Her router için Pydantic şeması
├── services/
│   ├── audit.py
│   ├── mail.py
│   └── grade_hours.py
├── run.py                   # uvicorn başlatıcı
├── seed.py                  # Test verisi
├── create_superuser.py
└── requirements.txt
```

---

## 3. Frontend Mimarisi

### 3.1 Bileşen Hiyerarşisi

```mermaid
graph TD
    main["main.jsx\nReactDOM · BrowserRouter"]
    App["App.jsx\nRoute tanımları\nrol bazlı guard'lar"]
    AuthCtx["AuthContext\nJWT token · kullanıcı state\nlogin / logout / refresh"]
    API["services/api.js\nAxios instance\nrequest interceptor (token)\nresponse interceptor (401 → refresh)"]

    subgraph "Layout"
        Layout["Layout.jsx\nNavbar · Sidebar · Outlet"]
    end

    subgraph "Sayfalar"
        P1[Dashboard]
        P2[Schools]
        P3[Students]
        P4[Lessons]
        P5[Events]
        P6[Grades]
        P7[Products]
        P8[Requests]
        P9[Mail]
        P10[Media]
        P11[Users]
        P12[Profile]
        P13[MySchool]
        P14[PendingStudents]
        P15[Register]
    end

    subgraph "Ortak Bileşenler"
        C1[ProtectedRoute]
        C2[PageHeader]
        C3[Modal]
        C4[Toast]
    end

    main --> App
    App --> AuthCtx
    App --> C1 --> Layout
    Layout --> P1 & P2 & P3 & P4 & P5 & P6 & P7 & P8 & P9 & P10 & P11 & P12 & P13 & P14 & P15
    P1 & P2 & P3 & P4 & P5 --> API
    API --> AuthCtx
```

### 3.2 Token Yenileme Akışı (Axios Interceptor)

```mermaid
sequenceDiagram
    participant Page as "Sayfa/Bileşen"
    participant Axios as "api.js (Axios)"
    participant API as "Backend /api"
    participant Auth as "AuthContext"

    Page->>Axios: API isteği
    Axios->>API: Bearer <access_token>
    API-->>Axios: 401 Unauthorized
    Axios->>API: POST /api/auth/refresh (refresh_token)
    alt Başarılı
        API-->>Axios: yeni access_token
        Axios->>Auth: token güncelle
        Axios->>API: orijinal isteği tekrarla
        API-->>Page: başarılı response
    else Başarısız
        Axios->>Auth: logout()
        Auth-->>Page: /login'e yönlendir
    end
```

### 3.3 Routing & Rol Koruması

```mermaid
graph LR
    URL["URL isteği"] --> PR["ProtectedRoute"]
    PR --> |"token var?"| RoleCheck{"Rol\nyeterli mi?"}
    PR --> |"token yok"| Login["/login"]
    RoleCheck --> |"Evet"| Page["İstenen Sayfa"]
    RoleCheck --> |"Hayır"| Forbidden["403 / Dashboard"]
```

---

## 4. Veritabanı Modeli

### 4.1 Temel İlişkiler

```mermaid
erDiagram
    User {
        uuid id PK
        string email
        string hashed_password
        UserRole role
        UserStatus status
        InstructorTitle title
        datetime created_at
        datetime updated_at
    }

    School {
        uuid id PK
        string name
        string city
        datetime created_at
    }

    SchoolManager {
        uuid id PK
        uuid school_id FK
        uuid user_id FK
    }

    Student {
        uuid id PK
        uuid school_id FK
        string first_name
        string last_name
        string email
        datetime created_at
    }

    StudentProgress {
        uuid id PK
        uuid student_id FK
        Branch branch
        int current_grade
        float completed_hours
        datetime updated_at
    }

    Lesson {
        uuid id PK
        uuid school_id FK
        string name
        Branch branch
    }

    LessonSchedule {
        uuid id PK
        uuid lesson_id FK
        string weekday
        time start_time
        int duration_minutes
    }

    Enrollment {
        uuid id PK
        uuid student_id FK
        uuid lesson_id FK
        datetime enrolled_at
    }

    Attendance {
        uuid id PK
        uuid enrollment_id FK
        uuid lesson_schedule_id FK
        date date
        float hours
        bool present
    }

    Grade {
        uuid id PK
        Branch branch
        int level
        string name
        float required_hours
    }

    Event {
        uuid id PK
        string title
        string type
        datetime start_date
        datetime end_date
    }

    EventSchool {
        uuid id PK
        uuid event_id FK
        uuid school_id FK
    }

    EventRegistration {
        uuid id PK
        uuid event_id FK
        uuid student_id FK
        string eligibility_status
        bool needs_manager_approval
        bool approved
    }

    SeminarEvaluation {
        uuid id PK
        uuid event_id FK
        uuid student_id FK
        bool passed
        datetime evaluated_at
    }

    AuditLog {
        uuid id PK
        uuid user_id FK
        string action
        string entity_type
        uuid entity_id
        json payload
        datetime created_at
    }

    User ||--o{ SchoolManager : "yönetir"
    School ||--o{ SchoolManager : "sahiptir"
    School ||--o{ Student : "barındırır"
    School ||--o{ Lesson : "içerir"
    School ||--o{ EventSchool : "katılır"
    Student ||--o{ StudentProgress : "sahiptir"
    Student ||--o{ Enrollment : "kayıtlıdır"
    Student ||--o{ EventRegistration : "başvurur"
    Student ||--o{ SeminarEvaluation : "değerlendirilir"
    Lesson ||--o{ LessonSchedule : "planlanır"
    Lesson ||--o{ Enrollment : "içerir"
    Enrollment ||--o{ Attendance : "üretir"
    LessonSchedule ||--o{ Attendance : "bağlıdır"
    Grade ||--o{ StudentProgress : "referans"
    Event ||--o{ EventSchool : "ilişkilendirilir"
    Event ||--o{ EventRegistration : "içerir"
    Event ||--o{ SeminarEvaluation : "barındırır"
    User ||--o{ AuditLog : "üretir"
```

### 4.2 Temel Mixin'ler

Tüm modeller `base.py`'deki iki mixin'i miras alır:

- **UUIDMixin** — `id` alanı UUID v6 olarak otomatik üretilir
- **TimestampMixin** — `created_at` ve `updated_at` otomatik yönetilir

### 4.3 Enum Tipleri

| Enum | Değerler |
|------|----------|
| `UserRole` | SUPER_ADMIN, ADMIN, MANAGER, USER, MEMBER |
| `UserStatus` | ACTIVE, INACTIVE, PENDING |
| `InstructorTitle` | SI, SI-WTL, WTL, … |
| `Branch` | WING_TSUN, ESCRIMA |

---

## 5. Yetkilendirme Akışı

### 5.1 Rol Hiyerarşisi

```mermaid
graph TD
    SA["SUPER_ADMIN\nTüm erişim"]
    A["ADMIN\nOkul · Öğrenci · Ders · Etkinlik"]
    M["MANAGER\nOkul bazlı yönetim · Devam · Mail"]
    U["USER\nKendi okulu · Etkinlik kaydı"]
    MB["MEMBER\nMedya · Etkinlik listesi"]

    SA --> A --> M --> U --> MB
```

### 5.2 Login & Token Akışı

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Backend
    participant DB

    User->>Frontend: email + şifre
    Frontend->>Backend: POST /api/auth/login
    Backend->>DB: kullanıcı sorgula
    DB-->>Backend: User kaydı
    Backend->>Backend: bcrypt doğrulama
    Backend->>Backend: access_token (30 dk) oluştur
    Backend->>Backend: refresh_token (7 gün) oluştur
    Backend-->>Frontend: {access_token, refresh_token, user}
    Frontend->>Frontend: AuthContext'e kaydet
    Frontend-->>User: Dashboard'a yönlendir
```

### 5.3 Endpoint Koruma Mekanizması

```mermaid
graph LR
    Req["İstek"] --> Bearer["Bearer token\nçıkarma"]
    Bearer --> Decode["JWT decode\n(python-jose)"]
    Decode --> |"geçersiz/süresi dolmuş"| E401["401 Unauthorized"]
    Decode --> RoleGuard["require_role()\ndependency"]
    RoleGuard --> |"yetersiz rol"| E403["403 Forbidden"]
    RoleGuard --> |"yeterli rol"| Handler["Route Handler\n+ User nesnesi inject"]
```

> **Not:** Refresh token şu an veritabanında saklanmamaktadır. Bu durum logout sonrası token iptalini imkânsız kılar. Üretim ortamı için token revocation listesi (Redis veya DB tablosu) önerilir.

---

## 6. Öğrenci İlerleme Sistemi

### 6.1 Veri Modeli

Her öğrenci, kayıtlı olduğu her şube (Wing Tsun / Escrima) için ayrı bir `StudentProgress` kaydına sahiptir. Bu kayıt; mevcut derece (`current_grade`) ve tamamlanan saati (`completed_hours`) tutar.

### 6.2 Saat Güncelleme Akışı

```mermaid
flowchart TD
    A["Ders gerçekleşir"] --> B["POST /api/attendance"]
    B --> C["Attendance kaydı oluştur\n(enrollment_id, date, hours, present)"]
    C --> D{"present == true?"}
    D --> |Evet| E["grade_hours.update_progress_hours()\nstudent + branch için\ncompleted_hours += hours"]
    D --> |Hayır| F["Saat güncellenmez"]
    E --> G["StudentProgress güncellendi"]
    G --> H["audit_log kaydı"]
```

### 6.3 Sınav Uygunluk Hesabı

```mermaid
flowchart TD
    Start["Öğrenci seminer/sınava başvurur\nPOST /api/events/{id}/register"] --> FetchProgress["StudentProgress yükle\n(öğrenci + branch)"]
    FetchProgress --> FetchGrade["Grade tablosundan\nmevcut derece için\nrequired_hours bul"]
    FetchGrade --> Compare{"completed_hours\n>=\nrequired_hours?"}

    Compare --> |"Evet (tam uygun)"| ELIGIBLE["ELIGIBLE\nDoğrudan kayıt"]
    Compare --> |"Yakın ama eksik\n(eşik değeri)"| NEEDS["NEEDS_APPROVAL\nneeds_manager_approval=true\nYönetici onayı beklenir"]
    Compare --> |"Yetersiz"| NOT["NOT_ELIGIBLE\n400 hatası — kayıt reddedilir"]

    ELIGIBLE --> RegRecord["EventRegistration kaydı\napproved=true"]
    NEEDS --> RegRecord2["EventRegistration kaydı\napproved=false"]
    NOT --> End["İşlem sonlandı"]
```

### 6.4 Seminer Sonrası Değerlendirme

```mermaid
sequenceDiagram
    participant Admin
    participant API as "POST /events/{id}/evaluate"
    participant DB

    Admin->>API: Sonuç listesi [{student_id, passed}, …]
    loop Her öğrenci için
        API->>DB: SeminarEvaluation kaydı oluştur
        alt passed == true
            API->>DB: StudentProgress.current_grade += 1
            API->>DB: StudentProgress.completed_hours = 0
        end
    end
    API->>DB: audit_log kaydı
    API-->>Admin: güncellenen öğrenci listesi
```

### 6.5 Derece → Saat Eşlemesi (`grade_hours.py`)

`grade_hours.py` servisi, her derece seviyesi için gereken minimum saati tanımlar. Bu eşleme, hem uygunluk hesabında hem de ilerleme görselleştirmesinde kullanılır.

```
Grade 0 (Başlangıç) →  X saat
Grade 1             →  Y saat
Grade 2             →  Z saat
…
```

---

## 7. Event / Seminer Sistemi

### 7.1 Varlık İlişkileri

```mermaid
graph TD
    Event["Event\n(başlık · tür · tarih)"]
    EventSchool["EventSchool\n(çok-çok: Event ↔ School)"]
    EventRegistration["EventRegistration\n(öğrenci başvurusu\neligibility · approval)"]
    SeminarEvaluation["SeminarEvaluation\n(sınav sonucu)"]
    StudentProgress["StudentProgress\n(derece · saat)"]

    Event --> EventSchool
    Event --> EventRegistration
    EventRegistration --> SeminarEvaluation
    SeminarEvaluation --> |"passed=true"| StudentProgress
```

### 7.2 Tam Etkinlik Yaşam Döngüsü

```mermaid
stateDiagram-v2
    [*] --> Created : ADMIN etkinlik oluşturur
    Created --> Published : Okullara atanır (EventSchool)
    Published --> RegistrationOpen : Kayıt dönemi başlar
    RegistrationOpen --> Registered : Öğrenci başvurur
    Registered --> PendingApproval : NEEDS_APPROVAL
    Registered --> Approved : ELIGIBLE (otomatik)
    PendingApproval --> Approved : MANAGER onaylar
    PendingApproval --> Rejected : MANAGER reddeder
    Approved --> Evaluated : Seminer gerçekleşir\nPOST /evaluate
    Evaluated --> GradeUpdated : passed=true → derece +1
    Evaluated --> [*] : passed=false → değişiklik yok
    GradeUpdated --> [*]
    Rejected --> [*]
```

### 7.3 API Endpoint'leri

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/events` | Etkinlik listesi |
| POST | `/api/events` | Etkinlik oluştur |
| GET | `/api/events/{id}` | Etkinlik detayı |
| POST | `/api/events/{id}/schools` | Okul ata |
| POST | `/api/events/{id}/register` | Öğrenci başvurusu + uygunluk kontrolü |
| PATCH | `/api/events/{id}/registrations/{reg_id}` | Onay / red |
| POST | `/api/events/{id}/evaluate` | Seminer değerlendirmesi |

---

## 8. Mail Sistemi

### 8.1 Mimari

```mermaid
graph LR
    Router["Herhangi bir Router\n(events, students, …)"] --> MailService["services/mail.py\nasync_send_mail()"]
    MailRouter["POST /api/mail"] --> MailService
    MailService --> EnvCheck{"MAIL_ENABLED\n== true?"}
    EnvCheck --> |Hayır| Skip["Sessizce atla\n(geliştirme güvenliği)"]
    EnvCheck --> |Evet| SMTP["aiosmtplib\nasync SMTP bağlantısı"]
    SMTP --> Loop["Her alıcıya\nayrı gönderim"]
    Loop --> Result["Başarı / hata sayısı döner"]
    Result --> EmailLog["email_log tablosuna\nkayıt"]
```

### 8.2 Gönderim Akışı

```mermaid
sequenceDiagram
    participant Caller as "Router / Servis"
    participant Mail as "services/mail.py"
    participant SMTP as "SMTP Sunucusu"
    participant DB

    Caller->>Mail: send_mail(to=[...], subject, body)
    Mail->>Mail: MAIL_ENABLED kontrolü
    loop Her alıcı için
        Mail->>SMTP: async SMTP bağlantısı
        SMTP-->>Mail: gönderim sonucu
        Mail->>DB: email_log kaydı (başarı/hata)
    end
    Mail-->>Caller: {sent: N, failed: M}
```

### 8.3 Konfigürasyon

| `.env` Değişkeni | Açıklama |
|------------------|----------|
| `MAIL_ENABLED` | `false` → geliştirmede mail gönderimini devre dışı bırakır |
| `MAIL_HOST` | SMTP sunucusu adresi |
| `MAIL_PORT` | SMTP port (örn. 587) |
| `MAIL_USERNAME` | SMTP kullanıcı adı |
| `MAIL_PASSWORD` | SMTP şifresi |
| `MAIL_FROM` | Gönderen e-posta adresi |

---

## Ekler

### A. Kritik Riskler & Öneriler

```mermaid
graph TD
    subgraph "Yüksek Öncelik"
        R1["Migration\nAlembic entegre et"]
        R2["SECRET_KEY\nÜretimde güvenli değer kullan"]
        R3["Token Revocation\nRefresh token'ı DB'ye kaydet"]
    end

    subgraph "Orta Öncelik"
        R4["Rate Limiting\nAuth endpoint'lerine ekle"]
        R5["Dosya Depolama\nuploads/ → object storage (S3 vb.)"]
        R6["Test Coverage\nPytest + React Testing Library"]
    end

    subgraph "Düşük Öncelik"
        R7["Hata Mesajları\nTürkçe/İngilizce tutarsızlığı"]
        R8["wteo.db\n.gitignore'a ekle"]
    end
```

### B. Geliştirme → Üretim Farkları

| Özellik | Geliştirme | Üretim |
|---------|------------|--------|
| Veritabanı | SQLite (aiosqlite) | PostgreSQL (asyncpg) |
| Migration | `create_all` + inline | Alembic |
| Mail | `MAIL_ENABLED=false` | `MAIL_ENABLED=true` + SMTP |
| Dosya depolama | Local `uploads/` | Object storage (S3 vb.) |
| CORS | `localhost:5173` | Gerçek domain |
| Workers | 1 (uvicorn dev) | N (gunicorn + uvicorn workers) |
