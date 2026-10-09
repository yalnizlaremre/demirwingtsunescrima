import { useEffect, useState } from 'react';
import api from '../services/api';
import SafeImage from './SafeImage';

// Kurucumuz Sifu Serhat Demir (1978 - 26 Ekim 2025) icin kalici anma bolumu.
// Varsayilan icerik burada sabit (metin kullanicidan, 2026-10-09). Panelde
// "Site Icerigi" altinda slug'i "kurucu" olan bir kayit olusturulursa baslik /
// metin / gorsel oradan gelir (metindeki her satir ayri paragraf olur).
const DEFAULTS = {
  name: 'Sifu Serhat Demir',
  years: '1978 – 26 Ekim 2025',
  image: '/sifu-serhat-demir.jpg',
  paragraphs: [
    'Sifu Serhat Demir, 1978’de İstanbul’da doğdu. Dövüş sanatlarına olan ilgisi, ağabeyi Saffet Demir’in etkisiyle küçük yaşlarda başladı. Shotokan Karate, Shaolin Kung Fu ve Kickboks gibi çeşitli dallarda eğitim aldı. 1991’de Wing Tsun ile tanıştı ve 1994’te Mustafa Şahin ile Sifu Salih Avcı’nın liderliğindeki EWTO okullarında Wing Tsun eğitimine başladı.',
    '2005’te kendi grubunu kurarak Bakırköy’de Wing Tsun dersleri vermeye başladı; aynı zamanda Saffet Demir’in yanında asistanlık görevine devam etti. Grup çalışmaları farklı bölgelerde sürdü; İstanbul’da ve Tekirdağ’da öğrenciler yetiştirdi.',
    '2019 yılı Ekim ayı itibarıyla Demir Wing Tsun & Escrima Organizasyonu’nu kurdu. Wing Tsun ve Escrima disiplinlerindeki bilgi ve tecrübesini öğrencileriyle paylaşarak gelişimlerine katkı sağladı.',
    'Sifu Serhat Demir, Ekim 2025’te vefat etmiştir. Dövüş sanatlarına olan tutkusu, yetiştirdiği öğrenciler ve kurduğu Demir Wing Tsun & Escrima Organizasyonu aracılığıyla yaşamaya devam etmektedir.',
  ],
  closing: 'Kendisini saygı, sevgi ve özlemle anıyoruz.',
};

function toParagraphs(text) {
  return (text || '')
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
}

export default function FounderMemorial() {
  const [content, setContent] = useState(null);

  useEffect(() => {
    api.get('/content/kurucu')
      .then((res) => setContent(res.data.items?.[0] || null))
      .catch(() => setContent(null));
  }, []);

  const name = content?.title || DEFAULTS.name;
  const image = content?.image_url || DEFAULTS.image;
  const customParagraphs = toParagraphs(content?.body);
  const paragraphs = customParagraphs.length ? customParagraphs : DEFAULTS.paragraphs;
  const closing = customParagraphs.length ? null : DEFAULTS.closing;

  return (
    <section aria-labelledby="kurucu-baslik" className="card p-0 overflow-hidden mb-16">
      <div className="grid md:grid-cols-[minmax(0,320px)_1fr]">
        <div className="aspect-[4/5] md:aspect-auto md:min-h-[420px] bg-dark-950">
          <SafeImage
            src={image}
            fallback={null}
            alt={name}
            className="w-full h-full object-cover object-[30%_20%]"
          />
        </div>
        <div className="p-8 md:p-12 border-t-4 md:border-t-0 md:border-l-4 border-primary-600">
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-primary-600 mb-3">Kurucumuz</p>
          <h2 id="kurucu-baslik" className="text-3xl md:text-4xl font-bold mb-2">{name}</h2>
          <p className="text-dark-500 mb-6">{DEFAULTS.years}</p>
          <div className="w-12 h-px bg-dark-600 mb-6" />
          <div className="space-y-4 text-dark-300 leading-relaxed max-w-prose">
            {paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
          {closing && (
            <p className="mt-8 text-lg italic text-ink">{closing}</p>
          )}
        </div>
      </div>
    </section>
  );
}
