import { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { Plus, BookOpen, Users, ClipboardCheck, Calendar, Repeat, Trash2, RefreshCw } from 'lucide-react';

const DAY_NAMES = {
  0: 'Pazartesi',
  1: 'Sali',
  2: 'Carsamba',
  3: 'Persembe',
  4: 'Cuma',
  5: 'Cumartesi',
  6: 'Pazar',
};

export default function Lessons() {
  const [activeTab, setActiveTab] = useState('lessons');
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

  // Schedule states
  const [schedules, setSchedules] = useState([]);
  const [scheduleTotal, setScheduleTotal] = useState(0);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    school_id: '', branch: 'WING_TSUN', lesson_type: 'GROUP',
    day_of_week: '1', start_time: '19:00',
    start_date: '', end_date: '', notes: '',
  });

  useEffect(() => {
    fetchLessons();
    fetchSchedules();
    api.get('/schools/?limit=100').then(r => setSchools(r.data.items || [])).catch(() => {});
  }, []);

  // -------- LESSONS --------
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

  // -------- SCHEDULES --------
  const fetchSchedules = async () => {
    setScheduleLoading(true);
    try {
      const res = await api.get('/lesson-schedules/?limit=100');
      setSchedules(res.data.items);
      setScheduleTotal(res.data.total);
    } catch {} finally { setScheduleLoading(false); }
  };

  const handleCreateSchedule = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/lesson-schedules/', {
        ...scheduleForm,
        day_of_week: parseInt(scheduleForm.day_of_week),
      });
      toast.success(res.data.message || 'Program olusturuldu');
      setScheduleModalOpen(false);
      setScheduleForm({
        school_id: '', branch: 'WING_TSUN', lesson_type: 'GROUP',
        day_of_week: '1', start_time: '19:00',
        start_date: '', end_date: '', notes: '',
      });
      fetchSchedules();
      fetchLessons();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Hata olustu');
    }
  };

  const handleDeleteSchedule = async (id) => {
    if (!confirm('Bu programi deaktif etmek istediginize emin misiniz? Katilimsiz gelecek dersler silinecek.')) return;
    try {
      const res = await api.delete(`/lesson-schedules/${id}`);
      toast.success(res.data.message || 'Program deaktif edildi');
      fetchSchedules();
      fetchLessons();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Hata');
    }
  };

  const handleExtendSchedule = async (id) => {
    const newEnd = prompt('Yeni bitis tarihi (YYYY-MM-DD):');
    if (!newEnd) return;
    try {
      const res = await api.post(`/lesson-schedules/${id}/generate?new_end_date=${newEnd}`);
      toast.success(res.data.message || 'Dersler olusturuldu');
      fetchSchedules();
      fetchLessons();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Hata');
    }
  };

  const update = (f, v) => setForm(p => ({ ...p, [f]: v }));
  const updateSchedule = (f, v) => setScheduleForm(p => ({ ...p, [f]: v }));

  if (loading) return <LoadingSpinner />;

  const tabs = [
    { id: 'lessons', label: 'Dersler', icon: BookOpen, count: total },
    { id: 'schedules', label: 'Ders Programi', icon: Repeat, count: scheduleTotal },
  ];

  return (
    <div>
      <PageHeader title="Dersler" subtitle="Ders yonetimi ve haftalik program">
        {activeTab === 'lessons' ? (
          <button onClick={() => setModalOpen(true)} className="btn-primary"><Plus size={18} /> Tek Ders Ekle</button>
        ) : (
          <button onClick={() => setScheduleModalOpen(true)} className="btn-primary"><Plus size={18} /> Yeni Program</button>
        )}
      </PageHeader>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-dark-100 p-1 rounded-xl">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-white text-dark-900 shadow-sm'
                  : 'text-dark-500 hover:text-dark-700'
              }`}
            >
              <Icon size={16} />
              {tab.label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                activeTab === tab.id ? 'bg-primary-100 text-primary-700' : 'bg-dark-200 text-dark-500'
              }`}>{tab.count}</span>
            </button>
          );
        })}
      </div>

      {/* LESSONS TAB */}
      {activeTab === 'lessons' && (
        <>
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
                    <th>Kaynak</th>
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
                        {l.schedule_id ? (
                          <span className="inline-flex items-center gap-1 text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
                            <Repeat size={10} /> Program
                          </span>
                        ) : (
                          <span className="text-xs text-dark-400">Manuel</span>
                        )}
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
        </>
      )}

      {/* SCHEDULES TAB */}
      {activeTab === 'schedules' && (
        <>
          {scheduleLoading ? (
            <LoadingSpinner />
          ) : schedules.length === 0 ? (
            <EmptyState message="Henuz ders programi olusturulmamis" icon={Repeat} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {schedules.map(s => (
                <div key={s.id} className={`card border-l-4 ${s.is_active ? 'border-l-emerald-500' : 'border-l-dark-300'}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-lg">
                        Her {DAY_NAMES[s.day_of_week]} - {s.start_time}
                      </h3>
                      <p className="text-sm text-dark-500">{s.school_name || '-'}</p>
                    </div>
                    <div className="flex gap-1">
                      <span className={`badge ${s.branch === 'WING_TSUN' ? 'badge-danger' : 'badge-info'}`}>
                        {s.branch === 'WING_TSUN' ? 'WT' : 'ESC'}
                      </span>
                      <span className={`badge ${s.lesson_type === 'GROUP' ? 'badge-info' : 'badge-warning'}`}>
                        {s.lesson_type === 'GROUP' ? 'Grup' : 'Ozel'}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
                    <div className="flex items-center gap-1.5 text-dark-500">
                      <Calendar size={14} />
                      <span>{new Date(s.start_date).toLocaleDateString('tr-TR')}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-dark-500">
                      <Calendar size={14} />
                      <span>{new Date(s.end_date).toLocaleDateString('tr-TR')}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-dark-100">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-primary-600">
                        {s.generated_lesson_count} ders
                      </span>
                      {s.is_active ? (
                        <span className="badge badge-success text-xs">Aktif</span>
                      ) : (
                        <span className="badge badge-danger text-xs">Pasif</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {s.is_active && (
                        <button
                          onClick={() => handleExtendSchedule(s.id)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
                          title="Tarihi Uzat"
                        >
                          <RefreshCw size={15} />
                        </button>
                      )}
                      {s.is_active && (
                        <button
                          onClick={() => handleDeleteSchedule(s.id)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                          title="Deaktif Et"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* New Single Lesson Modal */}
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
                <option value="PRIVATE">Ozel (2 saat)</option>
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

      {/* New Schedule Modal */}
      <Modal isOpen={scheduleModalOpen} onClose={() => setScheduleModalOpen(false)} title="Yeni Ders Programi">
        <form onSubmit={handleCreateSchedule} className="space-y-4">
          <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
            Haftalik tekrarlayan ders programi olusturun. Belirtilen tarih araligindaki tum dersler otomatik olusturulacaktir.
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Okul *</label>
            <select value={scheduleForm.school_id} onChange={(e) => updateSchedule('school_id', e.target.value)} className="select-field" required>
              <option value="">Secin...</option>
              {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Brans</label>
              <select value={scheduleForm.branch} onChange={(e) => updateSchedule('branch', e.target.value)} className="select-field">
                <option value="WING_TSUN">Wing Tsun</option>
                <option value="ESCRIMA">Escrima</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tur</label>
              <select value={scheduleForm.lesson_type} onChange={(e) => updateSchedule('lesson_type', e.target.value)} className="select-field">
                <option value="GROUP">Grup (2 saat)</option>
                <option value="PRIVATE">Ozel (2 saat)</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Gun *</label>
              <select value={scheduleForm.day_of_week} onChange={(e) => updateSchedule('day_of_week', e.target.value)} className="select-field" required>
                {Object.entries(DAY_NAMES).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Saat *</label>
              <input
                type="time"
                value={scheduleForm.start_time}
                onChange={(e) => updateSchedule('start_time', e.target.value)}
                className="input-field"
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Baslangic Tarihi *</label>
              <input
                type="date"
                value={scheduleForm.start_date}
                onChange={(e) => updateSchedule('start_date', e.target.value)}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Bitis Tarihi *</label>
              <input
                type="date"
                value={scheduleForm.end_date}
                onChange={(e) => updateSchedule('end_date', e.target.value)}
                className="input-field"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Not</label>
            <textarea value={scheduleForm.notes} onChange={(e) => updateSchedule('notes', e.target.value)} className="input-field" rows={2} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setScheduleModalOpen(false)} className="btn-secondary">Iptal</button>
            <button type="submit" className="btn-primary">Program Olustur</button>
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
