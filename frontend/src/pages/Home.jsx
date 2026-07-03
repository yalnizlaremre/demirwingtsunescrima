import { Link } from 'react-router-dom';
import { Shield, Swords, Users, Award, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-dark-900 text-white">
      {/* Nav */}
      <header className="border-b border-dark-800">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center">
              <Shield size={20} className="text-white" />
            </div>
            <span className="font-bold text-lg">Wing Tsun & Escrima</span>
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <Link to="/dashboard" className="btn-primary">Panele Git</Link>
            ) : (
              <>
                <Link to="/login" className="btn-secondary">Giris Yap</Link>
                <Link to="/register" className="btn-primary">Kayit Ol</Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 py-20 text-center">
        <h1 className="text-4xl md:text-5xl font-bold mb-6">
          Wing Tsun & Escrima Organizasyonu
        </h1>
        <p className="text-dark-400 text-lg max-w-2xl mx-auto mb-10">
          Turkiye ve cevresindeki okullarimizi tek catida yoneten dijital platform.
          Ogrenci ilerlemesi, sinav uygunlugu ve seminerler artik tek bir sistemde.
        </p>
        <div className="flex items-center justify-center gap-4">
          {user ? (
            <Link to="/dashboard" className="btn-primary text-base px-6 py-3">
              Panele Git <ArrowRight size={18} />
            </Link>
          ) : (
            <>
              <Link to="/register" className="btn-primary text-base px-6 py-3">
                Aramiza Katil <ArrowRight size={18} />
              </Link>
              <Link to="/login" className="btn-secondary text-base px-6 py-3">
                Giris Yap
              </Link>
            </>
          )}
        </div>
      </section>

      {/* Hakkimizda */}
      <section className="max-w-6xl mx-auto px-6 py-16 border-t border-dark-800">
        <h2 className="text-2xl font-bold mb-6 text-center">Hakkimizda</h2>
        <p className="text-dark-400 max-w-3xl mx-auto text-center leading-relaxed">
          Wing Tsun & Escrima Organizasyonu, geleneksel dovus sanatlarini modern
          egitim standartlariyla bulusturan bir okullar agidir. Farkli sehirlerdeki
          okullarimizda egitmenlerimiz, ogrencilerin derece ilerlemesini, ders
          devamlarini ve seminer katilimlarini bu platform uzerinden seffaf ve
          tutarli bir sekilde yonetir.
        </p>
      </section>

      {/* Branches */}
      <section className="max-w-6xl mx-auto px-6 py-16 border-t border-dark-800">
        <div className="grid md:grid-cols-3 gap-6">
          <div className="card bg-dark-800 border-dark-700 text-center">
            <Swords className="mx-auto mb-4 text-primary-500" size={32} />
            <h3 className="font-semibold text-lg mb-2">Wing Tsun</h3>
            <p className="text-dark-400 text-sm">
              Yakin mesafe teknikleri ve refleks gelistirmeye dayali geleneksel Cin dovus sanati.
            </p>
          </div>
          <div className="card bg-dark-800 border-dark-700 text-center">
            <Award className="mx-auto mb-4 text-primary-500" size={32} />
            <h3 className="font-semibold text-lg mb-2">Escrima</h3>
            <p className="text-dark-400 text-sm">
              Filipin kokenli sopa ve bicak teknikleri uzerine kurulu silahli dovus sanati.
            </p>
          </div>
          <div className="card bg-dark-800 border-dark-700 text-center">
            <Users className="mx-auto mb-4 text-primary-500" size={32} />
            <h3 className="font-semibold text-lg mb-2">Okullarimiz</h3>
            <p className="text-dark-400 text-sm">
              Birden fazla sehirde faaliyet gosteren, tek standartta egitim veren okul agi.
            </p>
          </div>
        </div>
      </section>

      <footer className="border-t border-dark-800 py-8 text-center text-dark-500 text-sm">
        © {new Date().getFullYear()} Wing Tsun & Escrima Organizasyonu
      </footer>
    </div>
  );
}
