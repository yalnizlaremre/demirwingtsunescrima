import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import PageHeader from '../components/PageHeader';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { Send, Mail as MailIcon, Clock } from 'lucide-react';

export default function Mail() {
  const { isAdmin } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [schools, setSchools] = useState([]);
  const [form, setForm] = useState({
    subject: '', body: '', school_ids: [], branch: '', grade_min: '', grade_max: '',
  });

  useEffect(() => {
    fetchLogs();
    if (isAdmin) api.get('/schools/?limit=100').then(r => setSchools(r.data.items || [])).catch(() => {});
  }, []);

  const fetchLogs = async () => {
    try {
      const res = await api.get('/mail/logs?limit=50');
      setLogs(res.data.items);
    } catch {} finally { setLoading(false); }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      const payload = {
        subject: form.subject,
        body: form.body,
        school_ids: form.school_ids.length > 0 ? form.school_ids : null,
        branch: form.branch || null,
        grade_min: form.grade_min ? parseInt(form.grade_min) : null,
        grade_max: form.grade_max ? parseInt(form.grade_max) : null,
      };
      const res = await api.post('/mail/send', payload);
      toast.success(`${res.data.recipient_count} kisiye mail gonderildi`);
      setForm({ subject: '', body: '', school_ids: [], branch: '', grade_min: '', grade_max: '' });
      fetchLogs();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Hata olustu');
    } finally { setSending(false); }
  };

  const toggleSchool = (id) => {
    setForm(p => ({
      ...p,
      school_ids: p.school_ids.includes(id) ? p.school_ids.filter(s => s !== id) : [...p.school_ids, id],
    }));
  };

  const update = (f, v) => setForm(p => ({ ...p, [f]: v }));

  return (
    <div>
      <PageHeader title="Mail Gonder" subtitle="Ogrencilere toplu mail gonderimi" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Send Form */}
        <div className="card">
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2"><Send size={18} /> Yeni Mail</h3>
          <form onSubmit={handleSend} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Konu *</label>
              <input value={form.subject} onChange={(e) => update('subject', e.target.value)} className="input-field" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Icerik *</label>
              <textarea value={form.body} onChange={(e) => update('body', e.target.value)} className="input-field" rows={5} required />
            </div>

            {isAdmin && schools.length > 0 && (
              <div>
                <label className="block text-sm font-medium mb-1">Okullar (bos = tumu)</label>
                <div className="space-y-1 max-h-32 overflow-y-auto border border-dark-200 rounded-lg p-2">
                  {schools.map(s => (
                    <label key={s.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" checked={form.school_ids.includes(s.id)} onChange={() => toggleSchool(s.id)} className="w-3.5 h-3.5" />
                      {s.name}
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Brans</label>
                <select value={form.branch} onChange={(e) => update('branch', e.target.value)} className="select-field">
                  <option value="">Tumu</option>
                  <option value="WING_TSUN">Wing Tsun</option>
                  <option value="ESCRIMA">Escrima</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Min Derece</label>
                <input type="number" min={1} max={17} value={form.grade_min} onChange={(e) => update('grade_min', e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Max Derece</label>
                <input type="number" min={1} max={17} value={form.grade_max} onChange={(e) => update('grade_max', e.target.value)} className="input-field" />
              </div>
            </div>

            <button type="submit" disabled={sending} className="btn-primary w-full">
              {sending ? 'Gonderiliyor...' : 'Mail Gonder'}
            </button>
          </form>
        </div>

        {/* Logs */}
        <div className="card">
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2"><Clock size={18} /> Gonderim Gecmisi</h3>
          {loading ? <LoadingSpinner /> : logs.length === 0 ? (
            <EmptyState message="Henuz mail gonderilmemis" icon={MailIcon} />
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {logs.map(l => (
                <div key={l.id} className="border border-dark-200 rounded-lg p-3">
                  <div className="flex items-start justify-between">
                    <h4 className="font-medium text-sm">{l.subject}</h4>
                    <span className="badge badge-info">{l.recipient_count} kisi</span>
                  </div>
                  <p className="text-xs text-dark-400 mt-1">{l.sender_name} - {new Date(l.created_at).toLocaleDateString('tr-TR')}</p>
                  <p className="text-sm text-dark-500 mt-2 line-clamp-2">{l.body}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
