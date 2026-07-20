import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { GraduationCap, Search, Award, Edit2 } from 'lucide-react';

export default function Students() {
  const { isAdmin } = useAuth();
  const [students, setStudents] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [schoolFilter, setSchoolFilter] = useState('');
  const [schools, setSchools] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ school_id: '', date_of_birth: '', emergency_contact: '', emergency_phone: '', notes: '' });

  useEffect(() => {
    api.get('/schools/?limit=100').then(r => setSchools(r.data.items || [])).catch(() => {});
    fetchStudents();
  }, []);

  const openEdit = (s) => {
    setEditing(s);
    setForm({
      school_id: s.school_id || '',
      date_of_birth: s.date_of_birth || '',
      emergency_contact: s.emergency_contact || '',
      emergency_phone: s.emergency_phone || '',
      notes: s.notes || '',
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { date_of_birth: form.date_of_birth || null, emergency_contact: form.emergency_contact || null, emergency_phone: form.emergency_phone || null, notes: form.notes || null };
      if (isAdmin) payload.school_id = form.school_id;
      await api.put(`/students/${editing.id}`, payload);
      toast.success('Ogrenci guncellendi');
      setModalOpen(false);
      fetchStudents(search, schoolFilter);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Hata olustu');
    }
  };

  const fetchStudents = async (s = '', sid = '') => {
    setLoading(true);
    try {
      let url = '/students/?limit=100';
      if (s) url += `&search=${s}`;
      if (sid) url += `&school_id=${sid}`;
      const res = await api.get(url);
      setStudents(res.data.items);
      setTotal(res.data.total);
    } catch {} finally { setLoading(false); }
  };

  const handleSearch = () => fetchStudents(search, schoolFilter);

  const getGrade = (progress, branch) => {
    const p = progress?.find(pr => pr.branch === branch);
    return p ? p.current_grade : '-';
  };

  const getHours = (progress, branch) => {
    const p = progress?.find(pr => pr.branch === branch);
    return p ? p.completed_hours : 0;
  };

  return (
    <div>
      <PageHeader title="Ogrenciler" subtitle={`${total} ogrenci`} />

      <div className="card mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Ad veya soyad ile ara..."
              className="input-field"
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          {isAdmin && (
            <select value={schoolFilter} onChange={(e) => { setSchoolFilter(e.target.value); fetchStudents(search, e.target.value); }} className="select-field sm:w-48">
              <option value="">Tum Okullar</option>
              {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          )}
          <button onClick={handleSearch} className="btn-primary"><Search size={18} /> Ara</button>
        </div>
      </div>

      {loading ? <LoadingSpinner /> : students.length === 0 ? (
        <EmptyState message="Ogrenci bulunamadi" icon={GraduationCap} />
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Ad Soyad</th>
                <th>Okul</th>
                <th>WT Derece</th>
                <th>WT Saat</th>
                <th className="hidden md:table-cell">Esc Derece</th>
                <th className="hidden md:table-cell">Esc Saat</th>
                <th>Islemler</th>
              </tr>
            </thead>
            <tbody>
              {students.map(s => (
                <tr key={s.id}>
                  <td>
                    <div>
                      <p className="font-medium">{s.user_name || '-'}</p>
                      <p className="text-xs text-dark-400">{s.user_email}</p>
                    </div>
                  </td>
                  <td className="text-dark-500">{s.school_name || '-'}</td>
                  <td>
                    <span className="inline-flex items-center gap-1">
                      <Award size={14} className="text-primary-500" />
                      {getGrade(s.progress, 'WING_TSUN')}
                    </span>
                  </td>
                  <td>{getHours(s.progress, 'WING_TSUN')}h</td>
                  <td className="hidden md:table-cell">
                    <span className="inline-flex items-center gap-1">
                      <Award size={14} className="text-emerald-500" />
                      {getGrade(s.progress, 'ESCRIMA')}
                    </span>
                  </td>
                  <td className="hidden md:table-cell">{getHours(s.progress, 'ESCRIMA')}h</td>
                  <td>
                    <button onClick={() => openEdit(s)} className="text-dark-500 hover:text-dark-700"><Edit2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Ogrenci Duzenle">
        <form onSubmit={handleSubmit} className="space-y-4">
          {isAdmin && (
            <div>
              <label className="block text-sm font-medium mb-1">Okul</label>
              <select value={form.school_id} onChange={(e) => setForm(p => ({ ...p, school_id: e.target.value }))} className="select-field" required>
                {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium mb-1">Dogum Tarihi</label>
            <input type="date" value={form.date_of_birth} onChange={(e) => setForm(p => ({ ...p, date_of_birth: e.target.value }))} className="input-field" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Acil Durum Kisisi</label>
              <input value={form.emergency_contact} onChange={(e) => setForm(p => ({ ...p, emergency_contact: e.target.value }))} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Acil Durum Telefonu</label>
              <input value={form.emergency_phone} onChange={(e) => setForm(p => ({ ...p, emergency_phone: e.target.value }))} className="input-field" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Notlar</label>
            <textarea value={form.notes} onChange={(e) => setForm(p => ({ ...p, notes: e.target.value }))} className="input-field" rows={3} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Iptal</button>
            <button type="submit" className="btn-primary">Guncelle</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
