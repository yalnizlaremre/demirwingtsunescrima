import { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { Plus, Edit2, Trash2, Users as UsersIcon } from 'lucide-react';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [roleFilter, setRoleFilter] = useState('');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    email: '', password: '', first_name: '', last_name: '', phone: '',
    role: 'USER', instructor_title: '', can_upload_media: false,
  });

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async (r = '', s = '') => {
    setLoading(true);
    try {
      let url = '/users/?limit=100';
      if (r) url += `&role=${r}`;
      if (s) url += `&search=${s}`;
      const res = await api.get(url);
      setUsers(res.data.items);
      setTotal(res.data.total);
    } catch {} finally { setLoading(false); }
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ email: '', password: '', first_name: '', last_name: '', phone: '', role: 'USER', instructor_title: '', can_upload_media: false });
    setModalOpen(true);
  };

  const openEdit = (u) => {
    setEditing(u);
    setForm({ email: u.email, password: '', first_name: u.first_name, last_name: u.last_name, phone: u.phone || '', role: u.role, instructor_title: u.instructor_title || '', can_upload_media: u.can_upload_media });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        const payload = { ...form };
        delete payload.email;
        delete payload.password;
        if (!payload.instructor_title) payload.instructor_title = null;
        await api.put(`/users/${editing.id}`, payload);
        toast.success('Kullanici guncellendi');
      } else {
        await api.post('/users/', form);
        toast.success('Kullanici olusturuldu');
      }
      setModalOpen(false);
      fetchUsers(roleFilter, search);
    } catch (err) { toast.error(err.response?.data?.detail || 'Hata olustu'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Bu kullaniciyi silmek istediginize emin misiniz?')) return;
    try {
      await api.delete(`/users/${id}`);
      toast.success('Kullanici silindi');
      fetchUsers(roleFilter, search);
    } catch (err) { toast.error(err.response?.data?.detail || 'Hata'); }
  };

  const getRoleBadge = (role) => {
    const map = {
      SUPER_ADMIN: { label: 'Super Admin', class: 'bg-purple-100 text-purple-800' },
      ADMIN: { label: 'Admin', class: 'bg-blue-100 text-blue-800' },
      MANAGER: { label: 'Egitmen', class: 'bg-emerald-100 text-emerald-800' },
      USER: { label: 'Ogrenci', class: 'bg-amber-100 text-amber-800' },
    };
    const r = map[role] || map.USER;
    return <span className={`badge ${r.class}`}>{r.label}</span>;
  };

  const getStatusBadge = (status) => {
    const map = { ACTIVE: 'badge-success', PENDING: 'badge-warning', INACTIVE: 'badge-danger' };
    const labels = { ACTIVE: 'Aktif', PENDING: 'Bekliyor', INACTIVE: 'Pasif' };
    return <span className={`badge ${map[status]}`}>{labels[status]}</span>;
  };

  const update = (f, v) => setForm(p => ({ ...p, [f]: v }));

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader title="Kullanicilar" subtitle={`${total} kullanici`}>
        <button onClick={openCreate} className="btn-primary"><Plus size={18} /> Yeni Kullanici</button>
      </PageHeader>

      <div className="flex flex-wrap gap-3 mb-6">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && fetchUsers(roleFilter, search)}
          placeholder="Ara..."
          className="input-field w-auto"
        />
        <select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); fetchUsers(e.target.value, search); }} className="select-field w-auto">
          <option value="">Tum Roller</option>
          <option value="SUPER_ADMIN">Super Admin</option>
          <option value="ADMIN">Admin</option>
          <option value="MANAGER">Egitmen</option>
          <option value="USER">Ogrenci</option>
        </select>
      </div>

      {users.length === 0 ? (
        <EmptyState message="Kullanici bulunamadi" icon={UsersIcon} />
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Ad Soyad</th>
                <th className="hidden sm:table-cell">E-posta</th>
                <th>Rol</th>
                <th className="hidden md:table-cell">Durum</th>
                <th>Islemler</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td>
                    <p className="font-medium">{u.first_name} {u.last_name}</p>
                    {u.instructor_title && <span className="text-xs text-dark-400">{u.instructor_title}</span>}
                  </td>
                  <td className="hidden sm:table-cell text-dark-500">{u.email}</td>
                  <td>{getRoleBadge(u.role)}</td>
                  <td className="hidden md:table-cell">{getStatusBadge(u.status)}</td>
                  <td>
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(u)} className="text-dark-500 hover:text-dark-700"><Edit2 size={16} /></button>
                      <button onClick={() => handleDelete(u.id)} className="text-red-500 hover:text-red-700"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Kullanici Duzenle' : 'Yeni Kullanici'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {!editing && (
            <div>
              <label className="block text-sm font-medium mb-1">E-posta *</label>
              <input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} className="input-field" required />
            </div>
          )}
          {!editing && (
            <div>
              <label className="block text-sm font-medium mb-1">Sifre *</label>
              <input type="password" value={form.password} onChange={(e) => update('password', e.target.value)} className="input-field" required minLength={6} />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Ad *</label>
              <input value={form.first_name} onChange={(e) => update('first_name', e.target.value)} className="input-field" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Soyad *</label>
              <input value={form.last_name} onChange={(e) => update('last_name', e.target.value)} className="input-field" required />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Telefon</label>
            <input value={form.phone} onChange={(e) => update('phone', e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Rol</label>
            <select value={form.role} onChange={(e) => update('role', e.target.value)} className="select-field">
              <option value="USER">Ogrenci</option>
              <option value="MANAGER">Egitmen (Manager)</option>
              <option value="ADMIN">Admin</option>
              <option value="SUPER_ADMIN">Super Admin</option>
            </select>
          </div>
          {form.role === 'MANAGER' && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">Unvan</label>
                <select value={form.instructor_title} onChange={(e) => update('instructor_title', e.target.value)} className="select-field">
                  <option value="">Secin...</option>
                  <option value="SIFU">SIFU</option>
                  <option value="SIHING">SIHING</option>
                </select>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.can_upload_media} onChange={(e) => update('can_upload_media', e.target.checked)} className="w-4 h-4" />
                <span className="text-sm">Medya yukleme yetkisi</span>
              </label>
            </>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Iptal</button>
            <button type="submit" className="btn-primary">{editing ? 'Guncelle' : 'Olustur'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
