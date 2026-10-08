import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import usePageMeta from '../hooks/usePageMeta';

export default function NotFound() {
  usePageMeta('Sayfa bulunamadı', 'Aradığınız sayfa bulunamadı.');

  return (
    <div className="max-w-xl mx-auto px-6 py-24 text-center">
      <p className="text-primary-500 font-bold text-6xl mb-4">404</p>
      <h1 className="text-2xl md:text-3xl font-bold mb-3">Sayfa bulunamadı</h1>
      <p className="text-dark-400 mb-8">Aradığınız sayfa taşınmış ya da hiç var olmamış olabilir.</p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link to="/" className="btn-primary px-5 py-2.5">
          <ArrowLeft size={18} /> Anasayfaya dön
        </Link>
        <Link to="/okullar" className="btn-secondary px-5 py-2.5">Okullarımız</Link>
      </div>
    </div>
  );
}
