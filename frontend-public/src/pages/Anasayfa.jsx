import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, School, Users } from 'lucide-react';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import YouTubeEmbed from '../components/YouTubeEmbed';

export default function Anasayfa() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/content/anasayfa')
      .then((res) => setItems(res.data.items))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  const [hero, ...extra] = items;

  return (
    <div>
      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 py-20 text-center">
        <img src="/logo.png" alt="Demir Wing Tsun Akademi" className="h-24 w-auto mx-auto mb-6" />
        <h1 className="text-4xl md:text-5xl font-bold mb-6">
          {hero?.title || 'Wing Tsun & Escrima Organizasyonu'}
        </h1>
        <p className="text-dark-400 text-lg max-w-2xl mx-auto mb-10 whitespace-pre-line">
          {hero?.body ||
            'Türkiye ve çevresindeki okullarımızı tek çatıda toplayan Wing Tsun ve Escrima organizasyonu.'}
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link to="/okullar" className="btn-primary text-base px-6 py-3">
            Okullarımızı Keşfet <ArrowRight size={18} />
          </Link>
          <Link to="/egitmenler" className="btn-secondary text-base px-6 py-3">
            Eğitmenlerimiz
          </Link>
        </div>
      </section>

      {hero?.image_url && (
        <section className="max-w-4xl mx-auto px-6 pb-16">
          <img src={hero.image_url} alt={hero.title || ''} className="w-full rounded-xl border border-dark-800" />
        </section>
      )}

      {hero?.youtube_url && (
        <section className="max-w-4xl mx-auto px-6 pb-16">
          <YouTubeEmbed url={hero.youtube_url} title={hero.title} />
        </section>
      )}

      {/* Ek icerik bloklari */}
      {extra.map((block) => (
        <section key={block.id} className="max-w-4xl mx-auto px-6 pb-16">
          {block.title && <h2 className="text-2xl font-bold mb-4">{block.title}</h2>}
          {block.body && <p className="text-dark-300 leading-relaxed whitespace-pre-line mb-6">{block.body}</p>}
          {block.image_url && (
            <img src={block.image_url} alt={block.title || ''} className="w-full rounded-xl border border-dark-800 mb-6" />
          )}
          {block.youtube_url && <YouTubeEmbed url={block.youtube_url} title={block.title} />}
        </section>
      ))}

      {/* Quick links */}
      <section className="max-w-6xl mx-auto px-6 py-16 border-t border-dark-800">
        <div className="grid md:grid-cols-2 gap-6">
          <Link to="/okullar" className="card hover:border-primary-600 transition-colors text-center">
            <School className="mx-auto mb-4 text-primary-500" size={32} />
            <h3 className="font-semibold text-lg mb-2">Okullarımız</h3>
            <p className="text-dark-400 text-sm">
              Birden fazla şehirde faaliyet gösteren okul ağımızı inceleyin.
            </p>
          </Link>
          <Link to="/egitmenler" className="card hover:border-primary-600 transition-colors text-center">
            <Users className="mx-auto mb-4 text-primary-500" size={32} />
            <h3 className="font-semibold text-lg mb-2">Eğitmenlerimiz</h3>
            <p className="text-dark-400 text-sm">
              Deneyimli eğitmen kadromuzla tanışın.
            </p>
          </Link>
        </div>
      </section>
    </div>
  );
}
