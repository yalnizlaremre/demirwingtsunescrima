import { useState, useEffect } from 'react';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

export default function Iletisim() {
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/content/iletisim')
      .then((res) => setContent(res.data))
      .catch(() => setContent(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-2xl mx-auto px-6 py-16 text-center">
      <img src="/logo.png" alt="Demir Wing Tsun Akademi" className="h-16 w-auto mx-auto mb-4" />
      <h1 className="text-3xl md:text-4xl font-bold mb-6">{content?.title || 'İletişim'}</h1>
      <p className="text-dark-300 leading-relaxed whitespace-pre-line mb-8">
        {content?.body || 'İletişim bilgileri için bizi Instagram üzerinden takip edebilir, doğrudan mesaj atabilirsiniz.'}
      </p>
      {content?.image_url && (
        <img src={content.image_url} alt={content.title || ''} className="w-full rounded-xl border border-dark-800" />
      )}
    </div>
  );
}
