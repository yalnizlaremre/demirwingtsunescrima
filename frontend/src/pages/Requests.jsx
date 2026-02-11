import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { Plus, MessageSquare, Check, X } from 'lucide-react';

export default function Requests() {
  const { isUser, isManagerOrAbove } = useAuth();
  const [requests, setRequests] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [products, setProducts] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [form, setForm] = useState({ request_type: 'PRODUCT', product_id: '', size: '', branch: '', preferred_date: '', notes: '' });

  useEffect(() => {
    fetchRequests();
    if (isUser) api.get('/products/?limit=100').then(r => setProducts(r.data.items || [])).catch(() => {});
  }, []);

  const fetchRequests = async (st = '', tp = '') => {
    setLoading(true);
    try {
      let url = '/requests/?limit=100';
      if (st) url += `&status=${st}`;
      if (tp) url += `&request_type=${tp}`;
      const res = await api.get(url);
      setRequests(res.data.items);
      setTotal(res.data.total);
    } catch {} finally { setLoading(false); }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        product_id: form.product_id || null,
        branch: form.branch || null,
        preferred_date: form.preferred_date ? new Date(form.preferred_date).toISOString() : null,
      };
      await api.post('/requests/', payload);
      toast.success('Talep olusturuldu');
      setModalOpen(false);
      fetchRequests();
    } catch (err) { toast.error(err.response?.data?.detail || 'Hata olustu'); }
  };

  const handleAction = async (id, status) => {
    try {
      await api.post(`/requests/${id}/handle`, { status });
      toast.success(`Talep ${status === 'APPROVED' ? 'onaylandi' : 'reddedildi'}`);
      fetchRequests(statusFilter, typeFilter);
    } catch (err) { toast.error(err.response?.data?.detail || 'Hata'); }
  };

  const getTypeLabel = (t) => ({ PRODUCT: 'Urun', PRIVATE_LESSON: 'Ozel Ders', GROUP_LESSON: 'Grup Ders' }[t] || t);
  const getStatusBadge = (s) => {
    const map = { PENDING: 'badge-warning', APPROVED: 'badge-success', REJECTED: 'badge-danger' };
    const labels = { PENDING: 'Bekliyor', APPROVED: 'Onaylandi', REJECTED: 'Reddedildi' };
    return <span className={`badge ${map[s]}`}>{labels[s]}</span>;
  };

  const update = (f, v) => setForm(p => ({ ...p, [f]: v }));

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader title="Talepler" subtitle={`${total} talep`}>
        {isUser && <button onClick={() => setModalOpen(true)} className="btn-primary"><Plus size={18} /> Yeni Talep</button>}
      </PageHeader>

      <div className="flex flex-wrap gap-3 mb-6">
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); fetchRequests(e.target.value, typeFilter); }} className="select-field w-auto">
          <option value="">Tum Durumlar</option>
          <option value="PENDING">Bekliyor</option>
          <option value="APPROVED">Onaylandi</option>
          <option value="REJECTED">Reddedildi</option>
        </select>
        <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); fetchRequests(statusFilter, e.target.value); }} className="select-field w-auto">
          <option value="">Tum Turler</option>
          <option value="PRODUCT">Urun</option>
          <option value="PRIVATE_LESSON">Ozel Ders</option>
          <option value="GROUP_LESSON">Grup Ders</option>
        </select>
      </div>

      {requests.length === 0 ? (
        <EmptyState message="Henuz talep yok" icon={MessageSquare} />
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Ogrenci</th>
                <th>Tur</th>
                <th>Detay</th>
                <th>Durum</th>
                <th className="hidden sm:table-cell">Tarih</th>
                {isManagerOrAbove && <th>Islem</th>}
              </tr>
            </thead>
            <tbody>
              {requests.map(r => (
                <tr key={r.id}>
                  <td className="font-medium">{r.student_name || '-'}</td>
                  <td><span className="badge badge-info">{getTypeLabel(r.request_type)}</span></td>
                  <td className="text-sm text-dark-500">
                    {r.product_name && <span>Urun: {r.product_name}</span>}
                    {r.size && <span> ({r.size})</span>}
                    {r.branch && <span>Brans: {r.branch === 'WING_TSUN' ? 'WT' : 'ESC'}</span>}
                    {r.notes && <p className="text-xs mt-0.5">{r.notes}</p>}
                  </td>
                  <td>{getStatusBadge(r.status)}</td>
                  <td className="hidden sm:table-cell text-sm text-dark-400">{new Date(r.created_at).toLocaleDateString('tr-TR')}</td>
                  {isManagerOrAbove && (
                    <td>
                      {r.status === 'PENDING' && (
                        <div className="flex gap-2">
                          <button onClick={() => handleAction(r.id, 'APPROVED')} className="text-emerald-600 hover:text-emerald-800" title="Onayla"><Check size={16} /></button>
                          <button onClick={() => handleAction(r.id, 'REJECTED')} className="text-red-600 hover:text-red-800" title="Reddet"><X size={16} /></button>
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

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Yeni Talep">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Talep Turu *</label>
            <select value={form.request_type} onChange={(e) => update('request_type', e.target.value)} className="select-field">
              <option value="PRODUCT">Urun Talebi</option>
              <option value="PRIVATE_LESSON">Ozel Ders Talebi</option>
              <option value="GROUP_LESSON">Grup Ders Talebi</option>
            </select>
          </div>
          {form.request_type === 'PRODUCT' && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">Urun *</label>
                <select value={form.product_id} onChange={(e) => update('product_id', e.target.value)} className="select-field" required>
                  <option value="">Urun secin...</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Beden</label>
                <input value={form.size} onChange={(e) => update('size', e.target.value)} className="input-field" />
              </div>
            </>
          )}
          {(form.request_type === 'PRIVATE_LESSON' || form.request_type === 'GROUP_LESSON') && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">Brans</label>
                <select value={form.branch} onChange={(e) => update('branch', e.target.value)} className="select-field">
                  <option value="">Secin...</option>
                  <option value="WING_TSUN">Wing Tsun</option>
                  <option value="ESCRIMA">Escrima</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Tercih Edilen Tarih</label>
                <input type="datetime-local" value={form.preferred_date} onChange={(e) => update('preferred_date', e.target.value)} className="input-field" />
              </div>
            </>
          )}
          <div>
            <label className="block text-sm font-medium mb-1">Not</label>
            <textarea value={form.notes} onChange={(e) => update('notes', e.target.value)} className="input-field" rows={2} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Iptal</button>
            <button type="submit" className="btn-primary">Gonder</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
