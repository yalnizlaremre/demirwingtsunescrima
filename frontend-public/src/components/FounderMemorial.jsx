import { useEffect, useState } from 'react';
import api from '../services/api';
import SafeImage from './SafeImage';

// Kurucumuz Sifu Serhat Demir (1978 - 26 Ekim 2025) icin kalici anma bolumu.
// Varsayilan icerik burada sabit; panelde "Site Icerigi" altinda slug'i
// "kurucu" olan bir kayit olusturulursa baslik / metin / gorsel oradan gelir.
const DEFAULTS = {
  name: 'Sifu Serhat Demir',
  years: '1978 – 26 Ekim 2025',
  body: 'Sevgi ve Özlem İle',
  image: '/sifu-serhat-demir.jpg',
};

export default function FounderMemorial() {
  const [content, setContent] = useState(null);

  useEffect(() => {
    api.get('/content/kurucu')
      .then((res) => setContent(res.data.items?.[0] || null))
      .catch(() => setContent(null));
  }, []);

  const name = content?.title || DEFAULTS.name;
  const body = content?.body || DEFAULTS.body;
  const image = content?.image_url || DEFAULTS.image;

  return (
    <section aria-labelledby="kurucu-baslik" className="card p-0 overflow-hidden mb-16">
      <div className="grid md:grid-cols-[minmax(0,300px)_1fr]">
        <div className="aspect-[4/5] md:aspect-auto md:min-h-[380px] bg-dark-950">
          <SafeImage
            src={image}
            fallback={null}
            alt={name}
            className="w-full h-full object-cover object-[30%_20%]"
          />
        </div>
        <div className="p-8 md:p-12 flex flex-col justify-center border-t-4 md:border-t-0 md:border-l-4 border-primary-600">
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-primary-600 mb-3">Kurucumuz</p>
          <h2 id="kurucu-baslik" className="text-3xl md:text-4xl font-bold mb-2">{name}</h2>
          <p className="text-dark-500 mb-6">{DEFAULTS.years}</p>
          <div className="w-12 h-px bg-dark-600 mb-6" />
          <p className="text-dark-300 text-lg leading-relaxed whitespace-pre-line italic">{body}</p>
        </div>
      </div>
    </section>
  );
}
