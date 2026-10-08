import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PasswordInput from '../components/PasswordInput';
import toast from 'react-hot-toast';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Giriş başarılı!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Giriş başarısız');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-50 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/logo-light.png" alt="Demir Wing Tsun Akademi" className="h-20 w-auto mx-auto mb-4" />
          <p className="text-dark-500 mt-2">Okul Yönetim Sistemi</p>
          <a
            href="https://demirwingtsun.com"
            className="inline-block text-sm text-dark-500 hover:text-dark-900 transition-colors mt-2"
          >
            ← Tanıtım sitesine dön
          </a>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-5">
          <h2 className="text-xl font-semibold text-center">Giriş Yap</h2>

          <div>
            <label className="block text-sm font-medium text-dark-700 mb-1.5">E-posta</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field"
              placeholder="örnek@email.com"
              required
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-medium text-dark-700">Şifre</label>
              <Link to="/forgot-password" className="text-sm text-primary-600 hover:text-primary-700">
                Şifremi unuttum?
              </Link>
            </div>
            <PasswordInput
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field"
              placeholder="••••••••"
              required
            />
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
          </button>

          <p className="text-center text-sm text-dark-500">
            Hesabınız yok mu?{' '}
            <Link to="/register" className="text-primary-600 hover:text-primary-700 font-medium">
              Kayıt Ol
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
