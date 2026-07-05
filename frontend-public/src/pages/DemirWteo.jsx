import { useState, useEffect } from 'react';
import { Shield } from 'lucide-react';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import YouTubeEmbed from '../components/YouTubeEmbed';

export default function DemirWteo() {
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/content/demirwteo')
      .then((res) => setContent(res.data))
      .catch(() => setContent(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-4xl mx-auto px-6 py-16">
      <div className="text-center mb-10">
        <Shield className="mx-auto mb-4 text-primary-500" size={40} />
        <h1 className="text-3xl md:text-4xl font-bold">{content?.title || 'DemirWteo'}</h1>
      </div>

      {content?.image_url && (
        <img src={content.image_url} alt={content.title || ''} className="w-full rounded-xl border border-dark-800 mb-10" />
      )}

      <p className="text-dark-300 leading-relaxed whitespace-pre-line">
        {content?.body || 'Bu içerik henüz eklenmedi.'}
      </p>

      {content?.youtube_url && (
        <div className="mt-10">
          <YouTubeEmbed url={content.youtube_url} title={content.title} />
        </div>
      )}
    </div>
  );
}
