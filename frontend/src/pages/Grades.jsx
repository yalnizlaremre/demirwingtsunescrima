import { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import LoadingSpinner from '../components/LoadingSpinner';
import { Plus, Shield, ArrowUpDown } from 'lucide-react';

export default function Grades() {
  const [requirements, setRequirements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reqModalOpen, setReqModalOpen] = useState(false);
  const [changeModalOpen, setChangeModalOpen] = useState(false);
  const [tab, setTab] = useState('WING_TSUN');
  const [students, setStudents] = useState([]);
  const [reqForm, setReqForm] = useState({ branch: 'WING_TSUN', grade: 1, grade_name: '', required_hours: 0 });
  const [changeForm, setChangeForm] = useState({ student_id: '', branch: 'WING_TSUN', new_grade: 1, note: '' });

  useEffect(() => {
    fetchRequirements();
    api.get('/students/?limit=200').then(r => setStudents(r.data.items || [])).catch(() => {});
  }, []);

  const fetchRequirements = async () => {
    try {
      const res = await api.get('/grades/requirements');
      setRequirements(res.data);
    } catch {} finally { setLoading(false); }
  };

  const handleCreateReq = async (e) => {
    e.preventDefault();
    try {
      await api.post('/grades/requirements', { ...reqForm, grade: parseInt(reqForm.grade), required_hours: parseFloat(reqForm.required_hours) });
      toast.success('Derece gereksinimi eklendi');
      setReqModalOpen(false);
      fetchRequirements();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Hata olustu');
    }
  };

  const handleGradeChange = async (e) => {
    e.preventDefault();
    if (!changeForm.note.trim()) { toast.error('Not alani zorunludur'); return; }
    try {
      await api.post('/grades/manual-change', { ...changeForm, new_grade: parseInt(changeForm.new_grade) });
      toast.success('Derece guncellendi');
      setChangeModalOpen(false);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Hata olustu');
    }
  };

  const filtered = requirements.filter(r => r.branch === tab);

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader title="Dereceler & Saat Yonetimi" subtitle="Derece gereksinimleri ve manuel duzenleme">
        <button onClick={() => setChangeModalOpen(true)} className="btn-primary"><ArrowUpDown size={18} /> Derece Degistir</button>
        <button onClick={() => setReqModalOpen(true)} className="btn-secondary"><Plus size={18} /> Gereksinim Ekle</button>
      </PageHeader>

      <div className="flex gap-2 mb-6">
        <button onClick={() => setTab('WING_TSUN')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'WING_TSUN' ? 'bg-primary-600 text-white' : 'bg-dark-200 text-dark-700 hover:bg-dark-300'}`}>
          Wing Tsun
        </button>
        <button onClick={() => setTab('ESCRIMA')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'ESCRIMA' ? 'bg-emerald-600 text-white' : 'bg-dark-200 text-dark-700 hover:bg-dark-300'}`}>
          Escrima
        </button>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Derece</th>
              <th>Ad</th>
              <th>Gereken Saat</th>
              <th>Tur</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => (
              <tr key={r.id}>
                <td className="font-bold text-lg">{r.grade}</td>
                <td className="font-medium">{r.grade_name}</td>
                <td>{r.required_hours}h</td>
                <td>
                  <span className={`badge ${r.grade <= 12 ? 'badge-info' : 'badge-warning'}`}>
                    {r.grade <= 12 ? 'Ogrenci' : 'Usta'}
                  </span>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={4} className="text-center text-dark-400 py-8">Henuz gereksinim eklenmemis</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add Requirement Modal */}
      <Modal isOpen={reqModalOpen} onClose={() => setReqModalOpen(false)} title="Derece Gereksinimi Ekle">
        <form onSubmit={handleCreateReq} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Brans</label>
              <select value={reqForm.branch} onChange={(e) => setReqForm(p => ({ ...p, branch: e.target.value }))} className="select-field">
                <option value="WING_TSUN">Wing Tsun</option>
                <option value="ESCRIMA">Escrima</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Derece (1-17)</label>
              <input type="number" min={1} max={17} value={reqForm.grade} onChange={(e) => setReqForm(p => ({ ...p, grade: e.target.value }))} className="input-field" required />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Derece Adi</label>
            <input value={reqForm.grade_name} onChange={(e) => setReqForm(p => ({ ...p, grade_name: e.target.value }))} className="input-field" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Gereken Saat</label>
            <input type="number" step="0.5" value={reqForm.required_hours} onChange={(e) => setReqForm(p => ({ ...p, required_hours: e.target.value }))} className="input-field" required />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setReqModalOpen(false)} className="btn-secondary">Iptal</button>
            <button type="submit" className="btn-primary">Ekle</button>
          </div>
        </form>
      </Modal>

      {/* Manual Grade Change Modal */}
      <Modal isOpen={changeModalOpen} onClose={() => setChangeModalOpen(false)} title="Manuel Derece Degistir">
        <form onSubmit={handleGradeChange} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Ogrenci *</label>
            <select value={changeForm.student_id} onChange={(e) => setChangeForm(p => ({ ...p, student_id: e.target.value }))} className="select-field" required>
              <option value="">Ogrenci secin...</option>
              {students.map(s => <option key={s.id} value={s.id}>{s.user_name || s.user_email}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Brans</label>
              <select value={changeForm.branch} onChange={(e) => setChangeForm(p => ({ ...p, branch: e.target.value }))} className="select-field">
                <option value="WING_TSUN">Wing Tsun</option>
                <option value="ESCRIMA">Escrima</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Yeni Derece</label>
              <input type="number" min={1} max={17} value={changeForm.new_grade} onChange={(e) => setChangeForm(p => ({ ...p, new_grade: e.target.value }))} className="input-field" required />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Not (Zorunlu) *</label>
            <textarea value={changeForm.note} onChange={(e) => setChangeForm(p => ({ ...p, note: e.target.value }))} className="input-field" rows={3} required placeholder="Degisiklik sebebini yazin..." />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setChangeModalOpen(false)} className="btn-secondary">Iptal</button>
            <button type="submit" className="btn-primary">Degistir</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
