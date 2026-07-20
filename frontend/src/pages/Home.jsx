import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-dark-900 text-white flex flex-col">
      <header className="border-b border-dark-800">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Demir Wing Tsun Akademi" className="h-10 w-auto" />
            <span className="font-bold text-lg">Demir Wing Tsun Akademi</span>
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
          <img src="/logo.png" alt="Demir Wing Tsun Akademi" className="h-20 w-auto mx-auto mb-6" />
          <h1 className="text-3xl font-bold mb-3">Demir Wing Tsun Akademi Üye Portalı</h1>
          <p className="text-dark-400 mb-10">
            Ders programınızı, derece ilerlemenizi, seminer ve katılım kayıtlarınızı tek yerden takip edin.
          </p>

          {user ? (
            <Link to="/dashboard" className="btn-primary w-full justify-center text-base px-6 py-3">
              Panele Devam Et <ArrowRight size={18} />
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
        © {new Date().getFullYear()} Demir Wing Tsun Akademi
      </footer>
    </div>
  );
}
