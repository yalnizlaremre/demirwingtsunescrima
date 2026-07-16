import { useState, useEffect } from 'react';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

export default function Iletisim() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/content/iletisim')
      .then((res) => setItems(res.data.items))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  const [main, ...extra] = items;

  return (
    <div className="max-w-2xl mx-auto px-6 py-16 text-center">
      <img src="/logo.png" alt="Demir Wing Tsun Akademi" className="h-16 w-auto mx-auto mb-4" />
      <h1 className="text-3xl md:text-4xl font-bold mb-6">{main?.title || 'İletişim'}</h1>
      <p className="text-dark-300 leading-relaxed whitespace-pre-line mb-8">
        {main?.body || 'İletişim bilgileri için bizi Instagram üzerinden takip edebilir, doğrudan mesaj atabilirsiniz.'}
      </p>
      {main?.image_url && (
        <img src={main.image_url} alt={main.title || ''} className="w-full rounded-xl border border-dark-800" />
      )}

      {extra.map((block) => (
        <div key={block.id} className="mt-10 pt-10 border-t border-dark-800">
          {block.title && <h2 className="text-xl font-bold mb-3">{block.title}</h2>}
          {block.body && <p className="text-dark-300 leading-relaxed whitespace-pre-line mb-4">{block.body}</p>}
          {block.image_url && (
            <img src={block.image_url} alt={block.title || ''} className="w-full rounded-xl border border-dark-800" />
          )}
        </div>
      ))}
    </div>
  );
}
