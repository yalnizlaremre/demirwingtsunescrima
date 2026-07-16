import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { APP_URL } from '../config';

const LINKS = [
  { to: '/', label: 'Anasayfa' },
  { to: '/okullar', label: 'Okullar' },
  { to: '/demirwteo', label: 'DemirWteo' },
  { to: '/egitmenler', label: 'Eğitmenler' },
  { to: '/iletisim', label: 'İletişim' },
];

export default function Nav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="border-b border-dark-800 sticky top-0 bg-dark-900/95 backdrop-blur z-40">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <img src="/logo.png" alt="Demir Wing Tsun Akademi" className="h-14 w-auto" />
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          {LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === '/'}
              className={({ isActive }) =>
                `text-sm font-medium transition-colors ${isActive ? 'text-white' : 'text-dark-400 hover:text-white'}`
              }
            >
              {l.label}
            </NavLink>
          ))}
          <a href={APP_URL} className="btn-primary btn-sm">Giriş Yap</a>
        </nav>

        <button className="md:hidden text-white" onClick={() => setOpen(!open)}>
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {open && (
        <nav className="md:hidden border-t border-dark-800 px-6 py-4 space-y-3">
          {LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === '/'}
              onClick={() => setOpen(false)}
              className="block text-dark-300 hover:text-white text-sm font-medium"
            >
              {l.label}
            </NavLink>
          ))}
          <a href={APP_URL} className="btn-primary w-full justify-center">Giriş Yap</a>
        </nav>
      )}
    </header>
  );
}
