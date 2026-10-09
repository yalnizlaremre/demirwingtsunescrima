import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { Plus, Edit2, Trash2, UserPlus, School, CheckCircle, Clock, XCircle, Upload, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Schools() {
  const [schools, setSchools] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [managerModalOpen, setManagerModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [form, setForm] = useState({ name: '', address: '', description: '', phone: '', email: '', cover_image_url: '', long_description: '', youtube_url: '' });
  const [managerUserId, setManagerUserId] = useState('');
  const [managers, setManagers] = useState([]);
  const [assignedManagers, setAssignedManagers] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [galleryImages, setGalleryImages] = useState([]);
  const [galleryUploading, setGalleryUploading] = useState(false);
  const galleryFileRef = useRef(null);
  const [coverUploading, setCoverUploading] = useState(false);
  const coverFileRef = useRef(null);
  const { user, isAdmin, isMember } = useAuth();

  useEffect(() => {
    fetchSchools();
    if (isMember) {
      fetchMyEnrollments();
    }
  }, []);

  const fetchSchools = async () => {
    try {
      const res = await api.get('/schools/?limit=100');
      setSchools(res.data.items);
      setTotal(res.data.total);
    } catch {} finally { setLoading(false); }
  };

  const fetchMyEnrollments = async () => {
    try {
      const res = await api.get('/enrollments/');
      setEnrollments(res.data.items || []);
    } catch {}
  };

  const getEnrollmentStatus = (schoolId) => {
    return enrollments.find((e) => e.school_id === schoolId);
  };

  const handleEnrollmentRequest = async (schoolId) => {
    try {
      await api.post('/enrollments/', { school_id: schoolId });
      toast.success('Okula katılma talebiniz gönderildi');
      fetchMyEnrollments();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Talep gönderilemedi');
    }
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', address: '', description: '', phone: '', email: '', cover_image_url: '', long_description: '', youtube_url: '' });
    setGalleryImages([]);
    setModalOpen(true);
  };

  const openEdit = (school) => {
    setEditing(school);
    setForm({
      name: school.name,
      address: school.address || '',
      description: school.description || '',
      phone: school.phone || '',
      email: school.email || '',
      cover_image_url: school.cover_image_url || '',
      long_description: school.long_description || '',
      youtube_url: school.youtube_url || '',
    });
    setGalleryImages(school.media || []);
    setModalOpen(true);
  };

  // Kapak görseli okul galerisine eklenmemesi için school_id olmadan yuklenir
  // (Site İçeriği sayfasindaki görsel yükleme ile ayni yontem).
  const handleCoverUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    setCoverUploading(true);
    try {
      const res = await api.post('/media/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      update('cover_image_url', res.data.file_url);
      toast.success('Kapak görseli yüklendi — kaydetmeyi unutmayın');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Yükleme hatası');
    } finally {
      setCoverUploading(false);
      if (coverFileRef.current) coverFileRef.current.value = '';
    }
  };

  const handleGalleryUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0 || !editing) return;

    setGalleryUploading(true);
    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        const res = await api.post(`/media/upload?school_id=${editing.id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setGalleryImages((prev) => [...prev, { id: res.data.id, file_url: res.data.file_url, file_size: res.data.file_size }]);
      }
      toast.success('Görseller yüklendi');
      fetchSchools();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Yükleme hatası');
    } finally {
      setGalleryUploading(false);
      if (galleryFileRef.current) galleryFileRef.current.value = '';
    }
  };

  const handleDeleteGalleryImage = async (mediaId) => {
    if (!confirm('Bu görseli galeriden silmek istediğinize emin misiniz?')) return;
    try {
      await api.delete(`/media/${mediaId}`);
      setGalleryImages((prev) => prev.filter((m) => m.id !== mediaId));
      toast.success('Görsel silindi');
      fetchSchools();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Hata oluştu');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await api.put(`/schools/${editing.id}`, form);
        toast.success('Okul güncellendi');
      } else {
        await api.post('/schools/', form);
        toast.success('Okul oluşturuldu');
      }
      setModalOpen(false);
      fetchSchools();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Hata oluştu');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Bu okulu silmek istediğinize emin misiniz?')) return;
    try {
      await api.delete(`/schools/${id}`);
      toast.success('Okul silindi');
      fetchSchools();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Hata oluştu');
    }
  };

  const openManagerModal = async (school) => {
    setSelectedSchool(school);
    setManagerUserId('');
    try {
      const res = await api.get('/schools/managers/available');
      setManagers(res.data);
    } catch {}
    await fetchAssignedManagers(school.id);
    setManagerModalOpen(true);
  };

  const fetchAssignedManagers = async (schoolId) => {
    try {
      const res = await api.get(`/schools/${schoolId}/managers`);
      setAssignedManagers(res.data);
    } catch {
      setAssignedManagers([]);
    }
  };

  const assignManager = async () => {
    if (!managerUserId) return;
    try {
      await api.post(`/schools/${selectedSchool.id}/managers`, { user_id: managerUserId });
      toast.success('Eğitmen atandı');
      setManagerUserId('');
      fetchAssignedManagers(selectedSchool.id);
      fetchSchools();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Hata oluştu');
    }
  };

  const removeManager = async (userId) => {
    if (!window.confirm('Bu eğitmenin okul ataması kaldırılsın mi?')) return;
    try {
      await api.delete(`/schools/${selectedSchool.id}/managers/${userId}`);
      toast.success('Eğitmen ataması kaldırıldı');
      fetchAssignedManagers(selectedSchool.id);
      fetchSchools();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Hata oluştu');
    }
  };

  const update = (f, v) => setForm((p) => ({ ...p, [f]: v }));

  if (loading) return <LoadingSpinner />;

  // USER view: school list (read-only, no enrollment buttons)
  if (user?.role === 'USER') {
    return (
      <div>
        <PageHeader title="Okullar" subtitle={`${total} okul`} />

        {schools.length === 0 ? (
          <EmptyState message="Henüz okul eklenmemiş" icon={School} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {schools.map((s) => (
              <div key={s.id} className="card">
                <div className="mb-2">
                  <h3 className="font-semibold text-lg">{s.name}</h3>
                  {s.address && <p className="text-sm text-dark-400 mt-1">{s.address}</p>}
                  {s.description && <p className="text-sm text-dark-500 mt-2">{s.description}</p>}
                  {s.phone && <p className="text-sm text-dark-400 mt-1">Tel: {s.phone}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // MEMBER view: school list with enrollment request buttons
  if (isMember) {
    return (
      <div>
        <PageHeader title="Okullar" subtitle="Bir okula katılma talebi oluşturun" />

        {schools.length === 0 ? (
          <EmptyState message="Henüz okul eklenmemiş" icon={School} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {schools.map((s) => {
              const enrollment = getEnrollmentStatus(s.id);
              return (
                <div key={s.id} className="card">
                  <div className="mb-4">
                    <h3 className="font-semibold text-lg">{s.name}</h3>
                    {s.address && <p className="text-sm text-dark-400 mt-1">{s.address}</p>}
                    {s.description && <p className="text-sm text-dark-500 mt-2">{s.description}</p>}
                    {s.phone && <p className="text-sm text-dark-400 mt-1">Tel: {s.phone}</p>}
                  </div>
                  <div>
                    {!enrollment && (
                      <button
                        onClick={() => handleEnrollmentRequest(s.id)}
                        className="btn-primary w-full flex items-center justify-center gap-2"
                      >
                        <UserPlus size={16} /> Katılma Talebi Oluştur
                      </button>
                    )}
                    {enrollment && enrollment.status === 'PENDING' && (
                      <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
                        <Clock size={16} /> <span className="text-sm font-medium">Talep Gönderildi - Onay Bekleniyor</span>
                      </div>
                    )}
                    {enrollment && enrollment.status === 'APPROVED' && (
                      <div className="flex items-center gap-2 text-green-600 bg-green-50 px-3 py-2 rounded-lg">
                        <CheckCircle size={16} /> <span className="text-sm font-medium">Onaylandı</span>
                      </div>
                    )}
                    {enrollment && enrollment.status === 'REJECTED' && (
                      <div className="flex items-center gap-2 text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                        <XCircle size={16} /> <span className="text-sm font-medium">Reddedildi</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Admin view: full school management
  return (
    <div>
      <PageHeader title="Okullar" subtitle={`${total} okul`}>
        <button onClick={openCreate} className="btn-primary"><Plus size={18} /> Yeni Okul</button>
      </PageHeader>

      {schools.length === 0 ? (
        <EmptyState message="Henüz okul eklenmemiş" icon={School} />
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Ad</th>
                <th className="hidden md:table-cell">Adres</th>
                <th className="hidden sm:table-cell">Telefon</th>
                <th>Durum</th>
                <th>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {schools.map((s) => (
                <tr key={s.id}>
                  <td className="font-medium">{s.name}</td>
                  <td className="hidden md:table-cell text-dark-500">{s.address || '-'}</td>
                  <td className="hidden sm:table-cell text-dark-500">{s.phone || '-'}</td>
                  <td>
                    <span className={`badge ${s.is_active ? 'badge-success' : 'badge-danger'}`}>
                      {s.is_active ? 'Aktif' : 'Pasif'}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <button onClick={() => openManagerModal(s)} className="text-blue-600 hover:text-blue-800" title="Eğitmen Ata">
                        <UserPlus size={16} />
                      </button>
                      <button onClick={() => openEdit(s)} className="text-dark-500 hover:text-dark-700" title="Düzenle">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDelete(s.id)} className="text-red-500 hover:text-red-700" title="Sil">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Okul Düzenle' : 'Yeni Okul'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Okul Adı *</label>
            <input value={form.name} onChange={(e) => update('name', e.target.value)} className="input-field" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Adres</label>
            <textarea value={form.address} onChange={(e) => update('address', e.target.value)} className="input-field" rows={2} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Ders Saatleri / Kısa Açıklama</label>
            <textarea value={form.description} onChange={(e) => update('description', e.target.value)} className="input-field" rows={2} placeholder="örn. Salı ve Perşembe 21:00 – 22:30" />
            <p className="text-xs text-dark-400 mt-1">Hem panelde hem tanıtım sitesindeki okul kartında gösterilir.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Telefon</label>
              <input value={form.phone} onChange={(e) => update('phone', e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">E-posta</label>
              <input value={form.email} onChange={(e) => update('email', e.target.value)} className="input-field" />
            </div>
          </div>
          <div className="pt-2 border-t border-dark-100">
            <p className="text-xs font-semibold text-dark-400 uppercase mb-2">Tanıtım Sitesi İçeriği</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Kapak Görseli</label>
            {form.cover_image_url && (
              <div className="relative inline-block mb-2">
                <img src={form.cover_image_url} alt="" className="h-28 w-auto rounded-lg border border-dark-700 object-cover" />
                <button
                  type="button"
                  onClick={() => update('cover_image_url', '')}
                  className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full"
                  title="Kapak görselini kaldır"
                >
                  <X size={12} />
                </button>
              </div>
            )}
            <div className="flex gap-2 items-center">
              <label className={`btn-secondary btn-sm cursor-pointer inline-flex items-center gap-1.5 shrink-0 ${coverUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                <Upload size={14} /> {coverUploading ? 'Yükleniyor...' : 'Dosya Seç'}
                <input ref={coverFileRef} type="file" accept="image/*" onChange={handleCoverUpload} className="hidden" />
              </label>
              <input value={form.cover_image_url} onChange={(e) => update('cover_image_url', e.target.value)} className="input-field" placeholder="veya https://... adresi yapıştırın" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Galeri</label>
            {editing ? (
              <>
                {galleryImages.length > 0 && (
                  <div className="grid grid-cols-4 gap-2 mb-2">
                    {galleryImages.map((m) => (
                      <div key={m.id} className="relative group">
                        <img src={m.file_url} alt="" className="h-20 w-full rounded-lg border border-dark-700 object-cover" />
                        <button
                          type="button"
                          onClick={() => handleDeleteGalleryImage(m.id)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Galeriden kaldır"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <label className={`btn-secondary btn-sm cursor-pointer inline-flex items-center gap-1.5 ${galleryUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                  <Upload size={14} /> {galleryUploading ? 'Yükleniyor...' : 'Dosya Seç'}
                  <input ref={galleryFileRef} type="file" accept="image/*" multiple onChange={handleGalleryUpload} className="hidden" />
                </label>
              </>
            ) : (
              <p className="text-xs text-dark-400">Galeriye görsel eklemek için önce okulu oluşturup tekrar düzenleyin.</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Ek Tanıtım Metni (opsiyonel)</label>
            <textarea value={form.long_description} onChange={(e) => update('long_description', e.target.value)} className="input-field" rows={4} />
            <p className="text-xs text-dark-400 mt-1">Sadece tanıtım sitesinde, ders saatlerinin altında görünür. Ders saatlerini burada tekrarlamayın.</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">YouTube Tanıtım Linki</label>
            <input value={form.youtube_url} onChange={(e) => update('youtube_url', e.target.value)} className="input-field" placeholder="https://www.youtube.com/watch?v=..." />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">İptal</button>
            <button type="submit" className="btn-primary">{editing ? 'Güncelle' : 'Oluştur'}</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={managerModalOpen} onClose={() => setManagerModalOpen(false)} title="Eğitmen Ata">
        <div className="space-y-4">
          <p className="text-sm text-dark-500">
            <strong>{selectedSchool?.name}</strong> okuluna eğitmen atayin.
          </p>

          {assignedManagers.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-dark-400 uppercase mb-2">Atanmış Eğitmenler</p>
              <div className="space-y-2">
                {assignedManagers.map((m) => (
                  <div key={m.id} className="flex items-center justify-between px-3 py-2 bg-dark-50 rounded-lg">
                    <span className="text-sm">{m.first_name} {m.last_name} ({m.email})</span>
                    <button onClick={() => removeManager(m.id)} className="text-red-500 hover:text-red-700" title="Atamayı Kaldır">
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="text-xs font-semibold text-dark-400 uppercase mb-2">Yeni Eğitmen Ata</p>
            <select value={managerUserId} onChange={(e) => setManagerUserId(e.target.value)} className="select-field">
              <option value="">Eğitmen seçin...</option>
              {managers.map((m) => (
                <option key={m.id} value={m.id}>{m.first_name} {m.last_name} ({m.email})</option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3">
            <button onClick={() => setManagerModalOpen(false)} className="btn-secondary">Kapat</button>
            <button onClick={assignManager} className="btn-primary" disabled={!managerUserId}>Ata</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
