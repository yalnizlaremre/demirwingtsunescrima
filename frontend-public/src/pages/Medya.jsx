import { useState, useEffect } from 'react';
import { Film, Play, X } from 'lucide-react';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import YouTubeEmbed from '../components/YouTubeEmbed';
import usePageMeta from '../hooks/usePageMeta';

const FILTERS = [
  { key: 'ALL', label: 'Tümü' },
  { key: 'IMAGE', label: 'Fotoğraflar' },
  { key: 'VIDEO', label: 'Videolar' },
  { key: 'YOUTUBE', label: 'YouTube' },
];

function getYouTubeThumbnail(url) {
  if (!url) return null;
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? `https://img.youtube.com/vi/${match[1]}/mqdefault.jpg` : null;
}

export default function Medya() {
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [lightbox, setLightbox] = useState(null);
  const [player, setPlayer] = useState(null);

  usePageMeta('Medya', 'Demir Wing Tsun Akademi okullarımızdan fotoğraflar ve videolar.');

  useEffect(() => {
    setLoading(true);
    const url = filter === 'ALL' ? '/media' : `/media?media_type=${filter}`;
    api.get(url)
      .then((res) => setMedia(res.data))
      .catch(() => setMedia([]))
      .finally(() => setLoading(false));
  }, [filter]);

  return (
    <div className="max-w-6xl mx-auto px-6 py-16">
      <div className="text-center mb-10">
        <h1 className="text-3xl md:text-4xl font-bold mb-4">Medya</h1>
        <p className="text-dark-400 max-w-2xl mx-auto">
          Okullarımızdan fotoğraflar ve videolar.
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-2 mb-10">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === f.key
                ? 'bg-primary-600 text-white'
                : 'bg-dark-800 text-dark-400 hover:text-white'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : media.length === 0 ? (
        <div className="text-center text-dark-500 py-16">
          <Film className="mx-auto mb-4" size={40} />
          Henüz medya eklenmemiş.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {media.map((m) => (
            <div key={m.id} className="card p-2 overflow-hidden">
              {m.media_type === 'IMAGE' ? (
                <img
                  src={m.file_url}
                  alt={m.title || ''}
                  onClick={() => setLightbox(m.file_url)}
                  className="w-full h-40 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                />
              ) : m.media_type === 'YOUTUBE' ? (
                <button
                  onClick={() => setPlayer(m)}
                  className="block w-full h-40 rounded-lg overflow-hidden relative group"
                >
                  {getYouTubeThumbnail(m.youtube_url) ? (
                    <img src={getYouTubeThumbnail(m.youtube_url)} alt={m.title || 'YouTube'} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-dark-700 flex items-center justify-center">
                      <Play size={32} className="text-dark-300" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Play size={32} className="text-white" />
                  </div>
                </button>
              ) : (
                <button
                  onClick={() => setPlayer(m)}
                  className="w-full h-40 bg-dark-800 rounded-lg flex items-center justify-center relative group"
                >
                  <Film size={32} className="text-dark-400" />
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Play size={32} className="text-white" />
                  </div>
                </button>
              )}
              {m.title && <p className="text-xs text-dark-400 mt-2 px-1 truncate">{m.title}</p>}
            </div>
          ))}
        </div>
      )}

      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-6"
          onClick={() => setLightbox(null)}
        >
          <button onClick={() => setLightbox(null)} className="absolute top-6 right-6 text-white hover:text-dark-300" title="Kapat">
            <X size={32} />
          </button>
          <img src={lightbox} alt="" className="max-w-full max-h-full rounded-lg" onClick={(e) => e.stopPropagation()} />
        </div>
      )}

      {player && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-6"
          onClick={() => setPlayer(null)}
        >
          <button onClick={() => setPlayer(null)} className="absolute top-6 right-6 text-white hover:text-dark-300" title="Kapat">
            <X size={32} />
          </button>
          <div className="w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
            {player.media_type === 'YOUTUBE' ? (
              <YouTubeEmbed url={player.youtube_url} title={player.title} />
            ) : (
              <video src={player.file_url} controls autoPlay className="w-full max-h-[80vh] rounded-lg" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
