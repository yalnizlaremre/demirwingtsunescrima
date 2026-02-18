import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Shield } from 'lucide-react';

export default function Register() {
  const [form, setForm] = useState({
    email: '', password: '', first_name: '', last_name: '', phone: '',
  });
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register(form);
      toast.success('Kayit basarili! Giris yapabilirsiniz.');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Kayit basarisiz');
    } finally {
      setLoading(false);
    }
  };

  const update = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-900 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-600 mb-4">
            <Shield size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Wing Tsun & Escrima</h1>
          <p className="text-dark-400 mt-2">Uye Kayit</p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4">
          <h2 className="text-xl font-semibold text-center">Kayit Ol</h2>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-dark-700 mb-1">Ad</label>
              <input
                value={form.first_name}
                onChange={(e) => update('first_name', e.target.value)}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-700 mb-1">Soyad</label>
              <input
                value={form.last_name}
                onChange={(e) => update('last_name', e.target.value)}
                className="input-field"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-700 mb-1">E-posta</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              className="input-field"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-700 mb-1">Sifre</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => update('password', e.target.value)}
              className="input-field"
              minLength={6}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-700 mb-1">Telefon</label>
            <input
              value={form.phone}
              onChange={(e) => update('phone', e.target.value)}
              className="input-field"
            />
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Kayit yapiliyor...' : 'Kayit Ol'}
          </button>

          <p className="text-center text-sm text-dark-500">
            Zaten hesabiniz var mi?{' '}
            <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">
              Giris Yap
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
