import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import api from '../services/api';
import PasswordInput from '../components/PasswordInput';
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
      toast.error('Şifreler eşleşmiyor');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, new_password: newPassword });
      toast.success('Şifreniz başarıyla değiştirildi, şimdi giriş yapabilirsiniz');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Şifre sıfırlama başarısız');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-50 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/logo-light.png" alt="Demir Wing Tsun Akademi" className="h-20 w-auto mx-auto mb-4" />
          <p className="text-dark-500 mt-2">Yeni Şifre Belirle</p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-5">
          <h2 className="text-xl font-semibold text-center">Yeni Şifre Belirle</h2>

          {!token && (
            <p className="text-sm text-red-500 text-center">
              Link geçersiz. Şifremi unuttum sayfasından yeni bir link isteyin.
            </p>
          )}

          <div>
            <label className="block text-sm font-medium text-dark-700 mb-1.5">Yeni Şifre</label>
            <PasswordInput
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="input-field"
              minLength={6}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-700 mb-1.5">Yeni Şifre (Tekrar)</label>
            <PasswordInput
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="input-field"
              minLength={6}
              required
            />
          </div>

          <button type="submit" disabled={loading || !token} className="btn-primary w-full">
            {loading ? 'Kaydediliyor...' : 'Şifreyi Değiştir'}
          </button>

          <p className="text-center text-sm text-dark-500">
            <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">
              ← Giriş sayfasına dön
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
