// DemirWteo sayfasindaki disiplin bolumleri. Metinler kullanicidan geldi
// (Demir Escrima: 2026-10-11). `paragraphs` bos olan disiplin sayfada
// gosterilmez (Demir Wing Tsun metni kullanici tarafindan hazirlaniyor).
// Panelde Site Icerigi'nde ayni slug ile bir kayit olusturulursa (or. slug
// "demir-escrima") baslik/metin/gorsel o kayittan gelir; metindeki her satir
// ayri paragraf olur.

export const DISCIPLINES = [
  {
    slug: 'demir-wing-tsun',
    title: 'Demir Wing Tsun',
    paragraphs: [],
    highlights: [],
    closing: null,
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
];
