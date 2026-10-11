// DemirWteo sayfasindaki bolumler (disiplinler + Derecelendirme Sistemi, 2026-10-11). Metinler kullanicidan geldi
// (Demir Escrima ve Demir Wing Tsun: 2026-10-11). `paragraphs` bos olan
// disiplin sayfada gosterilmez.
// Panelde Site Icerigi'nde ayni slug ile bir kayit olusturulursa (or. slug
// "demir-escrima") baslik/metin/gorsel o kayittan gelir; metindeki her satir
// ayri paragraf olur.

export const DISCIPLINES = [
  {
    slug: 'demir-wing-tsun',
    title: 'Demir Wing Tsun',
    tagline: 'Silahsız savunma prensipleri üzerine kurulu eğitim sistemi',
    paragraphs: [
      'Demir Wing Tsun, silahsız savunma prensipleri üzerine kurulu; gerçekçi, doğal ve etkili bir eğitim sistemidir. Doğal reflekslerden yararlanan yapısı sayesinde her yaş ve seviyeden kadın ve erkek katılımcının öğrenebileceği, günlük hayatta uygulanabilir beceriler kazandırmayı hedefler.',
      'Eğitimlerde, karşılaşılabilecek riskli durumlarda kontrollü hareket etmek, mesafeyi doğru yönetmek, saldırganın hareket ve gücünü kendi aleyhine yönlendirmek ile güvenli biçimde uzaklaşmak esas alınır. İlk temas sonrasında gelişen yakın mesafe mücadelelerinde duyusal farkındalık ve doğru tepki verme becerileri geliştirilir.',
      'Demir Wing Tsun çalışmaları; tekme, yumruk, diz–dirsek–kafa, tutma–kontrol–atma ve yerde mücadele olmak üzere farklı mesafelerde savunma prensiplerini ele alır. Bıçak, sopa ve yakın mesafedeki ateşli silah tehditlerine karşı korunma, kontrol ve güvenli uzaklaşma çalışmaları da eğitimlerin kapsamında yer alır.',
      'Hedef, gereksiz şiddete başvurmadan; mümkün olan en kısa sürede, en az kuvvetle etkili kontrol sağlayabilmek ve riskli bir durumdan güvenli şekilde uzaklaşabilmektir. Bunun yanında eğitimler, fiziksel gelişimi ve yağ yakımını desteklerken; disiplin, özgüven, farkındalık ve güçlü bir aile ortamı da sunar.',
    ],
    // Metindeki calisma iceriklerinin kisa ozeti (metinden alinmistir).
    highlights: [
      'Tekme',
      'Yumruk',
      'Diz – dirsek – kafa',
      'Tutma – kontrol – atma',
      'Yerde mücadele',
      'Bıçak, sopa ve ateşli silah tehditlerine karşı korunma',
    ],
    closing:
      'Demir Wing Tsun, Sifu Serhat Demir’in eğitim mirası ve Sifu Saffet Demir’in rehberliği doğrultusunda İstanbul ve Tekirdağ’daki okullarda sürdürülmektedir.',
  },
  {
    slug: 'demir-escrima',
    title: 'Demir Escrima',
    tagline: 'Filipinler kökenli Escrima (Kali, Arnis) — silahlı savunma eğitimi',
    paragraphs: [
      'Demir Escrima, Filipinler kökenli Escrima (Kali, Arnis) sanatının pratiklik ve gerçekçilik esasları doğrultusunda yorumlandığı silahlı savunma eğitimidir. Demir Wing Tsun & Escrima Organizasyonu’nun kurucusu Sifu Serhat Demir ile Sifu Saffet Demir’in eğitim anlayışı ve tecrübeleri doğrultusunda İstanbul ve Tekirdağ’daki okullarda aktif olarak sürdürülmektedir.',
      'Eğitimlerde sakatlanma riskini en aza indirmek amacıyla temel eğitim silahı olarak ortalama 60 cm uzunluğunda rattan ağacından yapılan sopa kullanılır. Tek sopa, çift sopa, bıçak, boş el ve günlük eşyalarla yapılan çalışmalar; kişisel korunma, kontrol ve güvenli uzaklaşma prensipleri çerçevesinde ele alınır.',
      'Demir Escrima, kişiyi belirli kalıplara veya formlara bağlı bırakmadan; eline geçebilecek günlük nesneleri kontrollü, bilinçli ve etkili biçimde kullanabilmesine yönelik prensipleri öğretir. Amaç, karşılaşılan riskli durumlarda mümkün olan en az zararla kendimizi korumak ve ailemizin yanına sağ salim ulaşabilmektir.',
      'Escrima çalışmalarında ateşsiz silahlar, kullanım biçimleri ve etkileri bakımından ele alınır. Beysbol sopası, çeşitli sopalar ve metal çubuklar ezici-kırıcı araçlara örnekken; bıçak, kılıç, tornavida, şişe ve cam parçaları kesici-delici nesneler arasında değerlendirilebilir.',
      'Demir Escrima eğitimleri, kadın veya erkek fark etmeksizin herkesin seviyesine uygun programlarla sunulmaktadır.',
    ],
    // Metindeki calisma iceriklerinin kisa ozeti (metinden alinmistir).
    highlights: ['60 cm rattan sopa', 'Tek sopa', 'Çift sopa', 'Bıçak', 'Boş el', 'Günlük eşyalar'],
    closing:
      'Sifu Serhat Demir’in kurduğu organizasyon, Sifu Saffet Demir’in rehberliği ve eğitmenlerin katkılarıyla bu mirası yaşatmaya devam etmektedir. Sizleri Demir Wing Tsun & Escrima Organizasyonu’na bekliyoruz.',
  },
  {
    slug: 'derecelendirme-sistemi',
    eyebrow: 'Eğitim süreci',
    title: 'Derecelendirme Sistemi',
    tagline: 'Kuşak değil, derece sistemiyle ilerleme',
    // Metindeki sayisal bilgilerin ozeti (metinden alinmistir).
    facts: [
      { value: '12', label: 'öğrenci derecesi (Wing Tsun ve Escrima)' },
      { value: '5. Usta', label: 'organizasyondaki en üst derece' },
      { value: '4 ay', label: 'seminer ve derece sınavı periyodu' },
      { value: 'Dijital', label: 'paso yerine Öğrenci Yönetim Sistemi' },
    ],
    paragraphs: [
      'Demir Wing Tsun & Escrima Organizasyonu’nda ilerleme, kuşak sistemiyle değil, derece sistemiyle takip edilir. Wing Tsun ve Escrima eğitimlerinde 12 öğrenci derecesi bulunur. Öğrenci derecelerini tamamlayan ve eğitmenlik yolunda ilerleyen katılımcılar için ise eğitmen dereceleri yer alır. Organizasyondaki en üst seviye, 5. Usta Derece olarak kabul edilir.',
      'Her derece, öğrencinin teknik bilgisini, uygulama becerisini, disiplinini ve önceki programlara hâkimiyetini kapsar. Yeni başlayan bir öğrenciden kendi derece programını öğrenmesi beklenirken, derece yükseldikçe önceki programların da daha sağlam ve doğru uygulanması beklenir. Bu nedenle öğrencinin sorumluluğu, her seviyede kademeli olarak artar.',
      'Derece programlarının tamamlanma süresi; öğrencinin antrenman düzenine, çalışmaya ayırdığı zamana ve teknik gelişimine göre değişir. Düzenli yapılan grup antrenmanları ve bireysel çalışmalar gelişimi destekler; düzensiz katılım ise sürecin uzamasına neden olabilir.',
      'Derece eğitimleri, dört aylık periyotlarla düzenlenen seminerler kapsamında değerlendirilir. Öğrenciler bu seminerlerde kendi derecelerine ait eğitim programını çalışır ve derece sınavına katılır.',
      'Demir Wing Tsun & Escrima Organizasyonu’nda klasik paso uygulaması yerine, tüm takip işlemleri Öğrenci Yönetim Sistemi üzerinden gerçekleştirilir. Öğrenci; sistem üzerinden seminer ve etkinlik katılımını takip eder. Derece eğitimi ve sınav sürecini başarıyla tamamlayan öğrencinin katılımı, eğitmeni tarafından Öğrenci Yönetim Sistemi üzerinden onaylanır. Onayın ardından öğrencinin derecesi sistem üzerinde bir üst seviyeye güncellenir ve yeni derecesine ait eğitim programı otomatik olarak erişime açılır.',
    ],
    closing:
      'Bu sistem sayesinde her öğrencinin eğitim süreci, derece ilerlemesi, seminer katılımları ve program içeriği düzenli, şeffaf ve kişiye özel biçimde takip edilir.',
    actions: 'student',
  },
];
