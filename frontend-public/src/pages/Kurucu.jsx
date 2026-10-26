import { useState, useEffect } from 'react';
import api from '../services/api';
import SafeImage from '../components/SafeImage';
import YouTubeEmbed from '../components/YouTubeEmbed';
import usePageMeta from '../hooks/usePageMeta';

// Varsayilan icerik burada sabit; panelde "Site Icerigi" altinda slug'i
// "kurucu" olan kayitlar eklenirse ilki baslik / metin / gorsel, sonrakiler
// ek bolumler olarak gosterilir.
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

export default function Kurucu() {
  const [items, setItems] = useState([]);

  usePageMeta('Kurucumuz Sifu Serhat Demir', 'Demir Wing Tsun Akademi kurucusu Sifu Serhat Demir (1978 – 2025) anısına.');

  useEffect(() => {
    api.get('/content/kurucu')
      .then((res) => setItems(res.data.items || []))
      .catch(() => setItems([]));
  }, []);

  const [main, ...extra] = items;
  const name = main?.title || DEFAULTS.name;
  const image = main?.image_url || DEFAULTS.image;
  const customParagraphs = (main?.body || '').split(/\n+/).map((t) => t.trim()).filter(Boolean);
  const paragraphs = customParagraphs.length ? customParagraphs : DEFAULTS.paragraphs;
  const closing = customParagraphs.length ? null : DEFAULTS.closing;

  return (
    <div>
      <section className="max-w-6xl mx-auto px-6 pt-16 pb-12">
        <div className="grid md:grid-cols-[minmax(0,380px)_1fr] gap-10 md:gap-16 items-center">
          <div className="aspect-[4/5] rounded-xl overflow-hidden border border-dark-700 bg-dark-950">
            <SafeImage src={image} alt={name} className="w-full h-full object-cover object-[30%_20%]" />
          </div>
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] uppercase text-primary-600 mb-3">Kurucumuz</p>
            <h1 className="text-4xl md:text-5xl font-bold mb-3">{name}</h1>
            <p className="text-dark-500 text-lg">{DEFAULTS.years}</p>
          </div>
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-6 pb-16">
        <div className="space-y-5 text-dark-300 leading-relaxed text-lg">
          {paragraphs.map((t, i) => (
            <p key={i}>{t}</p>
          ))}
        </div>
        {closing && <p className="mt-10 text-xl italic text-ink">{closing}</p>}
        {main?.youtube_url && (
          <div className="mt-8">
            <YouTubeEmbed url={main.youtube_url} title={name} />
          </div>
        )}
        {extra.map((b) => (
          <div key={b.id} className="mt-12 pt-12 border-t border-dark-700">
            {b.title && <h2 className="text-2xl font-bold mb-4">{b.title}</h2>}
            {b.image_url && (
              <img src={b.image_url} alt={b.title || ''} className="w-full rounded-xl border border-dark-700 mb-6" />
            )}
            {b.body && <p className="text-dark-300 leading-relaxed text-lg whitespace-pre-line">{b.body}</p>}
            {b.youtube_url && (
              <div className="mt-6">
                <YouTubeEmbed url={b.youtube_url} title={b.title} />
              </div>
            )}
          </div>
        ))}
      </section>
    </div>
  );
}
