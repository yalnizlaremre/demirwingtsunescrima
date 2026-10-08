import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Phone } from 'lucide-react';
import api from '../services/api';
import { telHref, formatPhone, mapsHref } from '../utils/contact';

const LINKS = [
  { to: '/', label: 'Anasayfa' },
  { to: '/okullar', label: 'Okullar' },
  { to: '/demirwteo', label: 'DemirWteo' },
  { to: '/egitmenler', label: 'Eğitmenler' },
  { to: '/medya', label: 'Medya' },
  { to: '/iletisim', label: 'İletişim' },
];

export default function Footer() {
  const [schools, setSchools] = useState([]);

  useEffect(() => {
    api.get('/schools').then((res) => setSchools(res.data || [])).catch(() => setSchools([]));
  }, []);

  return (
    <footer className="border-t border-dark-700 mt-16 bg-dark-800">
      <div className="max-w-6xl mx-auto px-6 py-10 grid gap-10 md:grid-cols-3">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <img src="/logo-light.png" alt="Demir Wing Tsun Akademi" className="h-10 w-auto" />
            <span className="font-semibold">Demir Wing Tsun Akademi</span>
          </div>
          <p className="text-dark-400 text-sm">Wing Tsun ve Escrima eğitimi.</p>
        </div>

        <div className="md:col-span-1">
          <h3 className="text-sm font-semibold mb-3">Okullarımız</h3>
          <ul className="space-y-4">
            {schools.map((s) => (
              <li key={s.id} className="text-sm">
                <p className="font-medium text-dark-200 mb-1">{s.name}</p>
                {s.address && (
                  <a
                    href={mapsHref(s.address, s.name)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-2 text-dark-400 hover:text-ink transition-colors"
                  >
                    <MapPin size={14} className="mt-0.5 shrink-0" /> <span>{s.address}</span>
                  </a>
                )}
                {s.phone && (
                  <a
                    href={telHref(s.phone)}
                    className="flex items-center gap-2 text-dark-400 hover:text-ink transition-colors mt-1"
                  >
                    <Phone size={14} className="shrink-0" /> {formatPhone(s.phone)}
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>

        <nav className="md:justify-self-end">
          <h3 className="text-sm font-semibold mb-3">Sayfalar</h3>
          <ul className="grid grid-cols-2 gap-x-8 gap-y-2">
            {LINKS.map((l) => (
              <li key={l.to}>
                <Link to={l.to} className="text-sm text-dark-400 hover:text-ink transition-colors">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="border-t border-dark-700 py-6 text-center text-dark-500 text-sm">
        © {new Date().getFullYear()} Demir Wing Tsun Akademi
      </div>
    </footer>
  );
}
