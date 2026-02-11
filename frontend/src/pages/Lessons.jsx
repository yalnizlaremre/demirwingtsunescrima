import { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { Plus, BookOpen, Users, ClipboardCheck } from 'lucide-react';

export default function Lessons() {
  const [lessons, setLessons] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [attModalOpen, setAttModalOpen] = useState(false);
  const [schools, setSchools] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [form, setForm] = useState({ school_id: '', branch: 'WING_TSUN', lesson_type: 'GROUP', lesson_date: '', notes: '' });

  useEffect(() => {
    fetchLessons();
    api.get('/schools/?limit=100').then(r => setSchools(r.data.items || [])).catch(() => {});
  }, []);

  const fetchLessons = async () => {
    try {
      const res = await api.get('/lessons/?limit=100');
      setLessons(res.data.items);
      setTotal(res.data.total);
    } catch {} finally { setLoading(false); }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/lessons/', { ...form, lesson_date: new Date(form.lesson_date).toISOString() });
      toast.success('Ders olusturuldu');
      setModalOpen(false);
      fetchLessons();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Hata olustu');
    }
  };

  const openAttendance = async (lesson) => {
    setSelectedLesson(lesson);
    setSelectedStudents([]);
    try {
      const res = await api.get(`/students/?school_id=${lesson.school_id}&limit=200`);
      setStudents(res.data.items);
    } catch {}
    setAttModalOpen(true);
  };

  const handleAttendance = async () => {
    if (selectedStudents.length === 0) return;
    try {
      await api.post('/attendance/', { lesson_id: selectedLesson.id, student_ids: selectedStudents });
      toast.success('Yoklama kaydedildi');
      setAttModalOpen(false);
      fetchLessons();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Hata olustu');
    }
  };

  const toggleStudent = (id) => {
    setSelectedStudents(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const update = (f, v) => setForm(p => ({ ...p, [f]: v }));

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader title="Dersler" subtitle={`${total} ders`}>
        <button onClick={() => setModalOpen(true)} className="btn-primary"><Plus size={18} /> Yeni Ders</button>
      </PageHeader>

      {lessons.length === 0 ? (
        <EmptyState message="Henuz ders eklenmemis" icon={BookOpen} />
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Tarih</th>
                <th>Brans</th>
                <th>Tur</th>
                <th className="hidden sm:table-cell">Okul</th>
                <th>Sure</th>
                <th>Katilim</th>
                <th>Islem</th>
              </tr>
            </thead>
            <tbody>
              {lessons.map(l => (
                <tr key={l.id}>
                  <td className="font-medium">{new Date(l.lesson_date).toLocaleDateString('tr-TR')}</td>
                  <td>
                    <span className={`badge ${l.branch === 'WING_TSUN' ? 'badge-danger' : 'badge-info'}`}>
                      {l.branch === 'WING_TSUN' ? 'WT' : 'ESC'}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${l.lesson_type === 'GROUP' ? 'badge-info' : 'badge-warning'}`}>
                      {l.lesson_type === 'GROUP' ? 'Grup' : 'Ozel'}
                    </span>
                  </td>
                  <td className="hidden sm:table-cell text-dark-500">{l.school_name || '-'}</td>
                  <td>{l.duration_hours}h</td>
                  <td>
                    <span className="inline-flex items-center gap-1">
                      <Users size={14} /> {l.attendance_count}
                    </span>
                  </td>
                  <td>
                    <button onClick={() => openAttendance(l)} className="text-blue-600 hover:text-blue-800" title="Yoklama">
                      <ClipboardCheck size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* New Lesson Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Yeni Ders">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Okul *</label>
            <select value={form.school_id} onChange={(e) => update('school_id', e.target.value)} className="select-field" required>
              <option value="">Secin...</option>
              {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Brans</label>
              <select value={form.branch} onChange={(e) => update('branch', e.target.value)} className="select-field">
                <option value="WING_TSUN">Wing Tsun</option>
                <option value="ESCRIMA">Escrima</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tur</label>
              <select value={form.lesson_type} onChange={(e) => update('lesson_type', e.target.value)} className="select-field">
                <option value="GROUP">Grup (2 saat)</option>
                <option value="PRIVATE">Ozel (3 saat)</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Tarih *</label>
            <input type="datetime-local" value={form.lesson_date} onChange={(e) => update('lesson_date', e.target.value)} className="input-field" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Not</label>
            <textarea value={form.notes} onChange={(e) => update('notes', e.target.value)} className="input-field" rows={2} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Iptal</button>
            <button type="submit" className="btn-primary">Olustur</button>
          </div>
        </form>
      </Modal>

      {/* Attendance Modal */}
      <Modal isOpen={attModalOpen} onClose={() => setAttModalOpen(false)} title="Yoklama" size="lg">
        <div className="space-y-4">
          <p className="text-sm text-dark-500">
            Derse katilan ogrencileri secin. Her ogrenciye <strong>{selectedLesson?.duration_hours}h</strong> saat otomatik eklenecektir.
          </p>
          <div className="max-h-72 overflow-y-auto border border-dark-200 rounded-lg divide-y">
            {students.map(s => (
              <label key={s.id} className="flex items-center gap-3 px-4 py-3 hover:bg-dark-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedStudents.includes(s.id)}
                  onChange={() => toggleStudent(s.id)}
                  className="w-4 h-4 text-primary-600 rounded"
                />
                <span className="text-sm font-medium">{s.user_name || 'Bilinmiyor'}</span>
              </label>
            ))}
            {students.length === 0 && <p className="text-sm text-dark-400 p-4">Bu okulda ogrenci yok</p>}
          </div>
          <div className="flex justify-between items-center pt-2">
            <span className="text-sm text-dark-500">{selectedStudents.length} ogrenci secildi</span>
            <div className="flex gap-3">
              <button onClick={() => setAttModalOpen(false)} className="btn-secondary">Iptal</button>
              <button onClick={handleAttendance} className="btn-primary" disabled={selectedStudents.length === 0}>Kaydet</button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
