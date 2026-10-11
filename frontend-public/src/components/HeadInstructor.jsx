import { Instagram } from 'lucide-react';
import SafeImage from './SafeImage';

// Bas Egitmen - Sifu Saffet Demir. Biyografi kullanicidan (2026-10-11).
// Sifu Saffet Demir panelde henuz kullanici degil; bu yuzden bilgiler burada
// sabit. Panelde bir egitmenin "Sitedeki Unvan"i "Baş Eğitmen" yapilirsa o
// kaydin fotografi / Instagram'i / (doluysa) biyografisi burada kullanilir ve
// ayni kisi asagidaki egitmen kartlarinda tekrar gosterilmez (bkz. Egitmenler.jsx).
export const HEAD_TITLE = 'Baş Eğitmen';

const DEFAULTS = {
  name: 'Sifu Saffet Demir',
  image: '/sifu-saffet-demir.jpg',
  paragraphs: [
    '1976 yılında İstanbul’da doğan Sifu Saffet Demir, dövüş sanatlarıyla çok genç yaşlarda tanıştı. Taekwondo ile başlayan disiplinli antrenman süreci, Full Contact ve Shaolin Kung Fu çalışmalarıyla devam etti. Wing Tsun’a duyduğu ilgi, 1991 yılında Sifu Mustafa Şahin ile tanışmasıyla bir yön buldu ve aynı yıl Bayrampaşa Wing Tsun Akademisi’nde Wing Tsun & Escrima eğitimlerine başladı.',
    'Kısa sürede gösterdiği teknik gelişim ve çalışma disiplini sayesinde, 1993 yılında Bayrampaşa Wing Tsun Akademisi’nin sorumlu eğitmeni olarak görevlendirildi. Wing Tsun’a adanmışlığı, Sigung Salih Avcı’nın Türkiye Şef Antrenörü olmasıyla birlikte daha da derinleşti; tüm seminerlere ve özel çalışmalara katılarak bilgi birikimini ve teknik ustalığını ileri seviyeye taşıdı.',
    '1998 yılında, Türkiye Wing Tsun tarihinde ilk 1. tekniker derecesini alan iki kişiden biri olarak önemli bir ilke imza attı. Ardından 3. tekniker derecesine ulaştı ve Sigung Avcı’nın Türkiye’nin çeşitli illerinde gerçekleştirdiği seminerlerde asistan eğitmen olarak görev aldı.',
    '1995 yılında “Türkiye’de En İyi Asistan” ödülüyle onurlandırılan Sifu Saffet Demir, 1996 yılında Üsküdar’da yeni bir grup oluşturarak çalışmalarını Anadolu yakasında sürdürmeye başladı. 1998’de Aytunç Bentürk ile tanışması, eğitim faaliyetlerinin Aytunç Bentürk Dance Academy çatısı altında daha geniş bir kitleye ulaşmasını sağladı.',
    '26 Aralık 2010 tarihinde Sifu unvanını alan Saffet Demir, bugün Hollanda’da eğitmenlik yapmakta olup, organizasyonun şef eğitmeni olarak çalışmalarına devam etmektedir.',
  ],
};

function toParagraphs(text) {
  return (text || '').split(/\n+/).map((p) => p.trim()).filter(Boolean);
}

export default function HeadInstructor({ instructor }) {
  const name = instructor ? `Sifu ${instructor.first_name} ${instructor.last_name}` : DEFAULTS.name;
  const image = instructor?.avatar_url || DEFAULTS.image;
  const custom = toParagraphs(instructor?.bio);
  const paragraphs = custom.length ? custom : DEFAULTS.paragraphs;
  // Panel avatarlari genelde kare/dikey; varsayilan fotograf yatay (genis serit)
  const wide = image === DEFAULTS.image;

  return (
    <section aria-labelledby="bas-egitmen-baslik" className="card p-0 overflow-hidden mb-16">
      <div className={wide ? '' : 'grid md:grid-cols-[minmax(0,320px)_1fr]'}>
        <div className={wide ? 'aspect-[960/364] bg-dark-950' : 'aspect-[4/5] md:aspect-auto md:min-h-[420px] bg-dark-950'}>
          <SafeImage src={image} fallback={null} alt={name} className="w-full h-full object-cover" />
        </div>
        <div className={`p-8 md:p-12 border-primary-600 ${wide ? 'border-t-4' : 'border-t-4 md:border-t-0 md:border-l-4'}`}>
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-primary-600 mb-3">{HEAD_TITLE}</p>
          <h2 id="bas-egitmen-baslik" className="text-3xl md:text-4xl font-bold mb-6">{name}</h2>
          <div className="space-y-4 text-dark-300 leading-relaxed max-w-prose">
            {paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
          {instructor?.instagram_url && (
            <a
              href={instructor.instagram_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-dark-400 hover:text-ink text-sm mt-6 transition-colors"
            >
              <Instagram size={16} /> Instagram
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
