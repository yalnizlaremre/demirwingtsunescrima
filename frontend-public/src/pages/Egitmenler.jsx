import { useState, useEffect } from 'react';
import { Users, Instagram, X } from 'lucide-react';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import SafeImage from '../components/SafeImage';
import HeadInstructor, { HEAD_TITLE } from '../components/HeadInstructor';
import usePageMeta from '../hooks/usePageMeta';

const TITLE_LABELS = { SIFU: 'Sifu', SIHING: 'Sihing' };

export default function Egitmenler() {
  const [instructors, setInstructors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    if (!selected) return;
    const onKey = (e) => e.key === 'Escape' && setSelected(null);
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [selected]);

  usePageMeta('Eğitmenlerimiz', 'Demir Wing Tsun Akademi deneyimli ve sertifikalı eğitmen kadrosuyla tanışın.');

  useEffect(() => {
    api.get('/instructors')
      // Sitedeki unvani olanlar (orn. Bas Egitmen) her zaman basta; kendi
      // aralarinda backend'in display_order sirasi korunur.
      .then((res) => {
        const items = res.data.items || [];
        setInstructors([...items.filter((i) => i.public_title), ...items.filter((i) => !i.public_title)]);
      })
      .catch(() => setInstructors([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  // Unvani "Bas Egitmen" olan kayit ayri bolumde gosterilir, kartlarda tekrarlanmaz.
  const isHead = (i) => (i.public_title || '').trim().toLocaleLowerCase('tr') === HEAD_TITLE.toLocaleLowerCase('tr');
  const head = instructors.find(isHead) || null;
  const others = instructors.filter((i) => !isHead(i));

  return (
    <div className="max-w-6xl mx-auto px-6 py-16">
      <div className="text-center mb-12">
        <h1 className="text-3xl md:text-4xl font-bold mb-4">Eğitmenlerimiz</h1>
        <p className="text-dark-400 max-w-2xl mx-auto">
          Deneyimli ve sertifikalı eğitmen kadromuzla tanışın.
        </p>
      </div>


      <HeadInstructor instructor={head} />

      {others.length === 0 ? (
        <div className="text-center text-dark-500 py-16">
          <Users className="mx-auto mb-4" size={40} />
          Henüz eğitmen eklenmemiş.
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {others.map((i) => (
            <div key={i.id} className={`card text-center ${i.public_title ? 'border-primary-600/40 ring-1 ring-primary-600/20' : ''}`}>
              <div className="w-24 h-24 rounded-full bg-dark-700 mx-auto mb-4 overflow-hidden flex items-center justify-center">
                <SafeImage
                  src={i.avatar_url}
                  alt={`${i.first_name} ${i.last_name}`}
                  className="w-full h-full object-cover"
                  fallback={
                    <span className="text-2xl font-bold text-dark-400">
                      {i.first_name?.[0]}{i.last_name?.[0]}
                    </span>
                  }
                />
              </div>
              {i.public_title && (
                <p className="text-[11px] font-semibold tracking-wider uppercase text-primary-600 mb-1">{i.public_title}</p>
              )}
              <h3 className="font-semibold">{i.first_name} {i.last_name}</h3>
              {i.instructor_title && (
                <p className="text-primary-500 text-sm mb-2">{TITLE_LABELS[i.instructor_title] || i.instructor_title}</p>
              )}
              {i.bio && (
                <>
                  <p className="text-dark-400 text-sm mb-2 line-clamp-3 text-left">{i.bio}</p>
                  <button
                    type="button"
                    onClick={() => setSelected(i)}
                    className="block mx-auto text-primary-600 hover:text-primary-700 text-sm font-medium mb-3"
                  >
                    Biyografiyi oku
                  </button>
                </>
              )}
              {i.instagram_url && (
                <a
                  href={i.instagram_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-dark-400 hover:text-ink text-sm transition-colors"
                >
                  <Instagram size={16} /> Instagram
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {selected && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-start justify-center p-4 overflow-y-auto"
          onClick={() => setSelected(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="egitmen-bio-baslik"
            className="card relative w-full max-w-2xl my-8 p-6 md:p-10"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="absolute top-4 right-4 text-dark-400 hover:text-ink"
              title="Kapat"
              aria-label="Kapat"
            >
              <X size={24} />
            </button>
            <div className="flex items-center gap-4 mb-6 pr-8">
              <div className="w-20 h-20 rounded-full bg-dark-700 overflow-hidden flex items-center justify-center shrink-0">
                <SafeImage
                  src={selected.avatar_url}
                  alt={`${selected.first_name} ${selected.last_name}`}
                  className="w-full h-full object-cover"
                  fallback={
                    <span className="text-xl font-bold text-dark-400">
                      {selected.first_name?.[0]}{selected.last_name?.[0]}
                    </span>
                  }
                />
              </div>
              <div>
                {selected.instructor_title && (
                  <p className="text-xs font-semibold tracking-[0.2em] uppercase text-primary-600 mb-1">
                    {TITLE_LABELS[selected.instructor_title] || selected.instructor_title}
                  </p>
                )}
                <h2 id="egitmen-bio-baslik" className="text-2xl font-bold">
                  {selected.first_name} {selected.last_name}
                </h2>
              </div>
            </div>
            <div className="space-y-3 text-dark-300 leading-relaxed">
              {selected.bio.split(/\n+/).map((line, idx) => line.trim() && <p key={idx}>{line}</p>)}
            </div>
            {selected.instagram_url && (
              <a
                href={selected.instagram_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-dark-400 hover:text-ink text-sm mt-6 transition-colors"
              >
                <Instagram size={16} /> Instagram
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
