import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Shield, ArrowRight, School, Users } from 'lucide-react';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import YouTubeEmbed from '../components/YouTubeEmbed';

export default function Anasayfa() {
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/content/anasayfa')
      .then((res) => setContent(res.data))
      .catch(() => setContent(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 py-20 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-600 mb-6">
          <Shield size={32} className="text-white" />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold mb-6">
          {content?.title || 'Wing Tsun & Escrima Organizasyonu'}
        </h1>
        <p className="text-dark-400 text-lg max-w-2xl mx-auto mb-10 whitespace-pre-line">
          {content?.body ||
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

      {content?.image_url && (
        <section className="max-w-4xl mx-auto px-6 pb-16">
          <img src={content.image_url} alt={content.title || ''} className="w-full rounded-xl border border-dark-800" />
        </section>
      )}

      {content?.youtube_url && (
        <section className="max-w-4xl mx-auto px-6 pb-16">
          <YouTubeEmbed url={content.youtube_url} title={content.title} />
        </section>
      )}

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
