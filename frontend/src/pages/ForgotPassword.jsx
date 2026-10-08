import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-50 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/logo-light.png" alt="Demir Wing Tsun Akademi" className="h-20 w-auto mx-auto mb-4" />
          <p className="text-dark-500 mt-2">Şifremi Unuttum</p>
        </div>

        <div className="card space-y-5">
          <h2 className="text-xl font-semibold text-center">Şifremi Unuttum</h2>

          {sent ? (
            <p className="text-sm text-dark-500 text-center">
              Bu e-posta adresi sistemde kayıtlıysa, şifre sıfırlama linki gönderildi.
              Gelen kutunuzu (ve spam klasorunu) kontrol edin.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
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

              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? 'Gönderiliyor...' : 'Sıfırlama Linki Gönder'}
              </button>
            </form>
          )}

          <p className="text-center text-sm text-dark-500">
            <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">
              ← Giriş sayfasına dön
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
