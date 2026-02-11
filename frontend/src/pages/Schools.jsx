import { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { Plus, Edit2, Trash2, UserPlus, School } from 'lucide-react';

export default function Schools() {
  const [schools, setSchools] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [managerModalOpen, setManagerModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [form, setForm] = useState({ name: '', address: '', description: '', phone: '', email: '' });
  const [managerUserId, setManagerUserId] = useState('');
  const [managers, setManagers] = useState([]);

  useEffect(() => { fetchSchools(); }, []);

  const fetchSchools = async () => {
    try {
      const res = await api.get('/schools/?limit=100');
      setSchools(res.data.items);
      setTotal(res.data.total);
    } catch {} finally { setLoading(false); }
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', address: '', description: '', phone: '', email: '' });
    setModalOpen(true);
  };

  const openEdit = (school) => {
    setEditing(school);
    setForm({ name: school.name, address: school.address || '', description: school.description || '', phone: school.phone || '', email: school.email || '' });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await api.put(`/schools/${editing.id}`, form);
        toast.success('Okul guncellendi');
      } else {
        await api.post('/schools/', form);
        toast.success('Okul olusturuldu');
      }
      setModalOpen(false);
      fetchSchools();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Hata olustu');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Bu okulu silmek istediginize emin misiniz?')) return;
    try {
      await api.delete(`/schools/${id}`);
      toast.success('Okul silindi');
      fetchSchools();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Hata olustu');
    }
  };

  const openManagerModal = async (school) => {
    setSelectedSchool(school);
    setManagerUserId('');
    try {
      const res = await api.get('/users/?role=MANAGER&limit=100');
      setManagers(res.data.items);
    } catch {}
    setManagerModalOpen(true);
  };

  const assignManager = async () => {
    if (!managerUserId) return;
    try {
      await api.post(`/schools/${selectedSchool.id}/managers`, { user_id: managerUserId });
      toast.success('Egitmen atandi');
      setManagerModalOpen(false);
      fetchSchools();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Hata olustu');
    }
  };

  const update = (f, v) => setForm((p) => ({ ...p, [f]: v }));

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader title="Okullar" subtitle={`${total} okul`}>
        <button onClick={openCreate} className="btn-primary"><Plus size={18} /> Yeni Okul</button>
      </PageHeader>

      {schools.length === 0 ? (
        <EmptyState message="Henuz okul eklenmemis" icon={School} />
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Ad</th>
                <th className="hidden md:table-cell">Adres</th>
                <th className="hidden sm:table-cell">Telefon</th>
                <th>Durum</th>
                <th>Islemler</th>
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
                      <button onClick={() => openManagerModal(s)} className="text-blue-600 hover:text-blue-800" title="Egitmen Ata">
                        <UserPlus size={16} />
                      </button>
                      <button onClick={() => openEdit(s)} className="text-dark-500 hover:text-dark-700" title="Duzenle">
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

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Okul Duzenle' : 'Yeni Okul'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Okul Adi *</label>
            <input value={form.name} onChange={(e) => update('name', e.target.value)} className="input-field" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Adres</label>
            <textarea value={form.address} onChange={(e) => update('address', e.target.value)} className="input-field" rows={2} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Aciklama</label>
            <textarea value={form.description} onChange={(e) => update('description', e.target.value)} className="input-field" rows={2} />
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
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Iptal</button>
            <button type="submit" className="btn-primary">{editing ? 'Guncelle' : 'Olustur'}</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={managerModalOpen} onClose={() => setManagerModalOpen(false)} title="Egitmen Ata">
        <div className="space-y-4">
          <p className="text-sm text-dark-500">
            <strong>{selectedSchool?.name}</strong> okuluna egitmen atayin.
          </p>
          <select value={managerUserId} onChange={(e) => setManagerUserId(e.target.value)} className="select-field">
            <option value="">Egitmen secin...</option>
            {managers.map((m) => (
              <option key={m.id} value={m.id}>{m.first_name} {m.last_name} ({m.email})</option>
            ))}
          </select>
          <div className="flex justify-end gap-3">
            <button onClick={() => setManagerModalOpen(false)} className="btn-secondary">Iptal</button>
            <button onClick={assignManager} className="btn-primary" disabled={!managerUserId}>Ata</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
