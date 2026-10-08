import { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import PasswordInput from '../components/PasswordInput';
import { Plus, Edit2, Trash2, Users as UsersIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const ADMIN_PERMISSIONS = [
  { key: 'manage_schools', label: 'Okul yönetimi' },
  { key: 'manage_site_content', label: 'Site içeriği yönetimi' },
  { key: 'manage_events', label: 'Etkinlik yönetimi' },
  { key: 'manage_products', label: 'Ürün/mağaza yönetimi' },
  { key: 'manage_grades', label: 'Derece gereksinimleri ve manuel derece değişikliği' },
  { key: 'manage_users', label: 'Kullanıcı yönetimi (riskli)' },
];

export default function Users() {
  const { isAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [roleFilter, setRoleFilter] = useState('');
  const [search, setSearch] = useState('');
  const [schools, setSchools] = useState([]);
  const [form, setForm] = useState({
    email: '', password: '', first_name: '', last_name: '', phone: '',
    role: 'USER', instructor_title: '', can_upload_media: false,
    bio: '', display_order: 0, is_featured_instructor: false, instagram_url: '',
    student_id: '', school_id: '', new_student_school_id: '', extra_permissions: [],
  });

  useEffect(() => {
    fetchUsers();
    api.get('/schools/?limit=100').then(r => setSchools(r.data.items || [])).catch(() => {});
  }, []);

  const fetchUsers = async (r = '', s = '') => {
    setLoading(true);
    try {
      let url = '/users/?limit=100';
      if (r) url += `&role=${r}`;
      if (s) url += `&search=${encodeURIComponent(s)}`;
      const res = await api.get(url);
      setUsers(res.data.items);
      setTotal(res.data.total);
    } catch {} finally { setLoading(false); }
  };

  const openCreate = () => {
    setEditing(null);
    setForm({
      email: '', password: '', first_name: '', last_name: '', phone: '',
      role: 'USER', instructor_title: '', can_upload_media: false,
      bio: '', display_order: 0, is_featured_instructor: false, extra_permissions: [],
    });
    setModalOpen(true);
  };

  const openEdit = (u) => {
    setEditing(u);
    setForm({
      email: u.email, password: '', first_name: u.first_name, last_name: u.last_name, phone: u.phone || '',
      role: u.role, instructor_title: u.instructor_title || '', can_upload_media: u.can_upload_media,
      bio: u.bio || '', display_order: u.display_order || 0, is_featured_instructor: u.is_featured_instructor || false,
      instagram_url: u.instagram_url || '', public_title: u.public_title || '', student_id: u.student_id || '', school_id: u.school_id || '',
      new_student_school_id: '', extra_permissions: u.extra_permissions || [],
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        const payload = { ...form };
        delete payload.email;
        delete payload.password;
        delete payload.student_id;
        delete payload.school_id;
        delete payload.new_student_school_id;
        if (!isAdmin) delete payload.extra_permissions;
        if (!payload.instructor_title) payload.instructor_title = null;
        await api.put(`/users/${editing.id}`, payload);
        if (form.role === 'USER' && editing.student_id && form.school_id && form.school_id !== editing.school_id) {
          await api.put(`/students/${editing.student_id}`, { school_id: form.school_id });
        }
        if (!editing.student_id && form.new_student_school_id && !['MANAGER', 'ADMIN', 'SUPER_ADMIN'].includes(editing.role)) {
          await api.post('/students/', { user_id: editing.id, school_id: form.new_student_school_id });
        }
        toast.success('Kullanıcı güncellendi');
      } else {
        await api.post('/users/', form);
        toast.success('Kullanıcı oluşturuldu');
      }
      setModalOpen(false);
      fetchUsers(roleFilter, search);
    } catch (err) { toast.error(err.response?.data?.detail || 'Hata oluştu'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Bu kullanıcıyı silmek istediğinize emin misiniz?')) return;
    try {
      await api.delete(`/users/${id}`);
      toast.success('Kullanıcı silindi');
      fetchUsers(roleFilter, search);
    } catch (err) { toast.error(err.response?.data?.detail || 'Hata'); }
  };

  const getRoleBadge = (role) => {
    const map = {
      SUPER_ADMIN: { label: 'Super Admin', class: 'bg-purple-100 text-purple-800' },
      ADMIN: { label: 'Admin', class: 'bg-blue-100 text-blue-800' },
      MANAGER: { label: 'Eğitmen', class: 'bg-emerald-100 text-emerald-800' },
      USER: { label: 'Öğrenci', class: 'bg-amber-100 text-amber-800' },
      MEMBER: { label: 'Üye', class: 'bg-dark-100 text-dark-600' },
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
      <PageHeader title="Kullanıcılar" subtitle={`${total} kullanıcı`}>
        <button onClick={openCreate} className="btn-primary"><Plus size={18} /> Yeni Kullanıcı</button>
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
          <option value="">Tüm Roller</option>
          <option value="SUPER_ADMIN">Super Admin</option>
          <option value="ADMIN">Admin</option>
          <option value="MANAGER">Eğitmen</option>
          <option value="USER">Öğrenci</option>
          <option value="MEMBER">Üye</option>
        </select>
      </div>

      {users.length === 0 ? (
        <EmptyState message="Kullanıcı bulunamadı" icon={UsersIcon} />
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Ad Soyad</th>
                <th className="hidden sm:table-cell">E-posta</th>
                <th>Rol</th>
                <th className="hidden md:table-cell">Durum</th>
                <th>İşlemler</th>
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
                    {(isAdmin || !['ADMIN', 'SUPER_ADMIN'].includes(u.role)) && (
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(u)} className="text-dark-500 hover:text-dark-700"><Edit2 size={16} /></button>
                        <button onClick={() => handleDelete(u.id)} className="text-red-500 hover:text-red-700"><Trash2 size={16} /></button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Kullanıcı Düzenle' : 'Yeni Kullanıcı'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {!editing && (
            <div>
              <label className="block text-sm font-medium mb-1">E-posta *</label>
              <input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} className="input-field" required />
            </div>
          )}
          {!editing && (
            <div>
              <label className="block text-sm font-medium mb-1">Şifre *</label>
              <PasswordInput value={form.password} onChange={(e) => update('password', e.target.value)} className="input-field" required minLength={6} />
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
              <option value="MEMBER">Üye</option>
              <option value="USER">Öğrenci</option>
              <option value="MANAGER">Eğitmen (Manager)</option>
              {isAdmin && <option value="ADMIN">Admin</option>}
              {isAdmin && <option value="SUPER_ADMIN">Super Admin</option>}
            </select>
          </div>
          {editing && form.role === 'USER' && editing.student_id && (
            <div>
              <label className="block text-sm font-medium mb-1">Okul</label>
              <select value={form.school_id} onChange={(e) => update('school_id', e.target.value)} className="select-field">
                {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          )}
          {editing && !editing.student_id && !['MANAGER', 'ADMIN', 'SUPER_ADMIN'].includes(editing.role) && (
            <div>
              <label className="block text-sm font-medium mb-1">Okula Öğrenci Olarak Kaydet</label>
              <select value={form.new_student_school_id} onChange={(e) => update('new_student_school_id', e.target.value)} className="select-field">
                <option value="">Şimdilik atama...</option>
                {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <p className="text-xs text-dark-400 mt-1">Bir okul seçip Güncelle'ye bastığınızda bu kullanıcı için öğrenci kaydı oluşturulur.</p>
            </div>
          )}
          {form.role === 'MANAGER' && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">Unvan</label>
                <select value={form.instructor_title} onChange={(e) => update('instructor_title', e.target.value)} className="select-field">
                  <option value="">Seçin...</option>
                  <option value="SIFU">SIFU</option>
                  <option value="SIHING">SIHING</option>
                </select>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.can_upload_media} onChange={(e) => update('can_upload_media', e.target.checked)} className="w-4 h-4" />
                <span className="text-sm">Medya yükleme yetkisi</span>
              </label>
              <div className="pt-2 border-t border-dark-100">
                <p className="text-xs font-semibold text-dark-400 uppercase mb-2">Tanıtım Sitesi (Eğitmenler Sayfası)</p>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_featured_instructor} onChange={(e) => update('is_featured_instructor', e.target.checked)} className="w-4 h-4" />
                <span className="text-sm">Tanıtım sitesinde öne çıkan eğitmen olarak göster</span>
              </label>
              <div>
                <label className="block text-sm font-medium mb-1">Sitedeki Unvan (opsiyonel)</label>
                <input value={form.public_title} onChange={(e) => update('public_title', e.target.value)} className="input-field" placeholder="örn. Baş Eğitmen" maxLength={100} />
                <p className="text-xs text-dark-400 mt-1">Eğitmen kartında isminin üstünde vurgulu gösterilir.</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Kısa Biyografi</label>
                <textarea value={form.bio} onChange={(e) => update('bio', e.target.value)} className="input-field" rows={3} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Sıralama (küçük sayı önce görünür)</label>
                <input type="number" value={form.display_order} onChange={(e) => update('display_order', parseInt(e.target.value, 10) || 0)} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Instagram Linki</label>
                <input value={form.instagram_url} onChange={(e) => update('instagram_url', e.target.value)} className="input-field" placeholder="https://instagram.com/..." />
              </div>
              {isAdmin && (
                <div className="pt-2 border-t border-dark-100">
                  <p className="text-xs font-semibold text-dark-400 uppercase mb-2">Admin Yetkileri</p>
                  {ADMIN_PERMISSIONS.map((p) => (
                    <label key={p.key} className="flex items-center gap-2 cursor-pointer mb-1.5">
                      <input
                        type="checkbox"
                        checked={form.extra_permissions.includes(p.key)}
                        onChange={(e) => update('extra_permissions', e.target.checked
                          ? [...form.extra_permissions, p.key]
                          : form.extra_permissions.filter((k) => k !== p.key))}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">{p.label}</span>
                    </label>
                  ))}
                </div>
              )}
            </>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">İptal</button>
            <button type="submit" className="btn-primary">{editing ? 'Güncelle' : 'Oluştur'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
