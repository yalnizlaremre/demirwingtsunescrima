import { useState, useEffect } from 'react';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import YouTubeEmbed from '../components/YouTubeEmbed';
import usePageMeta from '../hooks/usePageMeta';
import DisciplineSection, { resolveDiscipline } from '../components/DisciplineSection';
import { DISCIPLINES } from '../content/disciplines';

export default function DemirWteo() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [overrides, setOverrides] = useState({});

  usePageMeta('DemirWteo', 'Demir Wing Tsun Escrima sistemimiz ve eğitim felsefemiz hakkında bilgi alın.');

  useEffect(() => {
    Promise.all([
      api.get('/content/demirwteo').then((res) => setItems(res.data.items)).catch(() => setItems([])),
      // Disiplin metinleri panelden (ayni slug) de girilebilir
      Promise.all(
        DISCIPLINES.map((d) =>
          api.get(`/content/${d.slug}`).then((res) => [d.slug, res.data.items?.[0] || null]).catch(() => [d.slug, null])
        )
      ).then((pairs) => setOverrides(Object.fromEntries(pairs))),
    ]).finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  const [main, ...extra] = items;
  const disciplines = DISCIPLINES.map((d) => resolveDiscipline(d, overrides[d.slug])).filter(Boolean);

  return (
    <div className="max-w-4xl mx-auto px-6 py-16">
      <div className="text-center mb-10">
        <img src="/logo-light.png" alt="Demir Wing Tsun Akademi" className="h-16 w-auto mx-auto mb-4" />
        <h1 className="text-3xl md:text-4xl font-bold">{main?.title || 'DemirWteo'}</h1>
      </div>

      {main?.image_url && (
        <img src={main.image_url} alt={main.title || ''} className="w-full rounded-xl border border-dark-700 mb-10" />
      )}

      {main?.body && (
        <p className="text-dark-300 leading-relaxed whitespace-pre-line">{main.body}</p>
      )}

      {disciplines.length > 1 && (
        <nav aria-label="Bölümler" className="flex flex-wrap justify-center gap-2 mt-10">
          {disciplines.map((d) => (
            <a key={d.slug} href={`#${d.slug}`} className="btn-secondary btn-sm">{d.title}</a>
          ))}
        </nav>
      )}

      {main?.youtube_url && (
        <div className="mt-10">
          <YouTubeEmbed url={main.youtube_url} title={main.title} />
        </div>
      )}

      {extra.map((block) => (
        <div key={block.id} className="mt-12 pt-12 border-t border-dark-700">
          {block.title && <h2 className="text-2xl font-bold mb-4">{block.title}</h2>}
          {block.image_url && (
            <img src={block.image_url} alt={block.title || ''} className="w-full rounded-xl border border-dark-700 mb-6" />
          )}
          {block.body && <p className="text-dark-300 leading-relaxed whitespace-pre-line">{block.body}</p>}
          {block.youtube_url && (
            <div className="mt-6">
              <YouTubeEmbed url={block.youtube_url} title={block.title} />
            </div>
          )}
        </div>
      ))}

      {disciplines.map((d) => (
        <DisciplineSection key={d.slug} d={d} />
      ))}
    </div>
  );
}
