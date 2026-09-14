# WTEO — Deployment Durumu / Kaldığımız Yer

> Bu dosya oturumlar arası devamlılık için tutuluyor. "Nerede kaldık" dendiğinde buradan bak.
> Son güncelleme: 2026-09-14 (ikinci tur) — **Tam sistem denetimi TAMAMLANDI: kritik IDOR + cascade-delete bug'ı bulunup düzeltildi, 3 eksik özellik (askıya alma, eğitmen atama geri alma, derece gereksinimi düzenleme) tamamlandı. Commit `120a294` push edildi, PROD'A HENÜZ DEPLOY EDİLMEDİ — kullanıcı onayı bekleniyor.** `origin/main` prod'dan 1 commit ileride.

## AÇIK IŞ (2026-09-14, ikinci tur): Tam sistem denetimi commit edildi, deploy bekliyor

Kullanıcı "full bir yapıyı analiz et, bana sormadan detaylı bir analiz çıkart, saçma bir şey varsa hemen düzelt" dedi. İki ayrı denetim ajanı çalıştırıldı (ilki anlamlı bir rapor üretemeden bitti, ikincisi 45 tool-call ile tüm router'ları tarayıp kapsamlı bulgu listesi çıkardı). Bulunan gerçek bug'lar doğrulanıp (önce bug'ı reprodükte et, sonra düzelt yöntemiyle) hemen düzeltildi:

**Kritik:**
1. `School.managers/students/lessons` (lazy="selectin") `passive_deletes="all"` eksikti — en az bir eğitmeni/öğrencisi/dersi olan (yani prod'daki hemen her okul) bir okul silinmeye çalışılınca 500 veriyordu. Aynı bug ailesi daha önce `User` ve `Lesson` için bulunup düzeltilmişti (bkz. 28 Temmuz, 13 Eylül notları), `School`'a hiç uygulanmamıştı.
2. `GET /students/{id}` hiçbir yetki kontrolü yapmıyordu — herhangi bir authenticated kullanıcı (MEMBER dahil) `student_id` tahmin ederek başka bir okulun öğrencisinin doğum tarihi/acil durum/notlarını okuyabiliyordu.

**Orta (kardeş uçlarda okul-kapsamı kontrolü var, bunlarda yoktu):**
3. `DELETE /attendance/{id}`, `GET /attendance/lesson/{id}`, `lesson_schedules` silme/uzatma uçları, `GET /events/{id}/registrations`, `GET /lessons/{id}` — hepsine eksik yetki/kapsam kontrolü eklendi.

**Eksik özellik tamamlandı (backend hazırdı, arayüz hiç yoktu — bu projede tekrarlayan bir desen):**
4. Öğrenci askıya alma/yeniden aktifleştirme → Students.jsx'e buton eklendi.
5. Okul-eğitmen atamasını geri alma + atanmış eğitmenleri görme → Schools.jsx modaline eklendi, yeni `GET /{school_id}/managers` ucu.
6. Derece gereksinimi düzenleme → Grades.jsx'e Düzenle butonu eklendi.

**Test:** 25 yeni backend testi (hepsi önce bug'ı/eksiği reprodükte edip sonra düzeltmeyi doğruluyor — School silme testinde düzeltme geçici olarak geri alınıp testin gerçekten IntegrityError'ı yakaladığı kanıtlandı), toplam **206/206 test geçiyor**. Chrome'da gerçek tarayıcıda uçtan uca doğrulandı (askıya alma/aktifleştirme API üzerinden — native `window.confirm` CDP otomasyonunu kilitlediği için; eğitmen atama/kaldırma ve derece gereksinimi düzenleme tarayıcıda tıklanarak).

**Tartışmaya değer, dokunulmadı (kullanıcıyla konuşulacak):**
- `GET /media` (admin panel) herhangi bir authenticated kullanıcıya (MEMBER dahil) tüm okulların özel medyasını gösteriyor — okul bazlı kısıtlama eklemek bir ürün kararı, henüz yapılmadı.
- İki paralel öğrenci başvuru sistemi var: `Student.apply/pending/approve` (backend'de duruyor ama hiçbir arayüzden çağrılmıyor) ile gerçek akış olan `Enrollment` sistemi. Ölü olan API üzerinden hâlâ erişilebilir, onay sürecini atlama riski taşıyor — kaldırılması mı yoksa öylece mi bırakılması gerektiği konuşulmalı.
- `GET /public/stats` ve birkaç tekil-GET ucu (`GET /users/{id}`, `GET /schools/{id}` admin, vb.) hiç kullanılmıyor — güvenlik riski yok, sadece kullanılmayan yüzey alanı.
- Test kapsamı yoktu (şimdi bazıları eklendi): `products.py`, `requests.py`, `mail.py`, `dashboard.py`, `enrollments.py`, `site_content.py` router'ları hâlâ hiç test edilmiyor.

**Deploy:** commit `120a294` → push edildi → **sunucuya henüz alınmadı, kullanıcı onayı bekleniyor** (üretim deploy izni her seferinde ayrı isteniyor).

---

## TAMAMLANDI (2026-09-14): Fiyat alanları tamamen kaldırıldı (vergi nedeniyle)

Kullanıcı vergi sorunu yaşamamak için sitede fiyat gösterilen/girilen her yerin **veritabanı dahil kalıcı olarak** kaldırılmasını istedi.

**Bulunan yerler:** Ürünler sayfasında `Product.price` (form + kart gösterimi), Etkinliklerde `Event.wt_fee`/`escrima_fee` (oluşturma/düzenleme formu + etkinlik kartı + öğrenci kayıt modalındaki "(X TL)" ek metni).

**Yapılan:** Model/schema/router'dan alanlar tamamen çıkarıldı, migration `a1b2c3d4e5f7` ile `products.price`, `events.wt_fee`, `events.escrima_fee` kolonları veritabanından silindi (downgrade'i var ama veri geri gelmez, sadece kolonu boş olarak geri ekler). Deploy öncesi prod'da gerçek veri olup olmadığı kontrol edildi: **"Tekirdağ Derece Semineri" etkinliğinde WT/Escrima ücreti 3500 TL olarak girilmişti** — kullanıcıya bildirildi, "tamamen kaldır" kararını (vergi gerekçesiyle) teyit etti, bu veri kalıcı olarak silindi. Ürünlerde henüz veri yoktu.

**Test:** 181/181 backend testi geçiyor, iki frontend de hatasız build oluyor, Chrome'da gerçek tarayıcıda hem Ürünler hem Etkinlik formunda fiyat alanının tamamen kalktığı doğrulandı.

**Deploy:** commit `2c0a61d` → push → sunucuda `git pull` + `docker compose up -d --build`, migration `a1b2c3d4e5f7` loglarda hatasız uygulandı, `docker compose ps` tüm container `Up`, `/api/health`, `app.demirwingtsun.com`, `demirwingtsun.com` hepsi 200 döndü.

---

## TAMAMLANDI (2026-09-13, üçüncü tur): Etkinlikler — okul kapsamı + kayıtlılar/sınav onay ekranı

Kullanıcı Etkinlikler sayfasıyla ilgili üç şey sordu: (1) öğrenci etkinliği görebiliyor mu, (2) Wing Tsun'a mı Escrima'ya mı kaydolduğunu nasıl anlayacağız, (3) seminer sonrası derece artışı otomatik mi yoksa admin onayı mı gerekiyor — ayrıca kendisi de "hangi okullarda olduğunu seçmeliyim" notunu ekledi.

**Bulgular:** (1) öğrenci zaten görebiliyordu. (2) `register_wt`/`register_escrima` backend'de kayıtlıydı ama hiçbir ekranda gösterilmiyordu. (3) kullanıcıya soruldu, **mevcut haliyle (anında, ek onaysız) bırakılması** istendi — dokunulmadı. (4) `Event.scope`/`selected_school_ids` alanı DB'de ve API'de vardı ama hem hiçbir yerde **gerçekten uygulanmıyordu** (herhangi bir öğrenci herhangi bir etkinliğe kaydolabiliyordu) hem de oluşturma formunda hiç gösterilmiyordu.

**Yapılan:**
- `events.py`: `list_events` artık USER rolündeki öğrenciyi kendi okuluna gore filtreliyor (`ALL_SCHOOLS` + kendi okulunun secili oldugu etkinlikler), `register_for_event` `SELECTED_SCHOOLS` bir etkinlikte öğrencinin okulu listede değilse 403 dönüyor.
- `Events.jsx` (admin): oluşturma/düzenleme formuna "Kapsam" (Tüm Okullar/Seçili Okullar) + okul checkbox listesi eklendi.
- `Events.jsx`: her etkinlik için yeni **"Kayıtlılar"** modalı — kim WT/Escrima'ya kayıtlı, sınava girecek mi, onay bekliyor mu görünüyor.
- Aynı taramada bulunan bağımsız bir bug: `POST .../approve-exam` ucu vardı ama hiçbir arayüzden çağrılmıyordu — "eğitmen onayı gerekiyor" durumuna düşen bir öğrenci sınava asla giremiyordu. Kayıtlılar modalına "Onayla" butonu eklendi.
- 6 yeni backend testi (okul kapsamı filtreleme + kayıt reddi), toplam **181/181 test geçiyor**.

**Test:** Chrome'da uçtan uca doğrulandı: local'de 2 geçici okul + 2 öğrenci ile bir "Seçili Okullar" etkinliği oluşturuldu → A okulundaki öğrenci etkinliği görüp kaydoldu (API ile doğrulandı) → B okulundaki öğrenci ne listede gördü ne kayıt olabildi (403) → admin panelde "Kayıtlılar" modalında "Wing Tsun" rozeti doğru göründü. Sonra tüm test verisi silindi.

**Deploy:** commit `57afacf` → push → sunucuda `git pull` + `docker compose up -d --build` (migration gerekmedi), `docker compose ps` tüm container `Up`, `/api/health`, `app.demirwingtsun.com`, `demirwingtsun.com` hepsi 200 döndü.

---

## TAMAMLANDI (2026-09-13, ikinci tur): Tanıtım sitesi incelemesi + sidebar örtüşme bug'ı

Kullanıcı `/okullar` ve anasayfayı gezip bir rapor istedi. İnceleme sonucu bulunanlardan öncelikliler bu oturumda çözüldü:

**1. Video oynatma (Medya sayfası):** iPhone'dan yüklenen bir `.mov` (HEVC/QuickTime) dosyası Chrome'da hiç oynamıyordu (player sonsuz buffering'de kalıyordu, network'te dosya isteği bile başlamıyordu). `media.py`'ye ffmpeg ile otomatik H.264/AAC mp4 dönüşümü eklendi (ffmpeg yoksa orijinal dosya korunuyor, upload kırılmıyor), `Dockerfile`'a ffmpeg kuruldu. Kullanıcı mevcut bozuk videoyu silmeyi tercih etti (kendisi sonra yeniden yükleyecek) — DB kaydı + `/app/uploads` dosyası prod'da silindi.

**2. SEO/sosyal paylaşım meta etiketleri:** `frontend-public/index.html`'e statik `og:title/description/image`, `twitter:card` + zengin `<title>`/`meta description` eklendi; her sayfaya (`usePageMeta` hook'u) kendi başlığını basan bir mekanizma eklendi. Canlıda `curl` ile doğrulandı.

**3. Okul açıklama alanı tutarsızlığı:** Kadıköy Okulu ders saatleri bilgisini yalnızca `long_description`'da tutuyordu, `description` (panel içi Okullar listesinde gösterilen alan) boştu — öğrenciler/üyeler uygulama içinde bu bilgiyi hiç göremiyordu. Migration (`f1a2b3c4d5e6`) ile `description` boş olan okullarda `long_description` içeriği kopyalandı. Prod'da migration loglarda doğrulandı, API'de Kadıköy'ün `description` alanı artık dolu.

**4. Sidebar bug'ı (yönetim paneli):** Kullanıcı "sol menüde Site İçeriği, kullanıcı/çıkış bloğuyla üst üste geliyor" dedi. Kök neden: `Layout.jsx`'teki nav `max-h-[calc(100vh-180px)]` sabit bir piksel bütçesiyle sınırlıydı — bu değer, alttaki kullanıcı/çıkış bloğuna sonradan eklenen "Tanıtım sitesine dön" linkinden (bkz. `marketing_app_navigation_review_2026_07_25`) ÖNCE ayarlanmıştı, blok büyüdükçe üst üste binme oluştu. `aside` artık `flex flex-col`; nav `flex-1 overflow-y-auto`, alt blok normal akışta `shrink-0` — sihirli sayı tamamen kaldırıldı, gelecekte alt bloğa içerik eklense bile overlap oluşamaz (flexbox otomatik yer açıyor/nav'ı kendi içinde kaydırıyor). Yerel ortamda geçici bir SUPER_ADMIN hesabıyla gerçek tarayıcıda doğrulandı (tüm nav öğeleri + Site İçeriği + kullanıcı/çıkış bloğu net ayrık görünüyor), sonra hesap silindi.

**Not — bu oturumda kod dışı bulunan, kullanıcının "sonra yapalım"/"ben hazırlarım" dediği açık işler (bkz. memory: `marketing_site_image_bugs_2026_09_13`, `marketing_content_review_2026_09_13`):**
- Tekirdağ Okulu'nun kapak görseli hâlâ yerel bir Windows dosya yolu (`C:\Users\...`) olarak kayıtlı — panelden yeniden yüklenmesi gerekiyor.
- Anasayfadaki "Tekirdağ Okulu" içerik bloğunun görseli sunucudan silinmiş (404) — panelden yeniden yüklenmesi gerekiyor.
- Kadıköy Okulu'nun `/okullar` kartında hâlâ kapak fotoğrafı yok.
- DemirWteo sayfası içeriği ("Bu içerik henüz eklenmedi.") ve eğitmen bio'ları — kullanıcı kendisi hazırlayacak.
- İletişim sayfasındaki "Kadıköy Shaka Dans Okulu" başlığı **bug değil** — kullanıcının ders saatlerinde kiraladığı gerçek salonun adı, olduğu gibi kalabilir.

**Test:** Backend 175/175 test geçti (3 yeni video-transcode testi eklendi, ffmpeg mock'landı). Her iki frontend build hatasız.

**Deploy:** commit `f8eccd7` (video/SEO/migration) + `0cf32a0` (sidebar) → push → sunucuda `git pull` + `docker compose up -d --build` (iki ayrı deploy, ikisi de kullanıcı onayıyla), migration `f1a2b3c4d5e6` loglarda hatasız uygulandı, `docker compose ps` tüm container `Up`/`healthy`, `/api/health`, `app.demirwingtsun.com`, `demirwingtsun.com` hepsi 200 döndü.

---

## TAMAMLANDI (2026-09-13): Dersler + Yoklama sistemi incelemesi

Kullanıcı "Dersler kısmında düzenleme yapılamıyor, yoklama sistemi etkili değil, incele ve düzelt" dedi. İnceleme birden fazla gerçek bug ortaya çıkardı, hepsi test edilip düzeltildi:

**1. Ders düzenleme/silme UI'da hiç yoktu:** Backend'de `LessonUpdate` şeması ve `DELETE /lessons/{id}` (yoklama saatlerini doğru geri alan) zaten vardı ama `PUT /lessons/{id}` route'u hiç tanımlanmamıştı (import edilen şema hiç kullanılmıyordu) ve `Lessons.jsx`'te ne düzenle ne sil butonu vardı. `PUT /lessons/{id}` eklendi (yoklama alınmışsa branş/tür GERÇEKTEN değişmeye çalışılırsa 400 döner, aynı değerin tekrar gönderilmesi engellenmez), `Lessons.jsx`'e düzenle+sil butonları eklendi (aynı modal create/edit arasında paylaşılıyor, `Events.jsx`'teki desenle aynı). Ayrıca `delete_lesson`'da eksik olan MANAGER'ın sadece kendi okulundaki dersi silebilmesi kontrolü eklendi (create/update'te vardı, delete'te unutulmuştu - bir MANAGER başka okulun dersini silebiliyordu).

**2. Yoklama sistemi tek yönlüydü, düzenlenemiyordu:** `openAttendance` her açılışta seçili listeyi sıfırlıyordu - kimin zaten yoklamaya alındığını hiç göstermiyordu, yanlışlıkla işaretlenen biri asla kaldırılamıyordu (backend'de `GET /attendance/lesson/{id}` ve `DELETE /attendance/{id}` zaten vardı ama hiç kullanılmıyordu). Modal artık açılışta mevcut yoklamayı çekip ilgili öğrencileri işaretli+"Kayıtlı" rozetli gösteriyor; kaydet'e basınca yeni işaretlenenler için `POST`, işareti kaldırılanlar için `DELETE` çağrılıyor (saatler doğru ekleniyor/geri alınıyor).

**3. Yoklama özelliği aslında HİÇ ÇALIŞMIYORDU:** `openAttendance` öğrenci listesini `/students/?school_id=...&limit=200` ile çekiyordu ama backend'in üst siniri 100 - bu istek HER ZAMAN 422 ile patlıyordu, hata sessizce yutuluyordu (`catch {}`), kullanıcıya "Bu okulda öğrenci yok" gibi yanıltıcı bir boş liste görünüyordu. `limit=100` yapıldı (bu proje daha önce Grades.jsx'te de aynı bug'ı yaşamıştı, bkz. 2026-07-21 notu) + artık hata sessizce yutulmuyor, toast ile gösteriliyor.

**4. KRİTİK (canlıda aktif) bug - öğrenci/yönetici kullanıcı silme 500 veriyordu:** 28 Temmuz'daki `passive_deletes=True` düzeltmesi yetersizmiş. `User.student_profile`/`managed_schools` `lazy="selectin"` olduğundan HER kullanıcı sorgusunda önceden yükleniyor; SQLAlchemy zaten yüklü bir koleksiyon için `passive_deletes=True` (bool) olsa bile FK'yi NULL'a çekmeyi deniyor (yalnızca string `"all"` değeri bunu tamamen kapatıyor - SQLAlchemy dokümantasyonunda ayrıca belirtiliyor). Sonuç: `Kullanıcılar` sayfasından öğrenci profili olan ya da bir okulu yöneten bir kullanıcı silinmeye çalışıldığında `IntegrityError` ile 500 veriyordu. `Lesson.attendances` ilişkisinde AYNI bug'ı (ders silme de aynı şekilde 500 veriyordu) bulup ikisini de `passive_deletes="all"` ile düzelttim.

**Test:** 4 yeni backend testi (lesson update/permission, 2'si de tam bu iki kritik cascade bug'ını hedefliyor), toplam **172/172 test geçiyor**. Gerçek tarayıcıda uçtan uca doğrulandı: local'de geçici okul/öğrenci/ders ile - ders oluşturuldu (saat doğru), düzenlendi (not güncellendi, doğrulandı), yoklama işaretlendi (öğrenci saati 10→12 arttı), tekrar açılıp işaret kaldırıldı (saat 12→10 geri alındı, "Kayıtlı" rozeti doğru göründü) - hepsi API üzerinden çapraz doğrulandı. Öğrenci profili olan bir kullanıcı `DELETE /users/{id}` ile başarıyla silindi (öncesinde 500 verirdi). Test verileri temizlendi.

**Ayrıca (küçük, aynı taramada bulundu):** `Events.jsx`'teki saat kayması düzeltmesi (`parseServerDatetime`/`toDatetimeLocalInput`) `frontend/src/utils/datetime.js`'e taşınıp Lessons.jsx ile paylaşıldı (ders listesindeki tarih gösterimi de aynı bug'a sahipti, düzeltildi).

---

## Önceki oturum (2026-09-12, ikinci tur): Etkinlik oluşturma/düzenlemede saat kayması bug'ı

Kullanıcı "etkinlik oluşturma ve düzenlemede değişiklikler yansımıyor" dedi. İnceleme + gerçek tarayıcı testiyle kök neden bulundu: **backend'in sakladığı naive-UTC datetime değerleri, frontend'de yanlış saat dilimiyle yorumlanıyordu.**

Detay: `NaiveDatetime` alanları (bkz. [[deployment_status]]'taki eski "tz-aware/naive" bug fix'i) backend'de kasıtlı olarak UTC'yi tzinfo'suz saklıyor (`"2026-10-01T15:00:00"`, "Z" veya offset yok). `Events.jsx`'teki `toDatetimeLocal()` ve liste görünümü bu string'i doğrudan `new Date(iso)`'ya veriyordu — JavaScript, saat dilimi belirtilmeyen ISO string'leri **yerel saat** sanip yorumluyor (ECMA-262'nin bilinen bir tuzağı). Sonuç: admin bir etkinliği 18:00 (Türkiye saati) için oluşturuyor → backend doğru şekilde 15:00 UTC olarak saklıyor → ama listede/düzenleme formunda "15:00" gösteriliyordu, admin sanki girdiği saat kaybolmuş/yanlış kaydedilmiş gibi görüyordu. Node ile (`TZ=Europe/Istanbul`) hem yazma hem okuma yönü ayrı ayrı doğrulanarak kök neden kesinleştirildi.

**Düzeltme (`Events.jsx`):** `parseServerDatetime()` helper'ı eklendi — backend'den gelen tarih string'inde saat dilimi işareti yoksa sona `"Z"` ekleyip doğru şekilde UTC olarak parse ediyor, ardından yerel getter'lar (`getHours()` vb.) doğru yerel saati veriyor. Hem `toDatetimeLocal` (düzenleme formunu doldururken) hem de etkinlik kartındaki tarih/saat gösterimi bu helper'ı kullanacak şekilde güncellendi. Yazma yönü (`new Date(form.start_datetime).toISOString()`) zaten doğruydu, dokunulmadı.

**Ayrıca (backend, küçük tutarsızlık):** `PUT /events/{id}` yanıtı `registration_count` ve `selected_school_ids` alanlarını hiç döndürmüyordu (şema varsayılanlarına - 0 ve [] - düşüyordu). Diğer event uçlarıyla tutarlı olacak şekilde eklendi; kullanıcı arayüzünü etkilemiyordu (frontend PUT sonrası zaten listeyi yeniden çekiyor) ama API tutarlılığı için düzeltildi.

**Test:** 2 yeni backend testi (`test_update_response_includes_registration_count_and_schools`, `test_update_start_datetime_roundtrips_without_timezone_shift`), toplam **161/161 test geçiyor**. Gerçek tarayıcıda uçtan uca doğrulandı: local'de geçici admin ile 18:00 için bir etkinlik oluşturuldu → listede "18:00" doğru göründü (düzeltmeden önce "15:00" gösterirdi) → düzenle modalı açıldığında "18:00" doğru geldi → saat 20:30/22:00'a değiştirilip güncellendi → liste "20:30" olarak doğru güncellendi. Test verisi (etkinlik + geçici admin) API üzerinden temizlendi.

**Deploy:** commit `27b6b86` → push → sunucuda `git pull` + `docker compose up -d --build` (migration gerekmedi), `docker compose ps` tüm container `Up`, `/api/health` 200, canlıda Etkinlikler sayfası kontrol edildi.

---

## TAMAMLANDI (2026-09-12): Bot kaydı tespiti + register güvenliği + bekleyen üye reddetme

Kullanıcı canlıda "Bekleyen Üyeler" listesine 5 şüpheli kayıt fark etti, incelenmesi istendi. İnceleme sonucu hepsinin bot kaydı olduğu doğrulandı: ad/soyad rastgele karışık harf dizileri, telefon alanına da rastgele karakterler girilmiş, e-postalar Gmail'in noktaları yok saymasını kullanan klasik bir bot tekniğiyle (`p.u.v.o.d.oba.h.40.4@gmail.com` gibi) oluşturulmuş.

**Kök neden — güvenlik açığı olarak değerlendirildi:** `/auth/register` ucunda hiçbir bot koruması (CAPTCHA, honeypot, zamanlama kontrolü) yoktu, sadece `5/dakika` rate limit vardı. Bu rate limit de aslında etkisizdi: backend Caddy reverse proxy arkasında (`docker-compose.yml`'de sadece `expose`, `ports` yok) ve `slowapi`'nin `get_remote_address`'i `request.client.host`'u okuyordu — bu da her zaman Caddy'nin container IP'siydi, gerçek ziyaretçi IP'si değil. Yani rate limit pratikte tüm siteyi tek bir paylaşılan kotaya sokuyordu (saldırganı IP'sine göre ayırt etmiyordu), bir bot dakikada bir istekle sınırsız kayıt açabiliyordu.

**Yapılan (backend):**
- `app/rate_limit.py`: `get_real_client_ip()` — Caddy'nin eklediği `X-Forwarded-For` başlığındaki SON değeri (güvenilir tek hop) okuyor, ilk değeri değil (istemci tarafından sahtelenebilir). Artık `5/dakika` gerçekten IP başına uygulanıyor.
- `RegisterRequest`'e iki alan eklendi: `website` (honeypot — gerçek kullanıcı hiç görmez/doldurmaz, doluysa 400) ve `form_rendered_at` (formun render edildiği an, epoch ms — sunucuya ulaşana kadar 2 saniyeden az geçtiyse 400, botlar genelde formu render edip beklemeden hemen gönderir). İkisi de opsiyonel, eski API istemcileri (testler dahil) kırılmadı.
- 2 yeni backend testi (`test_register_honeypot_filled_rejected`, `test_register_submitted_too_fast_rejected`), toplam **159/159 test geçiyor**.

**Yapılan (frontend):**
- `Register.jsx`: görünmez (`position:absolute; left:-9999px`, `aria-hidden`, `tabIndex=-1`) bir "website" honeypot alanı + sayfa render anını (`Date.now()`) `form_rendered_at` olarak gönderen state eklendi.
- `PendingUsers.jsx`: kullanıcının fark ettiği eksik giderildi — "Onayla" butonunun yanına "Reddet" butonu eklendi, mevcut `DELETE /api/users/{id}` ucunu kullanıyor (yeni bir backend ucu gerekmedi, `Users.jsx`'teki silme deseniyle aynı `confirm()` + toast).

**Test:** Backend testleri (honeypot + zamanlama + mevcut regresyon) yeşil. Lokal'de tarayıcıdan gerçek bir kayıt formu doldurulup birkaç saniye beklenip gönderildi — normal kullanıcı akışı bozulmadığı doğrulandı ("Kayıt başarılı" toast'ı alındı). Honeypot dolu bir istek doğrudan API'ye gönderildiğinde 400 döndüğü doğrulandı. Frontend build hatasız.

**Deploy:** commit `e0f9384` → push → sunucuda `git pull` + `docker compose up -d --build` (migration gerekmedi, sadece iki opsiyonel alan, DB şeması değişmedi), `docker compose ps` tüm container `Up`, `/api/health`, `app.demirwingtsun.com`, `demirwingtsun.com` hepsi 200 döndü. Canlıdaki 5 bot kaydı, yeni "Reddet" butonuyla admin panelden (Chrome'da gerçek admin oturumuyla) tek tek silindi — "Bekleyen Üyeler" listesi artık boş. Kalan iş yok.

---

## TAMAMLANDI (2026-07-30): Brevo SMTP kurulumu

Brevo hesabı açıldı, `demirwingtsun.com` domain doğrulandı (GoDaddy DNS'e 7 kayıt eklendi: branded subdomain `mail` CNAME, `brevo-code` TXT, 2x DKIM CNAME, DMARC TXT, img/redirect CNAME'ler — hepsi doğrulandı). Sender oluşturuldu: `noreply@demirwingtsun.com` / "Demir Wing Tsun Akademi". SMTP key üretildi (Standard, no expiration).

Prod `/opt/wteo/.env` güncellendi (eski değerler `.env.bak.<timestamp>` olarak yedeklendi):
```
MAIL_ENABLED=true
MAIL_HOST=smtp-relay.brevo.com
MAIL_PORT=587
MAIL_USER=emreyalnizlar@gmail.com   # Brevo login maili olarak varsayıldı, DOĞRULANMADI
MAIL_FROM=noreply@demirwingtsun.com
MAIL_FROM_NAME=Demir Wing Tsun Akademi
# MAIL_PASSWORD = üretilen SMTP key (xsmtpsib-... ile başlıyor)
```
`docker compose up -d --force-recreate backend` ile devreye alındı, `/api/health` 200 döndü.

**Test sonucu — BAŞARISIZ:** `POST /auth/forgot-password` (`emreyalnizlar@gmail.com` ile) tetiklendi, backend logunda: `Mail gönderilemedi -> emreyalnizlar@gmail.com: (535, '5.7.8 Authentication failed')`.

**Şüphelenilen sebep:** `MAIL_USER` olarak kullanıcının Brevo'ya kayıt olurken kullandığı e-posta (`emreyalnizlar@gmail.com`) varsayıldı, ama bu doğrulanmadı — Brevo'nun SMTP & API sayfasında SMTP key'in yanında/üstünde gösterilen gerçek **"Login"** değeri farklı olabilir (özellikle Google ile giriş yapıldıysa). Kullanıcıdan bu ekrandaki tam Login string'ini kopyalayıp gelmesi istendi, oturum burada "3 saat sonra devam" diyerek durduruldu.

**Nasıl çözüldü:** İlk 535 hatasının sebebi, `MAIL_USER`'ın Brevo hesap login maili (`emreyalnizlar@gmail.com`) olduğu varsayımıydı — Brevo'nun kendi ürettiği ayrı bir SMTP login'i var (`b3b9c2001@smtp-brevo.com`, hesap mailinden tamamen farklı bir format). Bunu düzeltip container'ı yeniden başlatınca mail gönderimi çalıştı.

İkinci sorun (mail geldi ama linke tıklayınca sayfa açılmadı): `FRONTEND_URL` prod `.env`'de hiç tanımlı değildi, kod varsayılanı (`http://localhost:5173`) kullanıyordu — reset linki telefonda haliyle açılmadı. `.env`'e `FRONTEND_URL=https://app.demirwingtsun.com` eklenip (repo'daki `.env.production.example`'a da eklendi, gelecekte unutulmasın diye) container yeniden başlatıldı.

**Test:** Kullanıcı kendi hesabına (`emreyalnizlar@gmail.com`) gerçek şifre sıfırlama maili aldı, prod linkiyle telefondan açıp şifresini gerçekten değiştirdi — tamamen uçtan uca doğrulandı, kalan iş yok.

**Not:** Toplu duyuru maili (`/mail/send`) kod olarak zaten hazırdı ([[deployment_status]]'ta daha önce not edilmişti), SMTP artık canlı olduğu için o da otomatik olarak çalışır hale geldi — ayrıca test edilmedi ama aynı `mail.py` servisini kullanıyor.

## Bu oturumda yapılanlar (2026-07-28, ikinci tur): Mail/Etkinlik/Derece durumu incelendi, 3 faza bölündü

Kullanıcı üç şey sordu: mail gönderme (tekil+toplu) durumu, etkinlik oluşturma/silme/düzenleme durumu, ve öğrencilerin Escrima derecesinin neden görünmediği. Üçü de incelenip fazlara bölündü, Faz 2 ve 3 bu oturumda tamamlandı, Faz 1 kullanıcıdan SMTP bilgisi bekliyor.

**Faz 1 — Mail (bekliyor):** Kod tarafı tamamen doğru (`/mail/send` zaten okul/branş/derece filtreli toplu gönderim yapıyor, `EmailLog`'a kaydediyor). Sorun `MAIL_ENABLED=false` + placeholder SMTP bilgileri (prod `.env`'de doğrulandı) — [[user_student_deletion_and_password_reset_2026_07_28]]'de de not edilen aynı açık konu. Kullanıcı gerçek bir SMTP hesabı (Gmail uygulama şifresi öneriliyor) sağladığında adım adım kurulacak.

**Faz 2 — Etkinlik düzenleme/silme (TAMAMLANDI):** Backend'de `PUT`/`DELETE /events/{id}` zaten vardı ve doğru çalışıyordu, ama `Events.jsx` hiçbir düzenle/sil butonu hiç eklememişti — sadece oluşturma vardı. Users.jsx/Students.jsx ile aynı desende düzenle (kalem) + sil (çöp kutusu) butonları eklendi, aynı modal create/edit arasında paylaşılıyor. Bu sırada gerçek bir bug bulundu: `EventResponse.end_datetime` şemada zorunluydu ama modelde nullable — `end_datetime`'ı olmayan bir etkinlik döndürülmeye çalışıldığında 500 verirdi (pratikte hiç tetiklenmemişti çünkü frontend her zaman bir fallback gönderiyordu, ama API'ye doğrudan istek veya farklı bir client için gerçek bir risk). Düzeltildi + `EventUpdate`'e `event_type` eklendi (düzenlerken tür de değiştirilebilsin diye). 5 yeni backend testi eklendi.

**Faz 3 — Escrima derecesi görünmüyor (TAMAMLANDI):** Kök neden — mevcut kod (öğrenci atama, kendi başvurusu+onay, okul kayıt talebi onayı, üçü de) artık doğru şekilde hem WT hem Escrima progress kaydı oluşturuyor, ama `enrollments.py`'deki eski `# Create StudentProgress records for both branches (BUG FIX)` yorumu, geçmişte bir akışın sadece WT için yapıldığını ve düzeltmenin geriye dönük uygulanmadığını gösteriyordu. Tek seferlik, idempotent bir migration (`e5f6a7b8c9d0`) ile her öğrenci için eksik olan branş progress kaydı (derece 1, 0/54 saat) tamamlandı. Local'de sahte bir "sadece WT'si olan" öğrenciyle test edildi: migration çalıştı → ESCRIMA doğru değerlerle eklendi → tekrar çalıştırıldığında (idempotency testi) duplicate oluşmadı → temizlendi.

**Test:** 162/162 backend testi geçiyor (5 yeni event update/delete testi). Chrome'da uçtan uca doğrulandı: geçici admin hesabıyla etkinlik oluşturuldu → düzenle butonuyla ad değiştirildi, "Etkinlik güncellendi" toast'ı ve listede güncel ad görüldü → silme API üzerinden (native `window.confirm` UI tıklamasını tekrar tetiklememek için, backend zaten pytest ile kapsamlı test edilmişti) temizlendi.

**Not (Faz 2 sırasında öğrenilen genel ders):** `Events.jsx`'teki gibi "backend'de var ama frontend hiç bağlamamış" tarzı eksikler bu projede birden fazla kez çıktı (bkz. [[user_student_deletion_and_password_reset_2026_07_28]]'deki `/auth/change-password`). Yeni bir "X çalışmıyor/eksik" şikayeti geldiğinde önce ilgili backend router'ı (`grep "@router\."`) tarayıp hangi uçların zaten var olduğunu, frontend'in bunlardan hangilerini gerçekten kullandığını karşılaştırmak hızlı ve güvenilir bir ilk adım.

**Deploy:** commit `e93c904` → push → sunucuda `git pull` + `docker compose up -d --build`, migration `e5f6a7b8c9d0` loglarda hatasız uygulandı, `docker compose ps` tüm container `Up`/`healthy`, `/api/health`, `app.demirwingtsun.com`, `demirwingtsun.com` hepsi 200 döndü.

---


## Bu oturumda yapılanlar (2026-07-28): Kullanıcı/öğrenci silme düzeltmesi + şifremi unuttum & şifre değiştirme

Kullanıcı üç şey istedi: (1) daha önce not edilen açık konuların ([[user_to_student_assignment_2026_07_21]]'deki `DELETE /users/{id}` 500 bug'ı) çözülmesi, (2) admin/super admin'in kullanıcı **ve** öğrenci silebilmesi, (3) şifremi unuttum + giriş yaptıktan sonra şifre değiştirme akışı.

**Kök neden (beklenenden farklı çıktı):** `DELETE /api/users/{id}` FK constraint eksikliğinden değil, SQLAlchemy ORM'un `User.student_profile`/`managed_schools` ilişkilerini (`lazy="selectin"`, `passive_deletes` yok) varsayılan davranışla yönetmesinden 500 veriyordu — kullanıcı silinirken ORM önce bağlı `Student`/`SchoolManager` kaydının FK'sini Python tarafında `NULL`'a çekmeye çalışıyordu, ama `students.user_id` `NOT NULL` olduğundan `IntegrityError` patlıyordu. `passive_deletes=True` eklenerek bu tamamen DB'nin kendi `ON DELETE CASCADE`'ine bırakıldı (`backend/app/models/user.py`).

**Ayrıca:** `events.created_by`, `lessons.created_by`, `lesson_schedules.created_by`, `media.uploaded_by`, `audit_logs.performed_by`, `email_logs.sent_by`, `seminar_evaluations.evaluated_by`, `grade_change_requests.requested_by/handled_by`, `requests.handled_by`, `enrollments.handled_by` gibi "kim yaptı" kolonlarına migration (`d4e5f6a7b8c9`) ile `ON DELETE SET NULL` eklendi — bir kullanıcı silinince oluşturduğu kayıtlar (etkinlik, ders, medya vb.) kalır, sadece "kim yaptı" alanı boşalır. İlgili response şemaları (`created_by`, `sent_by`, `requested_by` vb.) `str | None` yapıldı, `str(x) if x else None` deseniyle düzeltildi.

**Yeni:** `DELETE /api/users/{id}`'e kendi hesabını silme engeli eklendi. `DELETE /api/students/{id}` hiç yoktu, eklendi — kullanıcı kararıyla öğrenci silindiğinde **login hesabı da tamamen siliniyor** (geri dönüşü yok), `Student.user_id → users.id ON DELETE CASCADE` sayesinde tüm bağlı kayıtlar (progress/attendance/event_registrations/requests/grade_change_requests) otomatik gidiyor. `Students.jsx`'e silme butonu eklendi (admin/`manage_users` izni olan MANAGER görüyor).

**Şifremi unuttum + şifre değiştirme:** `POST /auth/forgot-password` + `POST /auth/reset-password` eklendi — stateless JWT reset token (30 dk geçerli, `pwh` alanı şifre hash'inin fingerprint'i olduğundan şifre bir kere değiştirilince eski link otomatik geçersiz kalıyor, ayrı bir DB kaydı gerekmedi). Mevcut ama hiçbir sayfaya bağlı olmayan `/auth/change-password` ucu ilk kez kullanılır hale geldi. Frontend: Login'e "Şifremi unuttum?" linki, yeni `ForgotPassword.jsx`/`ResetPassword.jsx` sayfaları, Profil sayfasına tüm roller (MEMBER dahil) için "Şifre Değiştir" kartı.

**Test:** 152/152 backend testi geçiyor (10 yeni: `test_user_deletion.py` silme/cascade senaryoları, `test_auth.py`'ye change/forgot/reset-password testleri). Chrome'da uçtan uca doğrulandı: local'de geçici admin hesabıyla giriş → Profil'den şifre değiştirme (eski şifreyle giriş engellendi, yeniyle çalıştı) → Kullanıcılar sayfasında silme butonu ve onay diyaloğu doğru tetikleniyor (native `window.confirm` CDP otomasyonunu kilitlediği için tıklama kullanıcı tarafından elle onaylandı, backend tarafı zaten pytest ile kapsamlı test edilmişti) → sahte reset token ile `/reset-password` sayfasından şifre değiştirme çalıştı. Sonra tüm geçici test verisi silindi, local dev sunucular durduruldu.

**Deploy:** commit `4a57899` → push → sunucuda `git pull` + `docker compose up -d --build`, migration `d4e5f6a7b8c9` loglarda hatasız uygulandı, `docker compose ps` tüm container `Up`/`healthy`, `/api/health`, `app.demirwingtsun.com`, `demirwingtsun.com` hepsi 200 döndü.

**Kalan iş / not edilmesi gerekenler:**
- **SMTP hâlâ kurulu değil** (`MAIL_ENABLED=false` prod'da) — şifremi unuttum akışı kod olarak tam çalışıyor ama gerçek e-posta gönderilmiyor, sadece backend loglarına düşüyor. Kullanıcı gerçekten şifresini sıfırlamak isterse şu an için backend loglarından linki almak gerekir. Gerçek SMTP hesabı (ör. Gmail uygulama şifresi) girilip `.env`'de `MAIL_ENABLED=true` + `MAIL_USER`/`MAIL_PASSWORD` doldurulmalı.
- Video yükleme/oynatma hâlâ gerçek bir video dosyasıyla uçtan uca test edilmedi ([[media_public_sharing_2026_07_24]]'te not edilmişti).
- İletişim sayfası hâlâ yalın (form/harita/Instagram linki yok) — daha önce not edilmiş, kullanıcı isterse ayrı bir iş.

---

## Bu oturumda yapılanlar (2026-07-25, beşinci tur): Anasayfa içerik blokları alt alta, tutarlı

Kullanıcı dördüncü turdaki değişiklikten sonra "Kadıköy Okulu görünmüyor, Tekirdağ gözüküyor" dedi. Kök neden: ilk Site İçeriği bloğu (Kadıköy Okulu) hâlâ özel "hero" muamelesi görüyordu — sadece küçük bir başlık şeridi olarak gösteriliyordu, kendi görseli hiç render edilmiyordu (hero arkaplanı artık Medya slaytı tarafından domine ediliyordu). İkinci blok (Tekirdağ Okulu) ise tam blok (başlık+görsel) olarak görünüyordu — asimetri buradan kaynaklanıyordu.

**Düzeltme:** `Anasayfa.jsx`'te ilk blok artık sadece hero arkaplan medyası (video varsa) seçimi için kullanılıyor, metin/görsel içeriği artık **tüm** bloklarla (`items.map`, eskiden `extra.map`) birlikte aynı şekilde alt alta render ediliyor. Hero'nun kendi metni (başlık+tagline) artık tamamen sabit, hiçbir Site İçeriği bloğundan alınmıyor — böylece hiçbir içerik metni iki yerde tekrar etmiyor.

**Deploy:** commit `85d6d38` → push → `git pull` + `docker compose up -d --build`, canlıda JS ile doğrulandı: "Kadıköy Okulu" ve "Tekirdağ Okulu" ikisi de h2 başlık + kendi görseliyle, alt alta görünüyor.

---

## Önceki oturum (2026-07-25, dördüncü tur): Hero başlığı aşağı alındı, istatistik şeridi kaldırıldı

Kullanıcı üçüncü turdaki tasarımda iki şey istedi: (1) hero görselinin/slaytının üzerindeki "Kadıköy Okulu" başlığı görselin üstünde durmasın, aşağıda konumlansın, (2) istatistik şeridi (okul/öğrenci/eğitmen sayısı) kaldırılsın. `Anasayfa.jsx`'te `hero?.title` artık hero overlay'inden çıkarılıp hero'nun hemen altında ayrı, sade bir şeritte gösteriliyor (istatistiklerin durduğu yerin yerini aldı); istatistik state/fetch/bölümü tamamen kaldırıldı (backend'deki `/api/public/stats` ucu dokunulmadan kaldı, başka bir yerde kullanılabilir). Sadece frontend-public değişti.

**Deploy:** commit `fa38531` → push → `git pull` + `docker compose up -d --build`, canlıda `document.querySelector('main').innerText` ile doğrulandı — "Kadıköy Okulu" artık hero'nun altında, istatistik yok.

---

## Önceki oturum (2026-07-25, üçüncü tur): Hero'da Medya slayt gösterisi

Kullanıcı ikinci turdaki hero'nun tek sabit görsel yerine Medya sayfasındaki "genel" işaretli fotoğrafların 7-8 saniyede bir dönmesini istedi. `Anasayfa.jsx`'e `is_public` görsellerin (`GET /public/media?media_type=IMAGE`) 7.5 saniyede bir crossfade (`opacity` geçişi, `transition-opacity duration-1000`) ile döndüğü bir slayt gösterisi eklendi — öncelik sırası: video hero (varsa) > Medya slaytı (genel foto varsa) > tekil SiteContent görseli > gradient fallback. Backend değişikliği yok, sadece frontend-public.

**Deploy:** commit `bca178d` → push → sunucuda `git pull` + `docker compose up -d --build`, prod'daki gerçek 3 genel fotoğrafla (`/api/public/media`) DOM üzerinden JS ile doğrulandı (ilk görsel `opacity:1`, diğerleri `opacity:0`, sırayla dönecek şekilde kuruldu). Otomasyon sekmesi bu ortamda arka planda sayıldığından (`document.visibilityState: "hidden"`) Chrome'un timer throttling'i yüzünden geçişi canlı izleyemedim — kod standart bir `setInterval` deseni, kullanıcının kendi (görünür) tarayıcısında düzgün çalışması bekleniyor, doğrulanmadı.

---

## Önceki oturum (2026-07-25, ikinci tur): Anasayfa yeniden tasarımı

Kullanıcı referans olarak `ertanbalaban.com`'u gösterdi, anasayfanın "kullanışlı" hale gelmesini istedi (özellikle video arkaplan fikri). İncelenen referans sitenin yapısı: tam ekran hero (görsel/video), büyük isim+tagline+tek CTA, kart tarzı bölümler, zengin footer — bunlardan uygun olanlar uygulandı, `ertanbalaban.com`'un biraz "buggy" hissettiren scroll-jack/snap-back etkileşimi kasıtlı olarak kopyalanmadı.

**Yapılan:**
- Backend: yeni auth'suz `GET /api/public/stats` (aktif okul/öğrenci/öne-çıkan-eğitmen sayısı, aggregate, PII yok).
- `Anasayfa.jsx` tamamen yeniden yazıldı: hero artık tam ekran (`min-h-[85vh]`), arkaplanda `SiteContent.anasayfa`'nın ilk bloğundaki `image_url` — dosya uzantısına göre (`.mp4/.webm/.mov`) otomatik `<video autoPlay muted loop playsInline>` ya da `<img>` olarak render ediliyor, içerik hiç yoksa gradient fallback. **Başlık artık her zaman sabit "Demir Wing Tsun Akademi"** — admin'in girdiği başlık (varsa, ör. "Kadıköy Okulu") artık H1 değil, altında küçük bir tagline satırı; böylece hem dünkü "ilk izlenim kafa karıştırıcı" bulgusu koda bağlı olmadan çözüldü hem de hiç içerik girilmemiş olması sorun olmuyor. İstatistik şeridi eklendi. Hızlı bağlantı kartları 2'den 4'e çıktı (Okullar/Eğitmenler/DemirWteo/Medya).
- `Footer.jsx`: tek satır telif yerine logo + tüm sayfalara nav linkleri.
- `SiteContent.jsx` (admin): "Görsel" yükleme alanı artık video da kabul ediyor (`accept="image/*,video/*"`), önizleme video ise `<video>` ile gösteriliyor; kısa bir ipucu metni eklendi ("anasayfa hero'sunda video dosyası otomatik oynatılır").
- 1 yeni backend testi, toplam **133/133 test geçiyor**. Her iki frontend hatasız build oluyor.

**Test:** Local'de gerçek prod olmayan verilerle (2 okul, 0 öğrenci) ve sahte bir video URL'siyle (mp4 uzantılı harici test dosyası, DOM'da doğrudan JS ile `<video>` elementinin doğru `src`'i aldığı doğrulandı) uçtan uca kontrol edildi, sonra temizlendi. Bu oturumda Chrome ekran görüntüsü aracı (CDP screenshot) birkaç kez zaman aşımına uğradı — sayfa içeriği `get_page_text`/JS ile doğrulandı, görsel kontrol sınırlı kaldı, kullanıcının kendi tarayıcısından bakması istendi.

**Deploy:** commit `6d37976` → push → sunucuda `git pull` + `docker compose up -d --build` (migration gerekmedi), `docker compose ps` tüm container `Up`, canlıda `/api/public/stats` gerçek veriyle doğrulandı (`{"schools":2,"students":22,"instructors":3}`), anasayfa içeriği `get_page_text` ile kontrol edildi — yeni başlık, istatistik şeridi ve 4 kart hepsi doğru görünüyor.

**Ortam notu:** Bu oturumda local backend dev sunucusu tekrar "hayalet süreç" davranışı gösterdi (yeni `/api/public/stats` route'u loglarda "Reloading..." dese de 404 dönmeye devam etti) — [[manager_permissions_and_school_gallery_2026_07_21]]'de belgelenen aynı sorun, PowerShell'de gerçek `python.exe` sürecini bulup kapatıp yeniden başlatmak çözdü.

---

## Önceki oturum (2026-07-25, ilk tur): Tanıtım sitesi ↔ panel geçiş incelemesi + eksik geri dönüş linkleri

Kullanıcı demirwingtsun.com'a giriş, öğrenci yönetimi paneline geçiş ve geri dönüş akışının incelenmesini istedi. Bulunan 3 sorun:

1. **(Düzeltildi)** `app.demirwingtsun.com`'daki karşılama ekranında ("Panele Devam Et" öncesi) "Tanıtım sitesine dön" linki vardı, ama gerçek Giriş Yap / Kayıt Ol formlarına (`Login.jsx`, `Register.jsx`) geçilince bu link kayboluyordu — kullanıcı tanıtım sitesine dönmek için tarayıcı geri tuşuna mecbur kalıyordu. Aynı link giriş yaptıktan sonraki panelde (sidebar) de yoktu. Üçüne de (`Login.jsx`, `Register.jsx`, `Layout.jsx` sidebar alt kısmı) "← Tanıtım sitesine dön" linki eklendi.
2. **(Kod değil, içerik — kullanıcı kendi düzenleyecek)** Anasayfa'nın ilk ve en büyük başlığı "Kadıköy Okulu" — organizasyonu tanıtan bir giriş metni yok, direkt tek bir okulun adı görünüyor, hemen altında "Tekirdağ Okulu" bloğu geliyor (Okullar sayfasıyla neredeyse birebir tekrar). Kod doğru çalışıyor (`Anasayfa.jsx` `content/anasayfa` slug'ının ilk kaydını hero olarak, gerisini ek blok olarak basıyor) — sorun Site İçeriği panelinden girilen içerikte. **Kullanıcı bunu kendisi Site İçeriği panelinden düzenleyecek.**
3. **(Not edildi, dokunulmadı)** İletişim sayfası çok yalın — sadece 2 kişi + telefon, e-posta/harita/form/Instagram linki yok (Eğitmenler sayfasında Instagram linkleri var ama İletişim'de kullanılmıyor).

**Deploy:** commit `3191801` → push → sunucuda `git pull` + `docker compose up -d --build` (migration gerekmedi, sadece frontend statik dosyaları değişti), `docker compose ps` tüm container `Up`, `/api/health` ve canlıda `/login` sayfasında link görüldü.

---

## Önceki oturum (2026-07-24): Medya genel/tanıtım paylaşımı + tanıtım sitesine Medya sekmesi

Kullanıcı iki şey istedi: (1) video/foto yükleme yetkisi olanların kim olduğunu öğrenmek, (2) medyaların hem web hem mobilden yüklenip bir sayfada oynatılabilmesi, (3) tanıtım sitesine (Anasayfa/Okullar/DemirWteo/Eğitmenler/İletişim'in yanına) bir **Medya** sekmesi eklenip yüklenenlerin orada da görünmesi.

**Yetki durumu (prod'da bu oturum başında sorgulandı):** `ADMIN`/`SUPER_ADMIN` her zaman yükleyebiliyor (`batucet@hotmail.com`, `emreyalnizlar@outlook.com`); `MANAGER` rolünde sadece `can_upload_media=true` tik'i açık olanlar yükleyebiliyor (`gunder86.gnmk@gmail.com`, `emreyalnizlar@gmail.com` — bu ikinci hesap kullanıcının kendi gmail'i, MANAGER rolünde, outlook'taki SUPER_ADMIN hesabından ayrı).

İki tasarım kararı kullanıcıyla netleştirildi: video limiti 10MB→100MB'a çıkarıldı (Caddy'de ek body-size limiti yok, sorun çıkarmadı) **ve** YouTube linki seçeneği de korundu; tanıtım sitesindeki Medya sekmesi sistemdeki tüm medyayı değil, sadece admin'in tek tek "genel/tanıtım" işaretlediği medyayı gösteriyor (okul içi/hassas fotoğraflar otomatik sızmasın diye).

**Yapılan:**
- Backend: `Media.is_public` alanı (migration `c1a2b3d4e5f6`), upload/youtube uçlarına `is_public` parametresi, yeni `PATCH /media/{id}` (yükleme yetkisi olan herkes kendi/erişebildiği medyada genel/özel toggle'ı yapabiliyor), yeni auth'suz `GET /api/public/media` (sadece `is_public=true`).
- `MAX_UPLOAD_SIZE` 10MB → 100MB.
- Admin panel (`frontend/src/pages/Media.jsx`): yükleme sırasında "Tanıtım sitesinde göster" checkbox'ı, mevcut medyalarda toggle butonu (globe ikonu), **video oynatma düzeltildi** (önceden VIDEO tipi sadece statik ikon gösteriyordu, tıklayınca hiçbir şey olmuyordu — artık modal içinde gerçekten oynuyor).
- `frontend-public/src/pages/Medya.jsx` (yeni): foto/video/YouTube filtreli galeri, foto lightbox, video/YouTube modal oynatıcı. Nav'a Eğitmenler ile İletişim arasına eklendi.
- 9 yeni backend testi, toplam **132/132 test geçiyor**.
- Mobilden yükleme için ayrı bir iş gerekmedi — admin panelindeki mevcut dosya seçici (`accept="image/*,video/*"`) telefon tarayıcısında zaten native kamera/galeri seçiciyi açıyor.

**Test:** Chrome'da uçtan uca doğrulandı (local'de geçici admin hesabıyla: foto yükleme+genel işaretleme, YouTube ekleme, toggle aç/kapa, public sayfada filtreleme, lightbox, YouTube modal oynatma), sonra temizlendi. Gerçek bir video dosyası (mp4) elde olmadığından video yükleme/oynatma sadece kod incelemesiyle doğrulandı (foto/YouTube ile birebir aynı `<video controls>` deseni) — ilk gerçek video yüklemesinde bir kontrol iyi olur.

**Deploy:** commit `24b1d73` → push → sunucuda `git pull` + `docker compose up -d --build`, migration `c1a2b3d4e5f6` otomatik uygulandı (loglarda doğrulandı), `docker compose ps` tüm container `Up`, `/api/health` ve `https://demirwingtsun.com/api/public/media` (`[]` dönüyor, beklenen — prod'da henüz hiçbir medya genel işaretlenmedi) doğrulandı.

**Not:** Bu oturumda local dev sunucular (backend :8000, frontend :5173, frontend-public :5174) arka planda açık bırakıldı.

---

## Önceki oturum (2026-07-21, dördüncü tur): Eğitmenlere granular admin yetkisi + Okullar galerisi

Kullanıcı iki şey istedi: (1) Okullar sayfasında tek kapak görseli yerine çoklu görsel galerisi + dosya seçici, (2) admin panelinden belirli bir eğitmene (MANAGER) tik kutularıyla admin yetkilerinden istediklerini tek tek verebilme — kullanıcı yönetimi (riskli) dahil tüm kategorileri seçti, riskli olduğu kendisine söylendi.

Kapsam büyük olduğundan (7 router, ~27 admin-only endpoint, hem backend hem frontend) önce Plan mode ile detaylı bir plan çıkarıldı ve onaylandı, sonra uygulandı:

**Backend:**
- `User.extra_permissions` (JSON liste alanı, migration `f0888503e082`), `app/permissions.py` (6 yetki: manage_schools/site_content/events/products/grades/users), `auth.py`'de `require_admin_or_permission()` — gerçek ADMIN/SUPER_ADMIN her zaman geçer, MANAGER sadece ilgili izne sahipse geçer.
- `grades.py`, `products.py`, `events.py`, `schools.py`, `site_content.py`, `students.py`, `users.py` — tüm `require_admin_or_above` kullanımları ilgili `require_manage_*`'e çevrildi.
- **Güvenlik kuralları (users.py, zorunlu):** `manage_users` izinli bir MANAGER (a) kimseyi ADMIN/SUPER_ADMIN yapamaz, (b) mevcut rolü ADMIN/SUPER_ADMIN olan bir kullanıcıyı düzenleyemez/silemez, (c) `extra_permissions` alanını değiştiremez (izin verme yetkisi sadece gerçek admin'de).
- Okullar galerisi: yeni tablo gerekmedi, mevcut `Media` tablosu (`school_id` FK'si zaten vardı) galeri olarak kullanıldı. Yeni `app/services/school_gallery.py`, `SchoolResponse.media` alanı, `media.py`'de MANAGER'ın `manage_schools` izniyle de yükleme/silme yapabilmesi için izin kesişimi.
- 17 yeni backend testi (`test_permissions.py`, `test_auth.py` eki), toplam **128/128 test geçiyor**.

**Frontend:**
- `AuthContext.hasPermission()`, `ProtectedRoute`'a `permission` prop'u, `App.jsx`'te `/schools`/`/users`/`/site-content` route'larına permission eklendi, `Layout.jsx` nav görünürlüğü güncellendi.
- `Events.jsx`/`Products.jsx`/`Grades.jsx`'teki admin-only buton kontrolleri `isAdmin || hasPermission(...)` oldu.
- `Users.jsx`: MANAGER düzenlenirken (sadece gerçek admin görür) 6 checkbox'lık "Admin Yetkileri" paneli; ADMIN/SUPER_ADMIN rol seçenekleri ve o rollerdeki kullanıcıların düzenle/sil butonları artık sadece gerçek admin'e görünüyor.
- `Schools.jsx`: çoklu dosya seçici + thumbnail grid + silme (SiteContent.jsx'teki upload deseni referans alındı), `Okullar.jsx` (tanıtım sitesi) galeri/lightbox gösterimi.

**Bulunan ve düzeltilen gerçek bug:** `POST /media/upload` endpoint'i `school_id`'yi form alanı değil query parametresi olarak bekliyormuş (önceden hiçbir çağıran bunu kullanmadığı için fark edilmemiş bir mevcut kısıt) — `Schools.jsx`'teki galeri yükleme kodu buna göre düzeltildi, düzeltilmeseydi galeri özelliği sessizce çalışmayacaktı.

**Test:** API üzerinden uçtan uca doğrulandı (local'de geçici test kullanıcıları: bir eğitmene izin verilmeden 403, verildikten sonra 200; üç güvenlik kuralının her biri ayrı ayrı 403 verdi; galeriye yükleme→görüntüleme→silme akışı), sonra hepsi temizlendi. Chrome eklentisi bu oturumda bağlanamadı, tıklayarak/görsel test yapılamadı.

**Deploy:** commit `53868fc` → push → sunucuda `git pull` + `docker compose up -d --build`, migration `f0888503e082` otomatik uygulandı (canlı loglarda `users.extra_permissions` kolonu doğrulandı), `docker compose ps` tüm container `Up`, `/api/health`, `app.demirwingtsun.com`, `demirwingtsun.com` doğrulandı.

**Not:** Bu oturumda local dev sunucular (backend :8000, frontend :5173) arka planda açık bırakıldı; ayrıca backend dev sunucusu bu oturumda bir kez "hayalet süreç" sorunu yaşadı (eski kod çalışmaya devam ediyordu, restart görünüşte başarılı olsa da port'ta eski süreç kalmıştı) — PowerShell ile gerçek süreç tespit edilip temizlendi. Sonraki oturumda backend değişikliği sonrası dev sunucu davranışı garip görünürse (örn. yeni alan response'ta yok) süreci PowerShell'de (`Get-CimInstance Win32_Process -Filter "Name = 'python.exe'"`) kontrol et, Bash/netstat PID'leri güvenilmeyebilir.

---

## Önceki oturum (2026-07-21, üçüncü tur): İkinci turdaki özellik gerçekte çalışmıyordu — düzeltildi

Kullanıcı ikinci turda canlıya alınan "kullanıcıyı okula öğrenci olarak ata" özelliğini denedi ve hâlâ çalışmadığını bildirdi ("istekte bulunmasa da atayabileyim" — yani MEMBER rolündeki, hiç başvurmamış kullanıcılar için de).

**Kök neden:** Özellik, sadece Kullanıcılar sayfasındaki Rol dropdown'ında "Öğrenci" (USER) seçiliyken görünüyordu. Ama Rol dropdown'ında hiç `MEMBER` seçeneği yoktu (sadece USER/MANAGER/ADMIN/SUPER_ADMIN) — bu yüzden MEMBER rolündeki (henüz hiç okula başvurmamış) bir kullanıcıyı düzenlemeye açtığında dropdown boş/eşleşmez görünüyordu, admin bunu "Öğrenci"ye çevirmesi gerektiğini fark edemiyordu, dolayısıyla okul atama alanı hiç ortaya çıkmıyordu. Yani özellik backend'de doğru çalışıyordu (bir önceki turda API üzerinden doğrulanmıştı) ama **UI'da MEMBER kullanıcılar için pratikte erişilemezdi** — tam da kullanıcının şikayet ettiği senaryo.

**Düzeltme (`frontend/src/pages/Users.jsx`):**
- Okul atama alanı artık Rol dropdown'ındaki seçime değil, kullanıcının düzenleme anındaki gerçek rolüne (`editing.role`) bakıyor: MANAGER/ADMIN/SUPER_ADMIN dışındaki (MEMBER dahil) her kullanıcı için görünüyor, Rol dropdown'una hiç dokunmaya gerek kalmadan.
- Rol dropdown'una ve rozetine "Üye" (MEMBER) seçeneği eklendi — düzenleme ekranı artık MEMBER kullanıcının gerçek rolünü doğru gösteriyor (öncesinde eşleşen seçenek olmadığından görsel olarak bozuktu).
- Backend zaten (ikinci turdan) MEMBER→USER yükseltmesini `POST /students/` içinde otomatik yapıyor, bu tarafta değişiklik gerekmedi.
- API üzerinden yeniden uçtan uca doğrulandı: MEMBER rolündeki bir kullanıcı, Rol dropdown'una hiç dokunulmadan sadece okul seçilip "Güncelle"ye basılarak öğrenciye çevrildi ve okula atandı — sonra temizlendi.
- Commit `90c3c1c` → push → sunucuda `git pull` + `docker compose up -d --build`, `docker compose ps` tüm container `Up`, `/api/health` ve `app.demirwingtsun.com` doğrulandı.

**Ders:** Bir sonraki "özellik X çalışmıyor" şikayetinde önce UI'daki gösterim koşullarını (özellikle dropdown/select'lerin olası tüm değerleri kapsayıp kapsamadığını) kontrol et — backend doğru çalışsa bile UI bir durumu hiç göstermeyebilir.

---

## Önceki oturum (2026-07-21, ikinci tur): Kullanıcıyı doğrudan öğrenci yapıp okula atama

Kullanıcı, Kullanıcılar sayfasından öğrenci kaydı olmayan bir kullanıcıyı (örn. MEMBER rolündeki, henüz hiçbir okula başvurmamış biri) doğrudan öğrenci yapıp bir okula atayabilmek istedi. Önceden bunun bir yolu yoktu — sadece kullanıcının kendi başlattığı iki akış vardı (`/apply`, enrollment talebi), admin'in inisiyatifiyle başlayan bir yol yoktu.

**Yapılan:**
- Backend: yeni `POST /api/students/` endpoint'i (`backend/app/routers/students.py`, ADMIN/SUPER_ADMIN yetkili) — `user_id` + `school_id` alıp Student + her branş için StudentProgress kaydı oluşturuyor, hedef kullanıcı MEMBER ise USER'a yükseltiyor, PENDING ise ACTIVE yapıyor. Daha önce tanımlı ama hiç kullanılmayan `StudentCreate` şeması kullanıldı.
- Frontend (`frontend/src/pages/Users.jsx`): düzenleme modalında rol "Ogrenci" (USER) seçiliyken ve kullanıcının öğrenci kaydı yoksa, önceden sadece bilgilendirme metni ("okul atanamaz") vardı — yerine gerçek bir okul seçici + "Güncelle" butonuna basınca hem rolü güncelleyen hem yeni `POST /students/` çağrısını yapan bir akış geldi. Tek adımda tamamlanıyor, ayrı bir onay adımı yok (zaten admin bizzat yapıyor).
- 7 yeni backend testi (`test_students_create.py`), toplam **104/104 test geçiyor**.
- Chrome tarayıcı eklentisi bu oturumda bağlanamadı, UI'da tıklayarak test edilemedi — bunun yerine backend'de frontend'in yapacağı iki çağrıyı (rol güncelleme + öğrenci oluşturma) birebir API üzerinden simüle ederek uçtan uca doğrulandı (geçici test kullanıcısı: MEMBER → USER'a yükseldi → okula öğrenci olarak atandı → doğru göründü), sonra temizlendi. **Bir sonraki oturumda gerçek tarayıcıda da denenmeli.**
- Commit `d7597de` → push → sunucuda `git pull` + `docker compose up -d --build`, `docker compose ps` tüm container `Up`, `/api/health` ve `app.demirwingtsun.com` doğrulandı.

**Yan bulgu (bu işin kapsamı dışında, düzeltilmedi):** `DELETE /api/users/{id}`, öğrenci kaydı olan bir kullanıcıda 500 hatası veriyor — `Student.user_id` FK'inde cascade delete tanımlı değil (`backend/app/models/student.py`). Bu özellik öğrenci sayısını artıracağından bu bug'a çarpma ihtimali de arttı; ayrı bir iş olarak ele alınmalı.

## Önceki oturum (2026-07-21, ilk tur)

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
- [x] ~~Mail hâlâ kapalı (`MAIL_ENABLED=false`)~~ → Brevo SMTP kuruldu, 2026-07-30'da uçtan uca doğrulandı (bkz. yukarıdaki "TAMAMLANDI (2026-07-30)" bölümü)

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
