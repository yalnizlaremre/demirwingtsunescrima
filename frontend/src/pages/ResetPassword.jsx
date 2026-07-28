import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('Sifreler eslesmiyor');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, new_password: newPassword });
      toast.success('Sifreniz basariyla degistirildi, simdi giris yapabilirsiniz');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Sifre sifirlama basarisiz');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-900 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/logo.png" alt="Demir Wing Tsun Akademi" className="h-20 w-auto mx-auto mb-4" />
          <p className="text-dark-400 mt-2">Yeni Sifre Belirle</p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-5">
          <h2 className="text-xl font-semibold text-center">Yeni Sifre Belirle</h2>

          {!token && (
            <p className="text-sm text-red-500 text-center">
              Link gecersiz. Sifremi unuttum sayfasindan yeni bir link isteyin.
            </p>
          )}

          <div>
            <label className="block text-sm font-medium text-dark-700 mb-1.5">Yeni Sifre</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="input-field"
              minLength={6}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-700 mb-1.5">Yeni Sifre (Tekrar)</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="input-field"
              minLength={6}
              required
            />
          </div>

          <button type="submit" disabled={loading || !token} className="btn-primary w-full">
            {loading ? 'Kaydediliyor...' : 'Sifreyi Degistir'}
          </button>

          <p className="text-center text-sm text-dark-500">
            <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">
              ← Giris sayfasina don
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
