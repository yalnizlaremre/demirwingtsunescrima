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

const SLIDESHOW_INTERVAL_MS = 7500;

export default function Anasayfa() {
  const [items, setItems] = useState([]);
  const [slideshow, setSlideshow] = useState([]);
  const [slideIndex, setSlideIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/content/anasayfa').then((res) => setItems(res.data.items)).catch(() => setItems([])),
      api.get('/media?media_type=IMAGE').then((res) => setSlideshow(res.data)).catch(() => setSlideshow([])),
    ]).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (slideshow.length < 2) return;
    const timer = setInterval(() => {
      setSlideIndex((i) => (i + 1) % slideshow.length);
    }, SLIDESHOW_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [slideshow.length]);

  if (loading) return <LoadingSpinner />;

  // Ilk blok sadece hero arkaplan medyasini (video/gorsel) secmek icin kullanilir;
  // metin icerigi (baslik/govde/youtube) diger butun bloklarla ayni sekilde asagida, alt alta gosterilir.
  const [heroMedia] = items;
  const heroIsVideo = isVideoUrl(heroMedia?.image_url);
  const hasSlideshow = !heroIsVideo && slideshow.length > 0;

  return (
    <div>
      {/* Hero */}
      <section className="relative min-h-[85vh] flex items-center overflow-hidden bg-dark-900">
        <div className="absolute inset-0 z-0">
          {heroIsVideo ? (
            <video
              src={heroMedia.image_url}
              autoPlay
              muted
              loop
              playsInline
              className="w-full h-full object-cover"
            />
          ) : hasSlideshow ? (
            slideshow.map((img, i) => (
              <img
                key={img.id}
                src={img.file_url}
                alt=""
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out ${
                  i === slideIndex ? 'opacity-100' : 'opacity-0'
                }`}
              />
            ))
          ) : heroMedia?.image_url ? (
            <img src={heroMedia.image_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-dark-800 via-dark-900 to-black" />
          )}
        </div>
        <div className="absolute inset-0 z-0 bg-gradient-to-t from-dark-900 via-dark-900/70 to-dark-900/40" />

        <div className="relative z-10 max-w-6xl mx-auto px-6 py-24 text-center w-full">
          <img src="/logo.png" alt={ORG_NAME} className="h-16 w-auto mx-auto mb-6" />
          <h1 className="text-4xl md:text-6xl font-bold mb-4">{ORG_NAME}</h1>
          <p className="text-dark-300 text-lg max-w-2xl mx-auto mb-10 whitespace-pre-line">
            {DEFAULT_TAGLINE}
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

      {/* Icerik bloklari - hepsi (Site Icerigi'nde girilen sirayla) alt alta, ayni sekilde gosterilir */}
      {items.map((block) => (
        <section key={block.id} className="max-w-4xl mx-auto px-6 py-16 border-b border-dark-800 last:border-b-0">
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
