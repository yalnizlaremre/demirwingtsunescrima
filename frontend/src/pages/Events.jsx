import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { Plus, CalendarDays, Users, CheckCircle2, ClipboardList, AlertTriangle } from 'lucide-react';

export default function Events() {
  const { isAdmin, isUser } = useAuth();
  const [events, setEvents] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [regModalOpen, setRegModalOpen] = useState(false);
  const [evalModalOpen, setEvalModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [selectedPassed, setSelectedPassed] = useState([]);
  const [schools, setSchools] = useState([]);
  const [regForm, setRegForm] = useState({ register_wt: false, register_escrima: false, will_take_exam: false, exam_branch_wt: false, exam_branch_escrima: false });
  const [form, setForm] = useState({
    name: '', description: '', event_type: 'EVENT', start_datetime: '', end_datetime: '',
    location: '', capacity: '', scope: 'ALL_SCHOOLS', selected_school_ids: [], wt_fee: '', escrima_fee: '',
  });

  useEffect(() => {
    fetchEvents();
    if (isAdmin) api.get('/schools/?limit=100').then(r => setSchools(r.data.items || [])).catch(() => {});
  }, []);

  const fetchEvents = async () => {
    try {
      const res = await api.get('/events/?limit=100');
      setEvents(res.data.items);
      setTotal(res.data.total);
    } catch {} finally { setLoading(false); }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        start_datetime: new Date(form.start_datetime).toISOString(),
        end_datetime: form.end_datetime ? new Date(form.end_datetime).toISOString() : new Date(form.start_datetime).toISOString(),
        capacity: form.capacity ? parseInt(form.capacity) : null,
        wt_fee: form.wt_fee ? parseFloat(form.wt_fee) : null,
        escrima_fee: form.escrima_fee ? parseFloat(form.escrima_fee) : null,
      };
      await api.post('/events/', payload);
      toast.success('Etkinlik olusturuldu');
      setModalOpen(false);
      fetchEvents();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Hata olustu');
    }
  };

  const [eligibility, setEligibility] = useState(null);

  const openRegister = async (event) => {
    setSelectedEvent(event);
    setRegForm({ register_wt: false, register_escrima: false, will_take_exam: false, exam_branch_wt: false, exam_branch_escrima: false });
    setEligibility(null);
    if (event.event_type === 'SEMINAR') {
      try {
        const res = await api.get(`/events/${event.id}/my-eligibility`);
        setEligibility(res.data);
      } catch {}
    }
    setRegModalOpen(true);
  };

  const handleRegister = async () => {
    try {
      const res = await api.post(`/events/${selectedEvent.id}/register`, regForm);
      if (res.data.needs_manager_approval) {
        toast.success('Kayit basarili! Sinav icin egitmen onayi bekleniyor.');
      } else {
        toast.success('Kayit basarili');
      }
      setRegModalOpen(false);
      fetchEvents();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Hata olustu');
    }
  };

  const canTakeExam = (branch) => {
    if (!eligibility) return false;
    const elig = branch === 'wt' ? eligibility.wt_eligibility : eligibility.escrima_eligibility;
    return elig === 'ELIGIBLE' || elig === 'NEEDS_APPROVAL';
  };

  const needsApproval = (branch) => {
    if (!eligibility) return false;
    return (branch === 'wt' ? eligibility.wt_eligibility : eligibility.escrima_eligibility) === 'NEEDS_APPROVAL';
  };

  const openEvaluate = async (event) => {
    setSelectedEvent(event);
    setSelectedPassed([]);
    try {
      const res = await api.get(`/events/${event.id}/registrations`);
      setRegistrations(res.data.filter(r => r.will_take_exam && (!r.needs_manager_approval || r.manager_approved)));
    } catch {}
    setEvalModalOpen(true);
  };

  const handleEvaluate = async () => {
    try {
      await api.post(`/events/${selectedEvent.id}/evaluate`, { passed_student_ids: selectedPassed });
      toast.success('Seminer degerlendirildi');
      setEvalModalOpen(false);
      fetchEvents();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Hata olustu');
    }
  };

  const togglePassed = (id) => {
    setSelectedPassed(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  };

  const update = (f, v) => setForm(p => ({ ...p, [f]: v }));

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader title="Etkinlikler" subtitle={`${total} etkinlik`}>
        {isAdmin && <button onClick={() => setModalOpen(true)} className="btn-primary"><Plus size={18} /> Yeni Etkinlik</button>}
      </PageHeader>

      {events.length === 0 ? (
        <EmptyState message="Henuz etkinlik yok" icon={CalendarDays} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.map(e => (
            <div key={e.id} className="card">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold">{e.name}</h3>
                  <span className={`badge ${e.event_type === 'SEMINAR' ? 'badge-warning' : 'badge-info'} mt-1`}>
                    {e.event_type === 'SEMINAR' ? 'Seminer' : 'Etkinlik'}
                  </span>
                </div>
                {e.is_completed && <CheckCircle2 size={20} className="text-emerald-500" />}
              </div>
              <div className="text-sm text-dark-500 space-y-1 mb-4">
                <p>{new Date(e.start_datetime).toLocaleDateString('tr-TR')} - {new Date(e.start_datetime).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</p>
                {e.location && <p>{e.location}</p>}
                <p className="flex items-center gap-1"><Users size={14} /> {e.registration_count} kayit</p>
                {e.wt_fee && <p>WT Ucret: {e.wt_fee} TL</p>}
                {e.escrima_fee && <p>Escrima Ucret: {e.escrima_fee} TL</p>}
              </div>
              <div className="flex gap-2">
                {isUser && !e.is_completed && (
                  <button onClick={() => openRegister(e)} className="btn-primary btn-sm flex-1">Kayit Ol</button>
                )}
                {isAdmin && e.event_type === 'SEMINAR' && !e.is_completed && (
                  <button onClick={() => openEvaluate(e)} className="btn-success btn-sm flex-1">
                    <ClipboardList size={14} /> Degerlendir
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Event Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Yeni Etkinlik" size="lg">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Ad *</label>
              <input value={form.name} onChange={(e) => update('name', e.target.value)} className="input-field" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tur</label>
              <select value={form.event_type} onChange={(e) => update('event_type', e.target.value)} className="select-field">
                <option value="EVENT">Etkinlik</option>
                <option value="SEMINAR">Seminer</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Kapasite</label>
              <input type="number" value={form.capacity} onChange={(e) => update('capacity', e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Baslangic *</label>
              <input type="datetime-local" value={form.start_datetime} onChange={(e) => update('start_datetime', e.target.value)} className="input-field" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Bitis</label>
              <input type="datetime-local" value={form.end_datetime} onChange={(e) => update('end_datetime', e.target.value)} className="input-field" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Konum</label>
              <input value={form.location} onChange={(e) => update('location', e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">WT Ucret (TL)</label>
              <input type="number" step="0.01" value={form.wt_fee} onChange={(e) => update('wt_fee', e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Escrima Ucret (TL)</label>
              <input type="number" step="0.01" value={form.escrima_fee} onChange={(e) => update('escrima_fee', e.target.value)} className="input-field" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Aciklama</label>
              <textarea value={form.description} onChange={(e) => update('description', e.target.value)} className="input-field" rows={2} />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Iptal</button>
            <button type="submit" className="btn-primary">Olustur</button>
          </div>
        </form>
      </Modal>

      {/* Register Modal */}
      <Modal isOpen={regModalOpen} onClose={() => setRegModalOpen(false)} title="Etkinlige Kayit">
        <div className="space-y-4">
          <p className="text-sm text-dark-500"><strong>{selectedEvent?.name}</strong> etkinligine kayit olun.</p>
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={regForm.register_wt} onChange={(e) => setRegForm(p => ({ ...p, register_wt: e.target.checked }))} className="w-4 h-4" />
              <span>Wing Tsun {selectedEvent?.wt_fee ? `(${selectedEvent.wt_fee} TL)` : ''}</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={regForm.register_escrima} onChange={(e) => setRegForm(p => ({ ...p, register_escrima: e.target.checked }))} className="w-4 h-4" />
              <span>Escrima {selectedEvent?.escrima_fee ? `(${selectedEvent.escrima_fee} TL)` : ''}</span>
            </label>
            {selectedEvent?.event_type === 'SEMINAR' && (canTakeExam('wt') || canTakeExam('escrima')) && (
              <>
                <hr />
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={regForm.will_take_exam} onChange={(e) => setRegForm(p => ({ ...p, will_take_exam: e.target.checked, exam_branch_wt: false, exam_branch_escrima: false }))} className="w-4 h-4" />
                  <span className="font-medium">Sinava girecegim</span>
                </label>
                {regForm.will_take_exam && (
                  <div className="ml-7 space-y-2">
                    {canTakeExam('wt') && (
                      <div>
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input type="checkbox" checked={regForm.exam_branch_wt} onChange={(e) => setRegForm(p => ({ ...p, exam_branch_wt: e.target.checked }))} className="w-4 h-4" />
                          <span>Wing Tsun sinavi</span>
                        </label>
                        {needsApproval('wt') && regForm.exam_branch_wt && (
                          <p className="ml-7 text-xs text-amber-600 flex items-center gap-1 mt-1">
                            <AlertTriangle size={12} /> Egitmen onayi gerekiyor ({eligibility?.wt_completed_hours}/{eligibility?.wt_required_hours} saat)
                          </p>
                        )}
                      </div>
                    )}
                    {canTakeExam('escrima') && (
                      <div>
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input type="checkbox" checked={regForm.exam_branch_escrima} onChange={(e) => setRegForm(p => ({ ...p, exam_branch_escrima: e.target.checked }))} className="w-4 h-4" />
                          <span>Escrima sinavi</span>
                        </label>
                        {needsApproval('escrima') && regForm.exam_branch_escrima && (
                          <p className="ml-7 text-xs text-amber-600 flex items-center gap-1 mt-1">
                            <AlertTriangle size={12} /> Egitmen onayi gerekiyor ({eligibility?.escrima_completed_hours}/{eligibility?.escrima_required_hours} saat)
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
            {selectedEvent?.event_type === 'SEMINAR' && !canTakeExam('wt') && !canTakeExam('escrima') && (
              <>
                <hr />
                <p className="text-sm text-dark-400 italic">Sinav icin yeterli calisma saatiniz bulunmuyor.</p>
              </>
            )}
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setRegModalOpen(false)} className="btn-secondary">Iptal</button>
            <button onClick={handleRegister} className="btn-primary">Kayit Ol</button>
          </div>
        </div>
      </Modal>

      {/* Evaluate Seminar Modal */}
      <Modal isOpen={evalModalOpen} onClose={() => setEvalModalOpen(false)} title="Semineri Degerlendir" size="lg">
        <div className="space-y-4">
          <p className="text-sm text-dark-500">Sinava giren ogrencilerden <strong>basarili olanlari</strong> secin. Secilen ogrencilerin derecesi +1 arttirilacaktir.</p>
          <div className="max-h-72 overflow-y-auto border border-dark-200 rounded-lg divide-y">
            {registrations.map(r => (
              <label key={r.student_id} className="flex items-center gap-3 px-4 py-3 hover:bg-dark-50 cursor-pointer">
                <input type="checkbox" checked={selectedPassed.includes(r.student_id)} onChange={() => togglePassed(r.student_id)} className="w-4 h-4 text-primary-600 rounded" />
                <div>
                  <span className="text-sm font-medium">{r.student_name || r.student_id}</span>
                  <div className="flex gap-2 mt-0.5">
                    {r.exam_branch_wt && <span className="badge badge-danger text-xs">WT</span>}
                    {r.exam_branch_escrima && <span className="badge badge-info text-xs">ESC</span>}
                  </div>
                </div>
              </label>
            ))}
            {registrations.length === 0 && <p className="text-sm text-dark-400 p-4">Sinava giren ogrenci yok</p>}
          </div>
          <div className="flex justify-between items-center pt-2">
            <span className="text-sm text-dark-500">{selectedPassed.length} ogrenci secildi</span>
            <div className="flex gap-3">
              <button onClick={() => setEvalModalOpen(false)} className="btn-secondary">Iptal</button>
              <button onClick={handleEvaluate} className="btn-success">Degerlendir & Bitir</button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
