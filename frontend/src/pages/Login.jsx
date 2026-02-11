import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Shield } from 'lucide-react';

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
      toast.success('Giris basarili!');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Giris basarisiz');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-900 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-600 mb-4">
            <Shield size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Wing Tsun & Escrima</h1>
          <p className="text-dark-400 mt-2">Okul Yonetim Sistemi</p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-5">
          <h2 className="text-xl font-semibold text-center">Giris Yap</h2>

          <div>
            <label className="block text-sm font-medium text-dark-700 mb-1.5">E-posta</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field"
              placeholder="ornek@email.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-700 mb-1.5">Sifre</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field"
              placeholder="••••••••"
              required
            />
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Giris yapiliyor...' : 'Giris Yap'}
          </button>

          <p className="text-center text-sm text-dark-500">
            Hesabiniz yok mu?{' '}
            <Link to="/register" className="text-primary-600 hover:text-primary-700 font-medium">
              Kayit Ol
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
