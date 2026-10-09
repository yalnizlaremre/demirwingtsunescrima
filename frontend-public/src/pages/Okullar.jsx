import { useState, useEffect } from 'react';
import { School, MapPin, Phone, X } from 'lucide-react';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import YouTubeEmbed from '../components/YouTubeEmbed';
import SafeImage from '../components/SafeImage';
import { telHref, formatPhone, mapsHref } from '../utils/contact';
import usePageMeta from '../hooks/usePageMeta';

export default function Okullar() {
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState(null);

  usePageMeta('Okullarımız', "Kadıköy ve Tekirdağ'daki Wing Tsun ve Escrima okullarımızı, ders saatlerini ve iletişim bilgilerini inceleyin.");

  useEffect(() => {
    api.get('/schools')
      .then((res) => setSchools(res.data))
      .catch(() => setSchools([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-6xl mx-auto px-6 py-16">
      <div className="text-center mb-12">
        <h1 className="text-3xl md:text-4xl font-bold mb-4">Okullarımız</h1>
        <p className="text-dark-400 max-w-2xl mx-auto">
          Farklı şehirlerdeki okullarımızda aynı standartta Wing Tsun ve Escrima eğitimi veriyoruz.
        </p>
      </div>

      {schools.length === 0 ? (
        <div className="text-center text-dark-500 py-16">
          <School className="mx-auto mb-4" size={40} />
          Henüz okul eklenmemiş.
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-8">
          {schools.map((s) => (
            <div key={s.id} className="card overflow-hidden">
              <div className="-mt-6 -mx-6 mb-6 h-48 overflow-hidden rounded-t-xl">
                <SafeImage
                  src={s.cover_image_url || s.media?.[0]?.file_url}
                  alt={s.name}
                  loading="lazy"
                  className="w-full h-full object-cover"
                  fallback={
                    <div className="w-full h-full bg-gradient-to-br from-dark-950 via-dark-900 to-dark-700 flex items-center justify-center">
                      <img src="/logo-light.png" alt="" className="h-16 w-auto opacity-40" />
                    </div>
                  }
                />
              </div>
              <h3 className="font-bold text-xl mb-2">{s.name}</h3>
              {s.address && (
                <a
                  href={mapsHref(s.address, s.name)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-dark-400 hover:text-ink text-sm flex items-start gap-2 mb-1 transition-colors"
                  title="Haritada aç"
                >
                  <MapPin size={14} className="mt-0.5 shrink-0" /> <span>{s.address}</span>
                </a>
              )}
              {s.phone && (
                <a
                  href={telHref(s.phone)}
                  className="text-dark-400 hover:text-ink text-sm flex items-center gap-2 mb-3 transition-colors"
                  title="Ara"
                >
                  <Phone size={14} className="shrink-0" /> {formatPhone(s.phone)}
                </a>
              )}
              {/* Ders saatleri / kisa aciklama tek kaynaktan (description) gelir; panelde de
                  ayni alan gosterilir. long_description sadece ek tanitim metnidir. */}
              {s.description && (
                <p className="text-dark-300 text-sm font-medium whitespace-pre-line">{s.description}</p>
              )}
              {s.long_description && s.long_description.trim() !== (s.description || '').trim() && (
                <p className="text-dark-400 text-sm whitespace-pre-line mt-3">{s.long_description}</p>
              )}
              {s.media && s.media.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mt-4">
                  {s.media.map((m) => (
                    <img
                      key={m.id}
                      src={m.file_url}
                      alt=""
                      onClick={() => setLightbox(m.file_url)}
                      className="w-full h-20 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                    />
                  ))}
                </div>
              )}
              {s.youtube_url && (
                <div className="mt-4">
                  <YouTubeEmbed url={s.youtube_url} title={s.name} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {lightbox && (
        <div
          className="theme-dark fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-6"
          onClick={() => setLightbox(null)}
        >
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-6 right-6 text-white hover:text-dark-300"
            title="Kapat"
          >
            <X size={32} />
          </button>
          <img src={lightbox} alt="" className="max-w-full max-h-full rounded-lg" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}
