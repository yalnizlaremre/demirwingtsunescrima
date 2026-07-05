import { useState, useEffect } from 'react';
import { School, MapPin, Phone } from 'lucide-react';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import YouTubeEmbed from '../components/YouTubeEmbed';

export default function Okullar() {
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);

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
              {s.cover_image_url && (
                <img
                  src={s.cover_image_url}
                  alt={s.name}
                  className="w-full h-48 object-cover rounded-lg -mt-6 -mx-6 mb-6"
                  style={{ width: 'calc(100% + 3rem)' }}
                />
              )}
              <h3 className="font-bold text-xl mb-2">{s.name}</h3>
              {s.address && (
                <p className="text-dark-400 text-sm flex items-center gap-2 mb-1">
                  <MapPin size={14} /> {s.address}
                </p>
              )}
              {s.phone && (
                <p className="text-dark-400 text-sm flex items-center gap-2 mb-3">
                  <Phone size={14} /> {s.phone}
                </p>
              )}
              <p className="text-dark-300 text-sm whitespace-pre-line">
                {s.long_description || s.description}
              </p>
              {s.youtube_url && (
                <div className="mt-4">
                  <YouTubeEmbed url={s.youtube_url} title={s.name} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
