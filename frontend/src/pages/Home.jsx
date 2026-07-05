import { Link } from 'react-router-dom';
import { Shield, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-dark-900 text-white flex flex-col">
      <header className="border-b border-dark-800">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center">
              <Shield size={20} className="text-white" />
            </div>
            <span className="font-bold text-lg">Wing Tsun & Escrima Portal</span>
          </div>
          <a
            href="https://demirwingtsun.com"
            className="text-sm text-dark-400 hover:text-white transition-colors"
          >
            Tanıtım sitesine dön
          </a>
        </div>
      </header>

      <section className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-md w-full text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-600 mb-6">
            <Shield size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold mb-3">Üye Portalına Hoş Geldiniz</h1>
          <p className="text-dark-400 mb-10">
            Ders, müfredat, seminer ve katılım takibinizi buradan yapabilirsiniz.
          </p>

          {user ? (
            <Link to="/dashboard" className="btn-primary w-full justify-center text-base px-6 py-3">
              Panele Git <ArrowRight size={18} />
            </Link>
          ) : (
            <div className="space-y-3">
              <Link to="/login" className="btn-primary w-full justify-center text-base px-6 py-3">
                Giriş Yap
              </Link>
              <Link to="/register" className="btn-secondary w-full justify-center text-base px-6 py-3">
                Kayıt Ol / Bize Katılın
              </Link>
            </div>
          )}
        </div>
      </section>

      <footer className="border-t border-dark-800 py-6 text-center text-dark-500 text-sm">
        © {new Date().getFullYear()} Wing Tsun & Escrima Organizasyonu
      </footer>
    </div>
  );
}
