import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/LoadingSpinner';
import PageHeader from '../components/PageHeader';
import { Award, Clock, Target, AlertTriangle, CheckCircle2, User, Camera, Upload } from 'lucide-react';

export default function Profile() {
  const { user, fetchUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    try {
      // Try to get student profile (for USER role with student record)
      const res = await api.get('/students/my-profile');
      setProfile(res.data);
    } catch {
      // Not a student or no student record - that's fine
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    setUploading(true);

    try {
      const res = await api.post('/students/my-profile/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Profil resmi guncellendi');
      // Refresh user data in context
      await fetchUser();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Profil resmi yuklenemedi');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  if (loading) return <LoadingSpinner />;

  const getEligibilityBadge = (eligibility) => {
    if (eligibility === 'ELIGIBLE') {
      return (
        <span className="flex items-center gap-1 text-sm text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
          <CheckCircle2 size={14} /> Sinava girebilir
        </span>
      );
    } else if (eligibility === 'NEEDS_APPROVAL') {
      return (
        <span className="flex items-center gap-1 text-sm text-amber-600 bg-amber-50 px-2 py-1 rounded-lg">
          <AlertTriangle size={14} /> Egitmen onayi gerekli
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 text-sm text-red-600 bg-red-50 px-2 py-1 rounded-lg">
        <Clock size={14} /> Yeterli saat yok
      </span>
    );
  };

  const getProgressPercent = (completed, required) => {
    if (!required || required === 0) return 0;
    return Math.min(100, Math.round((completed / required) * 100));
  };

  return (
    <div>
      <PageHeader title="Profilim" subtitle="Profil bilgilerin ve ilerleme durumun" />

      {/* Avatar + Kisisel Bilgiler */}
      <div className="card mb-6">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          {/* Avatar */}
          <div className="relative group">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-dark-200 flex items-center justify-center">
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt="Profil" className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl font-bold text-dark-400">
                  {user?.first_name?.[0]}{user?.last_name?.[0]}
                </span>
              )}
            </div>
            <label className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
              {uploading ? (
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent" />
              ) : (
                <Camera size={24} className="text-white" />
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleAvatarUpload}
                className="hidden"
                disabled={uploading}
              />
            </label>
          </div>

          {/* Bilgiler */}
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-center sm:text-left">
            <div>
              <p className="text-sm text-dark-500">Ad Soyad</p>
              <p className="font-semibold">{user?.first_name} {user?.last_name}</p>
            </div>
            <div>
              <p className="text-sm text-dark-500">E-posta</p>
              <p className="font-semibold">{user?.email}</p>
            </div>
            <div>
              <p className="text-sm text-dark-500">Telefon</p>
              <p className="font-semibold">{user?.phone || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-dark-500">Rol</p>
              <p className="font-semibold capitalize">{
                user?.role === 'SUPER_ADMIN' ? 'Super Admin' :
                user?.role === 'ADMIN' ? 'Admin' :
                user?.role === 'MANAGER' ? 'Egitmen' :
                user?.role === 'USER' ? 'Ogrenci' : 'Uye'
              }</p>
            </div>
          </div>
        </div>
      </div>

      {/* Student Progress (only for students with profile) */}
      {profile && profile.progress && profile.progress.length > 0 && (
        <>
          <h2 className="text-lg font-semibold mb-4">Brans Ilerleme Durumu</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {profile.progress.map((p) => {
              const percent = getProgressPercent(p.completed_hours, p.required_hours);
              const branchName = p.branch === 'WING_TSUN' ? 'Wing Tsun' : 'Escrima';
              const branchColor = p.branch === 'WING_TSUN' ? 'primary' : 'emerald';

              return (
                <div key={p.branch} className="card">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      <Award size={20} className={`text-${branchColor}-600`} />
                      {branchName}
                    </h3>
                    {getEligibilityBadge(p.exam_eligibility)}
                  </div>

                  <div className="space-y-4">
                    {/* Derece */}
                    <div className="flex justify-between items-center">
                      <span className="text-dark-500">Derece</span>
                      <span className="font-bold text-2xl">{p.current_grade}. Derece</span>
                    </div>

                    {/* Ilerleme Cubugu */}
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-dark-500">Tamamlanan</span>
                        <span className="font-medium">{p.completed_hours} / {p.required_hours} saat</span>
                      </div>
                      <div className="w-full bg-dark-200 rounded-full h-3">
                        <div
                          className={`h-3 rounded-full transition-all duration-500 ${
                            percent >= 100 ? 'bg-emerald-500' :
                            percent >= (p.minimum_hours / p.required_hours * 100) ? 'bg-amber-500' :
                            'bg-primary-600'
                          }`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-dark-400 mt-1">
                        <span>0</span>
                        <span className="text-amber-600">Alt sinir: {p.minimum_hours}s</span>
                        <span>{p.required_hours}s</span>
                      </div>
                    </div>

                    {/* Detay Bilgiler */}
                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-dark-100">
                      <div className="text-center p-2 bg-dark-50 rounded-lg">
                        <p className="text-xs text-dark-500">Kalan Saat</p>
                        <p className="font-bold text-lg">{p.remaining_hours}</p>
                      </div>
                      <div className="text-center p-2 bg-dark-50 rounded-lg">
                        <p className="text-xs text-dark-500">Ilerleme</p>
                        <p className="font-bold text-lg">%{percent}</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* No student profile yet */}
      {!profile && user?.role === 'USER' && (
        <div className="card text-center py-8">
          <User size={48} className="mx-auto text-dark-400 mb-4" />
          <p className="text-dark-500">Ogrenci profili henuz olusturulmamis.</p>
        </div>
      )}
    </div>
  );
}
