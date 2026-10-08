import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function NotFound() {
  const { user } = useAuth();
  const target = user ? '/dashboard' : '/';

  return (
    <div className="min-h-screen bg-dark-50 text-dark-900 flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <img src="/logo-light.png" alt="Demir Wing Tsun Akademi" className="h-16 w-auto mx-auto mb-6" />
        <p className="text-primary-500 font-bold text-5xl mb-3">404</p>
        <h1 className="text-2xl font-bold mb-2">Sayfa bulunamadı</h1>
        <p className="text-dark-400 mb-8">Aradığınız sayfa taşınmış ya da hiç var olmamış olabilir.</p>
        <Link to={target} className="btn-primary">
          {user ? 'Panele dön' : 'Anasayfaya dön'}
        </Link>
      </div>
    </div>
  );
}
