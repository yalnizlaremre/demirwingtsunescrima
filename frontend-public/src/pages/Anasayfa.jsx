import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, School, Users, GraduationCap, Image as ImageIcon } from 'lucide-react';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import YouTubeEmbed from '../components/YouTubeEmbed';

const ORG_NAME = 'Demir Wing Tsun Akademi';
const DEFAULT_TAGLINE =
  'Türkiye ve çevresindeki okullarımızı tek çatıda toplayan Wing Tsun ve Escrima organizasyonu.';

function isVideoUrl(url) {
  return !!url && /\.(mp4|webm|mov)$/i.test(url);
}

export default function Anasayfa() {
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/content/anasayfa').then((res) => setItems(res.data.items)).catch(() => setItems([])),
      api.get('/stats').then((res) => setStats(res.data)).catch(() => setStats(null)),
    ]).finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  const [hero, ...extra] = items;
  const heroIsVideo = isVideoUrl(hero?.image_url);
  const hasStats = stats && (stats.schools > 0 || stats.students > 0 || stats.instructors > 0);

  return (
    <div>
      {/* Hero */}
      <section className="relative min-h-[85vh] flex items-center overflow-hidden bg-dark-900">
        <div className="absolute inset-0 z-0">
          {heroIsVideo ? (
            <video
              src={hero.image_url}
              autoPlay
              muted
              loop
              playsInline
              className="w-full h-full object-cover"
            />
          ) : hero?.image_url ? (
            <img src={hero.image_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-dark-800 via-dark-900 to-black" />
          )}
        </div>
        <div className="absolute inset-0 z-0 bg-gradient-to-t from-dark-900 via-dark-900/70 to-dark-900/40" />

        <div className="relative z-10 max-w-6xl mx-auto px-6 py-24 text-center w-full">
          <img src="/logo.png" alt={ORG_NAME} className="h-16 w-auto mx-auto mb-6" />
          <h1 className="text-4xl md:text-6xl font-bold mb-4">{ORG_NAME}</h1>
          {hero?.title && <p className="text-primary-500 text-lg font-medium mb-4">{hero.title}</p>}
          <p className="text-dark-300 text-lg max-w-2xl mx-auto mb-10 whitespace-pre-line">
            {hero?.body || DEFAULT_TAGLINE}
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link to="/okullar" className="btn-primary text-base px-6 py-3">
              Okullarımızı Keşfet <ArrowRight size={18} />
            </Link>
            <Link to="/egitmenler" className="btn-secondary text-base px-6 py-3">
              Eğitmenlerimiz
            </Link>
          </div>
        </div>
      </section>

      {/* Istatistikler */}
      {hasStats && (
        <section className="border-b border-dark-800">
          <div className="max-w-4xl mx-auto px-6 py-10 grid grid-cols-3 gap-6 text-center">
            <div>
              <p className="text-3xl md:text-4xl font-bold text-primary-500">{stats.schools}</p>
              <p className="text-dark-400 text-sm mt-1">Okul</p>
            </div>
            <div>
              <p className="text-3xl md:text-4xl font-bold text-primary-500">{stats.students}</p>
              <p className="text-dark-400 text-sm mt-1">Öğrenci</p>
            </div>
            <div>
              <p className="text-3xl md:text-4xl font-bold text-primary-500">{stats.instructors}</p>
              <p className="text-dark-400 text-sm mt-1">Eğitmen</p>
            </div>
          </div>
        </section>
      )}

      {/* Hero'ya eklenmis YouTube tanitim videosu (varsa) */}
      {hero?.youtube_url && (
        <section className="max-w-4xl mx-auto px-6 py-16">
          <YouTubeEmbed url={hero.youtube_url} title={hero.title} />
        </section>
      )}

      {/* Ek icerik bloklari */}
      {extra.map((block) => (
        <section key={block.id} className="max-w-4xl mx-auto px-6 pb-16">
          {block.title && <h2 className="text-2xl font-bold mb-4">{block.title}</h2>}
          {block.body && <p className="text-dark-300 leading-relaxed whitespace-pre-line mb-6">{block.body}</p>}
          {block.image_url && (
            isVideoUrl(block.image_url) ? (
              <video src={block.image_url} controls className="w-full rounded-xl border border-dark-800 mb-6" />
            ) : (
              <img src={block.image_url} alt={block.title || ''} className="w-full rounded-xl border border-dark-800 mb-6" />
            )
          )}
          {block.youtube_url && <YouTubeEmbed url={block.youtube_url} title={block.title} />}
        </section>
      ))}

      {/* Quick links */}
      <section className="max-w-6xl mx-auto px-6 py-16 border-t border-dark-800">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <Link to="/okullar" className="card hover:border-primary-600 transition-colors text-center">
            <School className="mx-auto mb-4 text-primary-500" size={32} />
            <h3 className="font-semibold text-lg mb-2">Okullarımız</h3>
            <p className="text-dark-400 text-sm">Birden fazla şehirde faaliyet gösteren okul ağımızı inceleyin.</p>
          </Link>
          <Link to="/egitmenler" className="card hover:border-primary-600 transition-colors text-center">
            <Users className="mx-auto mb-4 text-primary-500" size={32} />
            <h3 className="font-semibold text-lg mb-2">Eğitmenlerimiz</h3>
            <p className="text-dark-400 text-sm">Deneyimli eğitmen kadromuzla tanışın.</p>
          </Link>
          <Link to="/demirwteo" className="card hover:border-primary-600 transition-colors text-center">
            <GraduationCap className="mx-auto mb-4 text-primary-500" size={32} />
            <h3 className="font-semibold text-lg mb-2">DemirWteo</h3>
            <p className="text-dark-400 text-sm">Sistemimiz ve eğitim felsefemiz hakkında bilgi alın.</p>
          </Link>
          <Link to="/medya" className="card hover:border-primary-600 transition-colors text-center">
            <ImageIcon className="mx-auto mb-4 text-primary-500" size={32} />
            <h3 className="font-semibold text-lg mb-2">Medya</h3>
            <p className="text-dark-400 text-sm">Okullarımızdan fotoğraf ve videoları izleyin.</p>
          </Link>
        </div>
      </section>
    </div>
  );
}
