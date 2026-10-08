import { useState, useEffect } from 'react';
import { Users, Instagram } from 'lucide-react';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import SafeImage from '../components/SafeImage';
import FounderMemorial from '../components/FounderMemorial';
import usePageMeta from '../hooks/usePageMeta';

const TITLE_LABELS = { SIFU: 'Sifu', SIHING: 'Sihing' };

export default function Egitmenler() {
  const [instructors, setInstructors] = useState([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="max-w-6xl mx-auto px-6 py-16">
      <div className="text-center mb-12">
        <h1 className="text-3xl md:text-4xl font-bold mb-4">Eğitmenlerimiz</h1>
        <p className="text-dark-400 max-w-2xl mx-auto">
          Deneyimli ve sertifikalı eğitmen kadromuzla tanışın.
        </p>
      </div>

      <FounderMemorial />

      {instructors.length === 0 ? (
        <div className="text-center text-dark-500 py-16">
          <Users className="mx-auto mb-4" size={40} />
          Henüz eğitmen eklenmemiş.
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {instructors.map((i) => (
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
              {i.bio && <p className="text-dark-400 text-sm mb-3">{i.bio}</p>}
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
    </div>
  );
}
