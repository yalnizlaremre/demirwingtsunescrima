import { Link } from 'react-router-dom';

const LINKS = [
  { to: '/', label: 'Anasayfa' },
  { to: '/okullar', label: 'Okullar' },
  { to: '/demirwteo', label: 'DemirWteo' },
  { to: '/egitmenler', label: 'Eğitmenler' },
  { to: '/medya', label: 'Medya' },
  { to: '/iletisim', label: 'İletişim' },
];

export default function Footer() {
  return (
    <footer className="border-t border-dark-800 mt-16">
      <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col md:flex-row items-center md:items-start justify-between gap-8">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Demir Wing Tsun Akademi" className="h-10 w-auto" />
          <span className="font-semibold">Demir Wing Tsun Akademi</span>
        </div>

        <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2">
          {LINKS.map((l) => (
            <Link key={l.to} to={l.to} className="text-sm text-dark-400 hover:text-white transition-colors">
              {l.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="border-t border-dark-800 py-6 text-center text-dark-500 text-sm">
        © {new Date().getFullYear()} Demir Wing Tsun Akademi
      </div>
    </footer>
  );
}
