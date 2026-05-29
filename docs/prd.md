# WTEO — Product Requirements Document (Tersine Mühendislik)

> Bu belge, mevcut kod tabanı analiz edilerek **tersine mühendislikle** çıkarılmış iş gereksinimlerini kapsar. Orijinal bir PRD belgesi mevcut olmadığından, buradaki her başlık kodun fiili davranışından, veri modelinden ve iş mantığından türetilmiştir.

---

## İçindekiler

1. [Business Goal](#1-business-goal)
2. [User Personas](#2-user-personas)
3. [User Stories](#3-user-stories)
4. [Acceptance Criteria](#4-acceptance-criteria)
5. [Future Roadmap](#5-future-roadmap)
6. [Missing Features](#6-missing-features)
7. [Technical Debt](#7-technical-debt)

---

## 1. Business Goal

### Problem

Wing Tsun ve Escrima dövüş sanatları okulları, öğrenci takibini genellikle kağıt defterler, Excel tabloları veya birbiriyle konuşmayan araçlarla yönetmektedir. Bu yaklaşım şu sorunlara yol açar:

- Derece ve saat takibi hatalı veya eksik kalır; sınav uygunluğu kişisel hafızaya dayanır.
- Seminer ve sınav organizasyonu e-posta zincirlerine sıkışır; onay süreçleri şeffaf değildir.
- Farklı şehirlerdeki okullar arasında tutarlı standart uygulanamaz.
- Öğrenciler kendi ilerlemelerini göremez; motivasyon eksikliği oluşur.

### Çözüm

WTEO, Wing Tsun & Escrima Organization'a bağlı tüm okulları tek bir çatı altında yöneten **çok kiracılı bir web uygulamasıdır.** Temel değer önerileri:

- Her öğrencinin saati, derecesi ve sınav uygunluğu otomatik hesaplanır.
- Seminer/sınav süreçleri dijital onay akışıyla yönetilir; belirsizlik ortadan kalkar.
- Okul müdürleri (eğitmenler) kendi öğrencilerini bağımsız yönetir; merkezi admin tüm sistemi denetler.
- Öğrenciler kendi profillerinden ilerlemelerini anlık görebilir.

### Hedef Kitlesi

Türkiye ve çevre ülkelerdeki Wing Tsun ve Escrima okul ağı. Birden fazla okul içeren bir federasyon yapısı varsayılmaktadır.

### Başarı Metrikleri (tahmini)

- Tüm aktif okulların sisteme taşınması
- Kağıt tabanlı sınav uygunluk kontrolünün sıfıra inmesi
- Öğrenci onay süresinin < 24 saate düşürülmesi
- Seminer kayıt ve değerlendirme sürecinin tamamen dijitalleşmesi

---

## 2. User Personas

### Persona 1 — Merkez Yöneticisi (SUPER_ADMIN / ADMIN)

**Kim:** Organizasyonun genel sekreteri veya teknik sorumlusu. Tüm okulları, kullanıcıları ve sistemi yönetir.

**Hedefleri:**
- Yeni okul açıldığında sisteme hızla ekleyebilmek
- Tüm okullardaki öğrenci, ders ve etkinlik verilerini tek ekrandan görebilmek
- Seminer duyurularını tüm okullara veya seçili okullara yayabilmek
- Kullanıcı rollerini ve yetkilerini yönetebilmek

**Acıları:**
- Her okulu ayrı ayrı aramak zaman kaybettirir
- Sınav uygunluk listelerini manuel derlemek hata üretir
- Onay bekleyen öğrenci ve talepleri takip etmek zorlaşır

---

### Persona 2 — Okul Eğitmeni / Müdürü (MANAGER)

**Kim:** Bir veya birden fazla okulun sorumlu eğitmeni. Unvanı SIFU veya SIHING olabilir.

**Hedefleri:**
- Kendi okul öğrencilerinin devam ve saat bilgilerini tutabilmek
- Yeni öğrenci başvurularını onaylayıp reddedebilmek
- Öğrencilere ürün talebi, özel ders gibi konularda cevap verebilmek
- Okul medyasını (fotoğraf/video) düzenleyebilmek
- Belirli derece aralığındaki öğrencilere toplu mail gönderebilmek

**Acıları:**
- Sınav öncesi her öğrencinin saatini tek tek kontrol etmek yorucudur
- Onay bekleyen öğrencileri kaçırmak hızlı büyüyen okullarda kolaydır
- Etkinlik kayıtları ve onaylar karışık e-posta zincirlerinde kaybolur

---

### Persona 3 — Öğrenci / Üye (USER / MEMBER)

**Kim:** Bir okula kayıtlı, düzenli derslere devam eden öğrenci. Sisteme kendi hesabıyla giriş yapar.

**Hedefleri:**
- Mevcut derecesini ve bir sonraki sınav için kaç saat kaldığını görebilmek
- Yaklaşan seminer ve etkinliklere kolayca kayıt olabilmek
- Ürün siparişi veya özel ders talebi iletebilmek
- Okul medyasını (teknik videolar, fotoğraflar) görüntüleyebilmek

**Acıları:**
- "Sınava girebilir miyim?" sorusunun cevabı her seferinde eğitmene sormayı gerektirir
- Etkinlik tarihlerini öğrenmek için sosyal medya veya mesajlaşma gruplarına bağımlıdır

---

### Persona 4 — Misafir / Potansiyel Üye (MEMBER — kayıtsız)

**Kim:** Sisteme yeni kaydolan, henüz bir okula atanmamış kullanıcı.

**Hedefleri:**
- Sisteme kayıt olabilmek
- Okul bilgilerini ve etkinlikleri görebilmek

---

## 3. User Stories

### Kimlik Doğrulama & Hesap

| # | Hikaye |
|---|--------|
| A-1 | Potansiyel üye olarak sisteme e-posta ve şifreyle kaydolabilmeliyim, böylece hesabım oluşur ve onay bekler. |
| A-2 | Aktif kullanıcı olarak e-posta ve şifremi girerek sisteme giriş yapabilmeliyim. |
| A-3 | Giriş yapmış kullanıcı olarak profilimi görebilmeli; adım, soyadım ve telefon numaramı güncelleyebilmeliyim. |
| A-4 | Profil fotoğrafı yükleyebilmeliyim (JPEG, PNG, WebP; maks 5 MB). |
| A-5 | Mevcut şifremi bilerek yeni şifre belirleyebilmeliyim. |
| A-6 | Oturum sürem dolarsa sistem otomatik olarak yeni token almalı; bu başarısız olursa login ekranına yönlendirilmeliyim. |

---

### Öğrenci & Onay Akışı

| # | Hikaye |
|---|--------|
| S-1 | Eğitmen olarak bekleyen öğrenci başvurularının listesini görebilmeliyim. |
| S-2 | Eğitmen olarak bir öğrenciyi **onaylayabilmeli** ya da **reddedebilmeliyim**; onaylandığında öğrencinin hem Wing Tsun hem Escrima için ilerleme kaydı otomatik oluşmalıdır. |
| S-3 | Öğrenci olarak kendi profilimden mevcut derecemi, tamamladığım saati, kalan saatimi ve sınav uygunluk durumumu görebilmeliyim. |
| S-4 | Admin olarak tüm okullardaki öğrencileri listeleyebilmeli; isimle arayabilmeliyim. Eğitmen ise yalnızca kendi okul öğrencilerini görebilmelidir. |
| S-5 | Öğrenci sayfasından acil iletişim bilgisi ve notlar girebilmeliyim. |

---

### Ders & Devam

| # | Hikaye |
|---|--------|
| L-1 | Eğitmen olarak yeni ders oluşturabilmeliyim (branch, tür, tarih, süre). |
| L-2 | Eğitmen olarak bir ders için devam kaydı girebilmeliyim; katılan her öğrencinin tamamlanan saati otomatik güncellenmelidir. |
| L-3 | Hatalı devam kaydını silebilmeliyim; silme işlemi saatleri geri almalıdır. |
| L-4 | Bir derse ait tüm devam kayıtlarını listeleyebilmeliyim. |

---

### Sınav Uygunluk & Derece İlerlemesi

| # | Hikaye |
|---|--------|
| G-1 | Sistem, her öğrenci için derece ve tamamlanan saate göre sınav uygunluğunu otomatik hesaplamalıdır: **ELIGIBLE** (tam uygun), **NEEDS_APPROVAL** (eşiği geçmiş ama yeterli değil — eğitmen onayı gerekir), **NOT_ELIGIBLE** (yetersiz). |
| G-2 | Öğrenci olarak herhangi bir seminer sayfasında kendi sınav uygunluk durumumu görebilmeliyim. |
| G-3 | Eğitmen olarak, eğitmen onayı gerektiren kayıtları **onaylayabilmeliyim**. |
| G-4 | Seminer değerlendirmesinde geçen öğrencilerin derecesi +1 artmalı ve saatleri sıfırlanmalıdır; geçmeyen öğrencilerde herhangi bir değişiklik olmamalıdır. |

---

### Etkinlik & Seminer

| # | Hikaye |
|---|--------|
| E-1 | Admin olarak yeni etkinlik veya seminer oluşturabilmeliyim (ad, açıklama, tür, tarih, konum, kapasite, ücret, kapsam). |
| E-2 | Etkinliği tüm okullara veya seçili okullara atayabilmeliyim. |
| E-3 | Öğrenci olarak açık etkinlikleri görebilmeli ve Wing Tsun / Escrima için ayrı ayrı kayıt yaptırabilmeliyim. |
| E-4 | Seminer kaydında sınav da almak isteyebilmeliyim; sistem uygunluk kontrolü yapmalıdır. |
| E-5 | Admin/Eğitmen olarak bir etkinliğin kayıt listesini görebilmeliyim. |
| E-6 | Seminer değerlendirmesini tamamladığımda etkinlik **tamamlandı** olarak işaretlenmelidir; tekrar değerlendirme yapılamamalıdır. |

---

### Talep Yönetimi

| # | Hikaye |
|---|--------|
| R-1 | Öğrenci olarak ürün siparişi, özel ders veya grup ders talebi oluşturabilmeliyim. |
| R-2 | Ürün talebinde beden bilgisi girebilmeliyim; özel/grup ders talebinde tercih ettiğim tarih ve branch'i belirtebilmeliyim. |
| R-3 | Eğitmen olarak kendi okul öğrencilerinin taleplerini görebilmeli; onaylayabilmeli veya reddedebilmeliyim. |
| R-4 | Öğrenci olarak kendi taleplerimin durumunu takip edebilmeliyim. |

---

### Mail

| # | Hikaye |
|---|--------|
| M-1 | Eğitmen/Admin olarak okul, branch ve derece aralığı filtresi uygulayarak seçili öğrencilere toplu e-posta gönderebilmeliyim. |
| M-2 | Gönderilen e-postaların kaydı tutulmalı; kim gönderdi, kaç kişiye, hangi filtrelerle gönderiildi bilgisi saklanmalıdır. |
| M-3 | Geliştirme ortamında mail gönderimi devre dışı bırakılabilmelidir. |

---

### Medya

| # | Hikaye |
|---|--------|
| MD-1 | Yetkili kullanıcılar (can_upload_media=true) okul için fotoğraf, video veya YouTube bağlantısı yükleyebilmelidir. |
| MD-2 | Öğrenciler kendi okullarına ait medya içeriklerini görüntüleyebilmelidir. |

---

### Ürün Kataloğu

| # | Hikaye |
|---|--------|
| P-1 | Admin olarak ürün kategorisi ve ürün ekleyebilmeliyim (ad, açıklama, fiyat, beden seçenekleri, görsel). |
| P-2 | Öğrenciler ürün kataloğunu görüntüleyebilmeli ve ürünlere talep oluşturabilmelidir. |

---

### Dashboard

| # | Hikaye |
|---|--------|
| D-1 | Admin olarak dashboard'da toplam okul, aktif öğrenci, aktif etkinlik, bekleyen talep ve onay sayılarını görebilmeliyim. |
| D-2 | Eğitmen olarak dashboard'da kendi okulunun öğrenci sayısını, bekleyen talep ve onay sayısını, yaklaşan etkinlik sayısını görebilmeliyim. |
| D-3 | Öğrenci olarak dashboard'da mevcut derecemi, tamamladığım saati, kalan saatimi ve yaklaşan etkinlik sayısını görebilmeliyim. |

---

## 4. Acceptance Criteria

### AC-1: Öğrenci Onay Akışı

- [ ] Kayıt olan kullanıcı `PENDING` statüsüyle oluşturulur ve sisteme giriş yapamaz.
- [ ] Eğitmen onay verdiğinde kullanıcı `ACTIVE` statüsüne geçer ve hem Wing Tsun hem Escrima için `StudentProgress` kaydı oluşur; grade=1, completed_hours=0.
- [ ] Eğitmen reddettiğinde kullanıcı `INACTIVE` statüsüne geçer.
- [ ] Eğitmen yalnızca kendi okulundaki öğrencileri onaylayabilir; başka okul öğrencisini onaylama girişimi 403 döner.

### AC-2: Devam & Saat Güncelleme

- [ ] Devam kaydı oluşturulduğunda `StudentProgress.completed_hours` artırılır ve `remaining_hours` yeniden hesaplanır.
- [ ] Aynı öğrenci ve ders kombinasyonu için ikinci devam kaydı oluşturulamaz (duplicate koruması).
- [ ] Devam kaydı silindiğinde saat eksilmesi tam olarak geri alınır.
- [ ] Öğrenci ile ders aynı okula ait değilse devam kaydı oluşturulamaz.

### AC-3: Sınav Uygunluk Mantığı

Derece aralıklarına göre saat gereksinimleri:

| Derece Aralığı | Tam Gereksinim | Alt Sınır (NEEDS_APPROVAL) |
|---------------|---------------|--------------------------|
| 1–3 | 54 saat | 44 saat |
| 4–8 | 60 saat | 52 saat |
| 9–10 | 96 saat | 80 saat |
| 11–12 | 128 saat | 110 saat |

- [ ] `completed_hours >= required` → ELIGIBLE
- [ ] `minimum <= completed_hours < required` → NEEDS_APPROVAL
- [ ] `completed_hours < minimum` → NOT_ELIGIBLE
- [ ] NOT_ELIGIBLE öğrenci için `exam_branch_*` otomatik `false` yapılır.
- [ ] NEEDS_APPROVAL durumunda `needs_manager_approval=true` ile kayıt oluşturulur.

### AC-4: Seminer Değerlendirmesi

- [ ] Yalnızca `event_type == SEMINAR` olan etkinlikler değerlendirilebilir.
- [ ] `is_completed == true` olan seminer tekrar değerlendirilemez; 400 döner.
- [ ] Geçen öğrenciler için: `current_grade += 1`, `completed_hours = 0`, `remaining_hours = new_required`.
- [ ] Her derece değişimi için `SeminarEvaluation` kaydı oluşturulur (`grade_before`, `grade_after` alanlarıyla).
- [ ] Değerlendirme sonrası event `is_completed = true` yapılır.

### AC-5: Mail Filtreleme

- [ ] `branch` + `grade_min/grade_max` filtresi uygulandığında yalnızca ilgili `StudentProgress` kaydına sahip öğrenciler seçilir.
- [ ] Eğitmen yalnızca kendi okul öğrencilerine mail gönderebilir.
- [ ] Her mail gönderimi `EmailLog` tablosuna kaydedilir.
- [ ] `MAIL_ENABLED=false` iken gönderim sessizce atlanır, log yine de yazılır.

### AC-6: Rol Erişim Kontrolü

| İşlem | SUPER_ADMIN | ADMIN | MANAGER | USER | MEMBER |
|-------|:-----------:|:-----:|:-------:|:----:|:------:|
| Okul CRUD | ✓ | ✓ | — | — | — |
| Tüm okul öğrencileri | ✓ | ✓ | Sadece kendi | Sadece kendisi | — |
| Öğrenci onay | ✓ | ✓ | Kendi okulu | — | — |
| Devam kaydı | ✓ | ✓ | Kendi okulu | — | — |
| Event oluştur | ✓ | ✓ | — | — | — |
| Event kayıt | ✓ | ✓ | ✓ | ✓ | — |
| Seminer değerlendir | ✓ | ✓ | — | — | — |
| Mail gönder | ✓ | ✓ | Kendi okulu | — | — |
| Medya yükle | can_upload_media | can_upload_media | can_upload_media | — | — |

---

## 5. Future Roadmap

Kod tabanında görülen eksikler, yarım kalmış modeller ve doğal iş büyümesi buradan türetilmiştir.

### Faz 2 — Kısa Vadeli (0–3 ay)

**F2-1: Mobil Uyumlu Arayüz**
Mevcut Tailwind CSS altyapısı mobil uyumlu geliştirmeye hazır, ancak optimize edilmemiş. Öğrencilerin telefondan devam ve derece takibi yapabilmesi.

**F2-2: Bildirim Sistemi**
Onaylanan/reddedilen öğrenci başvurusu, yaklaşan seminer, sınav uygunluğu gibi olaylarda e-posta veya uygulama içi bildirim.

**F2-3: Alembic Migration**
Üretim ortamı için `create_all` ve inline migration'dan Alembic'e geçiş. Schema drift riskinin giderilmesi.

**F2-4: Token Revocation**
Refresh token'ların veritabanında (Redis veya tablo) saklanması; logout sonrası token iptal mekanizması.

---

### Faz 3 — Orta Vadeli (3–6 ay)

**F3-1: Ödeme Entegrasyonu**
Etkinlik modelinde `wt_fee` ve `escrima_fee` alanları mevcut, ancak ödeme altyapısı yok. Iyzico veya benzeri bir ödeme sağlayıcısıyla seminer ücretlerinin online tahsili.

**F3-2: Ders Programı Görselleştirmesi**
`LessonSchedule` modeli vardır ancak haftalık/aylık takvim görünümü eksik. Öğrencilerin ders programını takvim formatında görebilmesi.

**F3-3: Gelişmiş Raporlama**
- Okul bazlı devam raporları
- Derece dağılım istatistikleri
- Seminer katılım analitikleri
- CSV/Excel dışa aktarım

**F3-4: Çoklu Okul Yönetimi**
`SchoolManager` çoktan-çoğa ilişkisini destekliyor. Bir eğitmenin aynı anda birden fazla okulu yönetebileceği arayüz senaryoları.

---

### Faz 4 — Uzun Vadeli (6–12 ay)

**F4-1: Öğrenci Karnesi & Sertifika**
Derece geçişlerini belgelendiren, QR kod içeren dijital sertifika/karakter belgesi üretimi.

**F4-2: Mobil Uygulama**
React Native ile mevcut API'yi kullanan native mobil uygulama. Öğrenci derece kartı ve check-in özelliği.

**F4-3: Federasyon / Çok Tenant Mimarisi**
Şu an tek bir organizasyonu destekliyor. Birden fazla bağımsız organizasyonun (ülke federasyonları) aynı platform üzerinde çalışabilmesi.

**F4-4: API Erişimi & Webhook**
Diğer sistemlerle entegrasyon için API key tabanlı erişim ve olay bazlı webhook desteği.

---

## 6. Missing Features

Veri modelinde altyapısı olan ancak frontend/backend'de eksik veya yarım kalan özellikler.

### 6.1 Ürün Siparişi Tamamlama Akışı

`Request` modeli ürün talebi destekliyor, `Product` ve `ProductCategory` modelleri de mevcut. Ancak:
- Stok takibi yok (`Product` modelinde quantity alanı eksik)
- Sipariş onaylandıktan sonra ne olduğu (kargo, teslim) tanımsız
- Ürün görseli yükleme mekanizması tam değil

### 6.2 GradeRequirement Tablosu Kullanılmıyor

`grade_requirements` tablosu ve `GradeRequirement` modeli veritabanında tanımlı, ancak sınav uygunluk hesabı bu tabloyu okumak yerine `grade_hours.py` içindeki **hardcoded** bir dictionary kullanıyor. Bu çelişki:
- Admin panelinden derece saatlerini değiştirme imkânı vermiyor
- Tablo şu an tamamen boş ve işlevsiz
- Üretimde yanlış bir değişiklik ciddi sonuçlar doğurabilir

### 6.3 Ders Programı (LessonSchedule) Entegrasyonu

`LessonSchedule` modeli haftalık tekrarlayan ders programı tanımlamak için tasarlanmış, ancak:
- Lesson oluştururken schedule seçimi opsiyonel ve UI'da eksik
- Otomatik tekrarlayan ders oluşturma mekanizması yok
- Çakışma kontrolü yok (aynı salon/saat)

### 6.4 Kapasite Kontrolü

`Event` modelinde `capacity` alanı var, ancak kayıt endpoint'i kapasite kontrolü yapmıyor. Kapasite dolduğunda yeni kayıt engellenmeli.

### 6.5 Etkinlik Ücreti & Ödeme

`wt_fee` / `escrima_fee` alanları tanımlı ancak hiçbir ödeme akışı yok. Ücret bilgisi şu an yalnızca bilgilendirme amaçlı gösteriliyor.

### 6.6 Öğrenci Okul Transferi

Bir öğrencinin bir okuldan diğerine geçişini yönetecek bir mekanizma yok. `Student.school_id` güncellenebilir, ancak bu akış için özel bir endpoint veya UI yok.

### 6.7 Audit Log Görüntüleme

`audit_log` tablosu yazılıyor ancak bunu gösteren bir admin arayüzü veya API endpoint'i yok. Denetim izlerinden yararlanmak için doğrudan veritabanı erişimi gerekiyor.

### 6.8 Öğrenci Devam Geçmişi

Öğrenci profil sayfasından geçmiş devam kayıtlarını ve ders tarihlerini listeleyecek bir görünüm eksik. Şu an yalnızca toplam saat gösteriliyor.

---

## 7. Technical Debt

### TD-1: Veritabanı Migration (Kritik)

**Sorun:** Üretim ortamında `Base.metadata.create_all` ve `_migrate_sqlite()` kullanılıyor. Schema değişikliklerinde veri kaybı riski var.

**Öneri:** Alembic entegrasyonu. `alembic init`, ilk `revision --autogenerate`, CI'da `alembic upgrade head`.

**Etki:** Her deploy potansiyel olarak üretim verisine zarar verebilir.

---

### TD-2: Hardcoded Saat Gereksinimleri (Yüksek)

**Sorun:** `grade_hours.py` içindeki `GRADE_HOURS_MAP` dictionary hardcoded. Veritabanındaki `grade_requirements` tablosu kullanılmıyor.

**Öneri:** `grade_hours.py` servisinin `grade_requirements` tablosunu okuması için refactor. Böylece admin panelinden saat gereksinimleri güncellenebilir.

**Etki:** Derece/saat değişikliği için kod deploy gerekiyor; organizasyon kararlarını doğrudan yansıtmak mümkün değil.

---

### TD-3: Refresh Token Revocation Yok (Yüksek)

**Sorun:** Refresh token veritabanında saklanmıyor. Kullanıcı logout yaptığında token, süresi dolana kadar (7 gün) hâlâ geçerli.

**Öneri:** `refresh_tokens` tablosu veya Redis set'i; logout'ta token invalidation.

**Etki:** Güvenlik açığı — çalınan refresh token 7 gün boyunca kullanılabilir.

---

### TD-4: SECRET_KEY Güvenliği (Kritik)

**Sorun:** `.env.example` içinde `SECRET_KEY=CHANGE_ME_IN_PRODUCTION`. Bu değer üretimde kullanılırsa tüm JWT token'ları tehlikeye girer.

**Öneri:** Deploy sürecine SECRET_KEY validasyonu ekle (`len(SECRET_KEY) >= 32` zorunlu kıl).

**Etki:** Kritik güvenlik açığı.

---

### TD-5: Sıfır Test Coverage (Yüksek)

**Sorun:** Projede hiç test dosyası yok. Sınav uygunluk hesabı, derece güncellemesi gibi kritik iş mantığının davranışı garantilenemiyor.

**Öneri:** Önce `services/grade_hours.py` için birim testler, ardından kritik endpoint'ler için integration testler (pytest + httpx).

**Etki:** Her refactor veya eklenti sonrası regresyon riski.

---

### TD-6: Yetersiz Hata Yönetimi (Orta)

**Sorun:** Hata mesajları Türkçe ve İngilizce karışık (`"Etkinlik bulunamadı"` vs. `"School not found"`). Router düzeyinde tutarsız HTTP status kodları var.

**Öneri:** `app/exceptions.py` merkezi hata sözlüğü; tüm router'larda Türkçe veya İngilizce olarak standartlaştırma.

**Etki:** Frontend'de i18n zorlaşıyor; API tüketicileri için unpredictable davranış.

---

### TD-7: Auth Endpoint'lerinde Rate Limiting Yok (Orta)

**Sorun:** `POST /api/auth/login` ve `POST /api/auth/register` endpoint'lerinde brute-force koruması yok.

**Öneri:** `slowapi` veya nginx seviyesinde rate limit; ardışık hatalı giriş sayısı takibi.

**Etki:** Hesap ele geçirme ve spam kaydına açık.

---

### TD-8: Dosya Depolama Kalıcılığı (Orta)

**Sorun:** Yüklenen dosyalar (`uploads/`) ve avatarlar local disk'te. Container yeniden başladığında veya yatay ölçeklemede kaybolur.

**Öneri:** AWS S3, MinIO veya benzer object storage entegrasyonu. `UPLOAD_BACKEND` env değişkeniyle local/cloud geçişi.

**Etki:** Üretimde medya ve avatar kaybı riski.

---

### TD-9: `wteo.db` ve `nul` Dosyası Repo'da (Düşük)

**Sorun:** `backend/wteo.db` SQLite veritabanı dosyası ve kök dizinde `nul` adlı boş dosya (Windows `> nul` yönlendirmesinden oluşmuş) git'te izleniyor olabilir.

**Öneri:** `.gitignore`'a `*.db`, `nul`, `uploads/` ekle; mevcut takipli dosyaları `git rm --cached` ile kaldır.

**Etki:** Üretim verisi yanlışlıkla commit'lenebilir.

---

### TD-10: Eksik İndeksler (Düşük)

**Sorun:** `students.school_id`, `student_progress.student_id`, `attendance.lesson_id`, `event_registrations.event_id` gibi sık sorgulanan foreign key'lerde explicit index tanımı yok.

**Öneri:** SQLAlchemy model seviyesinde `index=True` veya Alembic migration ile index ekle.

**Etki:** Veri büyüdükçe liste sorgularında performans düşüşü.
