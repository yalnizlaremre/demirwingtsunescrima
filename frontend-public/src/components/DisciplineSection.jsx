import { Link } from 'react-router-dom';
import SafeImage from './SafeImage';

function toParagraphs(text) {
  return (text || '').split(/\n+/).map((p) => p.trim()).filter(Boolean);
}

// Varsayilan (kod icindeki) metni, panelde ayni slug ile girilmis Site Icerigi
// kaydiyla birlestirir. Gosterilecek metin yoksa null doner.
export function resolveDiscipline(def, override) {
  const custom = toParagraphs(override?.body);
  const paragraphs = custom.length ? custom : def.paragraphs;
  if (!paragraphs.length) return null;
  return {
    ...def,
    title: override?.title || def.title,
    image: override?.image_url || def.image || null,
    paragraphs,
    closing: custom.length ? null : def.closing,
  };
}

export default function DisciplineSection({ d }) {
  return (
    <section id={d.slug} aria-labelledby={`${d.slug}-baslik`} className="scroll-mt-28 mt-16 pt-16 border-t border-dark-700">
      <p className="text-xs font-semibold tracking-[0.2em] uppercase text-primary-600 mb-3">Disiplinlerimiz</p>
      <h2 id={`${d.slug}-baslik`} className="text-3xl md:text-4xl font-bold mb-2">{d.title}</h2>
      {d.tagline && <p className="text-dark-500 mb-8">{d.tagline}</p>}

      {d.image && (
        <SafeImage src={d.image} alt={d.title} className="w-full rounded-xl border border-dark-700 mb-8" />
      )}

      {d.highlights?.length > 0 && (
        <div className="card mb-8">
          <p className="text-sm font-semibold mb-3">Çalışmalarda</p>
          <ul className="flex flex-wrap gap-2">
            {d.highlights.map((h) => (
              <li key={h} className="px-3 py-1.5 rounded-full bg-dark-900 border border-dark-700 text-sm text-dark-300">
                {h}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-5 text-dark-300 leading-relaxed">
        {d.paragraphs.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>

      {d.closing && (
        <div className="mt-10 rounded-xl border-l-4 border-primary-600 bg-dark-800 border border-dark-700 p-6">
          <p className="text-lg text-ink leading-relaxed">{d.closing}</p>
          <div className="flex flex-wrap gap-3 mt-5">
            <Link to="/okullar" className="btn-primary">Okullarımız</Link>
            <Link to="/iletisim" className="btn-secondary">İletişim</Link>
          </div>
        </div>
      )}
    </section>
  );
}
