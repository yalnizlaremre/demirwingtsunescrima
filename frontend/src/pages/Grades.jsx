import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { Plus, ArrowUpDown, Award, Check, X, ClipboardList } from 'lucide-react';

export default function Grades() {
  const { isAdmin, isManagerOrAbove, hasPermission } = useAuth();
  const canManageGrades = isAdmin || hasPermission('manage_grades');
  const [requirements, setRequirements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reqModalOpen, setReqModalOpen] = useState(false);
  const [changeModalOpen, setChangeModalOpen] = useState(false);
  const [tab, setTab] = useState('WING_TSUN');
  const [students, setStudents] = useState([]);
  const [changeRequests, setChangeRequests] = useState([]);
  const [statusFilter, setStatusFilter] = useState(canManageGrades ? 'PENDING' : '');
  const [reqForm, setReqForm] = useState({ branch: 'WING_TSUN', grade: 1, grade_name: '', required_hours: 0 });
  const [changeForm, setChangeForm] = useState({ student_id: '', branch: 'WING_TSUN', new_grade: 1, note: '' });

  useEffect(() => {
    fetchRequirements();
    api.get('/students/?limit=100').then(r => setStudents(r.data.items || [])).catch(() => {});
    if (isManagerOrAbove) fetchChangeRequests(statusFilter);
  }, []);

  const fetchRequirements = async () => {
    try {
      const res = await api.get('/grades/requirements');
      setRequirements(res.data);
    } catch {} finally { setLoading(false); }
  };

  const fetchChangeRequests = async (st = '') => {
    try {
      const res = await api.get(`/grades/change-requests${st ? `?status=${st}` : ''}`);
      setChangeRequests(res.data.items || []);
    } catch {}
  };

  const refreshStudents = async () => {
    try {
      const res = await api.get('/students/?limit=100');
      setStudents(res.data.items || []);
    } catch {}
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

  const openChangeModal = (studentId = '', branch = 'WING_TSUN', currentGrade = 1) => {
    setChangeForm({ student_id: studentId, branch, new_grade: currentGrade, note: '' });
    setChangeModalOpen(true);
  };

  const handleGradeChange = async (e) => {
    e.preventDefault();
    if (!changeForm.note.trim()) { toast.error('Not alani zorunludur'); return; }
    try {
      if (canManageGrades) {
        await api.post('/grades/manual-change', { ...changeForm, new_grade: parseInt(changeForm.new_grade) });
        toast.success('Derece guncellendi');
        refreshStudents();
      } else {
        await api.post('/grades/change-requests', {
          student_id: changeForm.student_id,
          branch: changeForm.branch,
          requested_grade: parseInt(changeForm.new_grade),
          note: changeForm.note,
        });
        toast.success('Degisiklik talebi gonderildi, admin onayi bekleniyor');
      }
      setChangeModalOpen(false);
      if (isManagerOrAbove) fetchChangeRequests(statusFilter);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Hata olustu');
    }
  };

  const handleApprove = async (id) => {
    try {
      await api.post(`/grades/change-requests/${id}/approve`);
      toast.success('Talep onaylandi, derece guncellendi');
      fetchChangeRequests(statusFilter);
      refreshStudents();
    } catch (err) { toast.error(err.response?.data?.detail || 'Hata'); }
  };

  const handleReject = async (id) => {
    try {
      await api.post(`/grades/change-requests/${id}/reject`);
      toast.success('Talep reddedildi');
      fetchChangeRequests(statusFilter);
    } catch (err) { toast.error(err.response?.data?.detail || 'Hata'); }
  };

  const getGrade = (progress, branch) => {
    const p = progress?.find(pr => pr.branch === branch);
    return p ? p.current_grade : 1;
  };

  const getHours = (progress, branch) => {
    const p = progress?.find(pr => pr.branch === branch);
    return p ? p.completed_hours : 0;
  };

  const getStatusBadge = (s) => {
    const map = { PENDING: 'badge-warning', APPROVED: 'badge-success', REJECTED: 'badge-danger' };
    const labels = { PENDING: 'Bekliyor', APPROVED: 'Onaylandi', REJECTED: 'Reddedildi' };
    return <span className={`badge ${map[s]}`}>{labels[s]}</span>;
  };

  const filtered = requirements.filter(r => r.branch === tab);

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader title="Dereceler & Saat Yonetimi" subtitle={canManageGrades ? 'Derece gereksinimleri ve manuel duzenleme' : 'Ogrenci dereceleri ve degisiklik talepleri'}>
        {isManagerOrAbove && (
          <button onClick={() => openChangeModal()} className="btn-primary">
            <ArrowUpDown size={18} /> {canManageGrades ? 'Derece Degistir' : 'Degisiklik Talep Et'}
          </button>
        )}
        {canManageGrades && (
          <button onClick={() => setReqModalOpen(true)} className="btn-secondary"><Plus size={18} /> Gereksinim Ekle</button>
        )}
      </PageHeader>

      {isManagerOrAbove && (
        <div className="table-container mb-6">
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
                    <p className="font-medium">{s.user_name || '-'}</p>
                    <p className="text-xs text-dark-400">{s.school_name || '-'}</p>
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
                    <div className="flex gap-2">
                      <button onClick={() => openChangeModal(s.id, 'WING_TSUN', getGrade(s.progress, 'WING_TSUN'))} className="text-primary-600 hover:text-primary-800 text-xs font-medium">WT</button>
                      <button onClick={() => openChangeModal(s.id, 'ESCRIMA', getGrade(s.progress, 'ESCRIMA'))} className="text-emerald-600 hover:text-emerald-800 text-xs font-medium">Esc</button>
                    </div>
                  </td>
                </tr>
              ))}
              {students.length === 0 && (
                <tr><td colSpan={7} className="text-center text-dark-400 py-8">Ogrenci bulunamadi</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {canManageGrades && (
        <>
          <div className="flex gap-2 mb-6">
            <button onClick={() => setTab('WING_TSUN')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'WING_TSUN' ? 'bg-primary-600 text-white' : 'bg-dark-200 text-dark-700 hover:bg-dark-300'}`}>
              Wing Tsun
            </button>
            <button onClick={() => setTab('ESCRIMA')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'ESCRIMA' ? 'bg-emerald-600 text-white' : 'bg-dark-200 text-dark-700 hover:bg-dark-300'}`}>
              Escrima
            </button>
          </div>

          <div className="table-container mb-6">
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
        </>
      )}

      {isManagerOrAbove && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <ClipboardList size={20} /> {canManageGrades ? 'Derece Degisiklik Talepleri' : 'Taleplerim'}
            </h2>
            {canManageGrades && (
              <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); fetchChangeRequests(e.target.value); }} className="select-field w-auto">
                <option value="">Tum Durumlar</option>
                <option value="PENDING">Bekliyor</option>
                <option value="APPROVED">Onaylandi</option>
                <option value="REJECTED">Reddedildi</option>
              </select>
            )}
          </div>

          {changeRequests.length === 0 ? (
            <EmptyState message="Talep bulunamadi" icon={ClipboardList} />
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Ogrenci</th>
                    <th className="hidden sm:table-cell">Okul</th>
                    <th>Brans</th>
                    <th>Mevcut → Talep</th>
                    <th className="hidden md:table-cell">Not</th>
                    <th>Durum</th>
                    {canManageGrades && <th>Islem</th>}
                  </tr>
                </thead>
                <tbody>
                  {changeRequests.map(r => (
                    <tr key={r.id}>
                      <td className="font-medium">{r.student_name || '-'}</td>
                      <td className="hidden sm:table-cell text-dark-500">{r.school_name || '-'}</td>
                      <td>{r.branch === 'WING_TSUN' ? 'WT' : 'Esc'}</td>
                      <td>{r.current_grade} → {r.requested_grade}</td>
                      <td className="hidden md:table-cell text-sm text-dark-500">{r.note}</td>
                      <td>{getStatusBadge(r.status)}</td>
                      {canManageGrades && (
                        <td>
                          {r.status === 'PENDING' && (
                            <div className="flex gap-2">
                              <button onClick={() => handleApprove(r.id)} className="text-emerald-600 hover:text-emerald-800" title="Onayla"><Check size={16} /></button>
                              <button onClick={() => handleReject(r.id)} className="text-red-600 hover:text-red-800" title="Reddet"><X size={16} /></button>
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

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

      {/* Grade Change / Change Request Modal */}
      <Modal isOpen={changeModalOpen} onClose={() => setChangeModalOpen(false)} title={canManageGrades ? 'Manuel Derece Degistir' : 'Derece Degisikligi Talep Et'}>
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
              <label className="block text-sm font-medium mb-1">{canManageGrades ? 'Yeni Derece' : 'Talep Edilen Derece'}</label>
              <input type="number" min={1} max={17} value={changeForm.new_grade} onChange={(e) => setChangeForm(p => ({ ...p, new_grade: e.target.value }))} className="input-field" required />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Not (Zorunlu) *</label>
            <textarea value={changeForm.note} onChange={(e) => setChangeForm(p => ({ ...p, note: e.target.value }))} className="input-field" rows={3} required placeholder="Degisiklik sebebini yazin..." />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setChangeModalOpen(false)} className="btn-secondary">Iptal</button>
            <button type="submit" className="btn-primary">{canManageGrades ? 'Degistir' : 'Talep Gonder'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
