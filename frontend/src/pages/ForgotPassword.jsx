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
      toast.error(err.response?.data?.detail || 'Bir hata olustu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-900 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/logo.png" alt="Demir Wing Tsun Akademi" className="h-20 w-auto mx-auto mb-4" />
          <p className="text-dark-400 mt-2">Sifremi Unuttum</p>
        </div>

        <div className="card space-y-5">
          <h2 className="text-xl font-semibold text-center">Sifremi Unuttum</h2>

          {sent ? (
            <p className="text-sm text-dark-500 text-center">
              Bu e-posta adresi sistemde kayitliysa, sifre sifirlama linki gonderildi.
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
                  placeholder="ornek@email.com"
                  required
                />
              </div>

              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? 'Gonderiliyor...' : 'Sifirlama Linki Gonder'}
              </button>
            </form>
          )}

          <p className="text-center text-sm text-dark-500">
            <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">
              ← Giris sayfasina don
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
