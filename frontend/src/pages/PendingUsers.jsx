import { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import PageHeader from '../components/PageHeader';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { UserCheck, UserPlus, UserX } from 'lucide-react';

export default function PendingUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchPending(); }, []);

  const fetchPending = async () => {
    try {
      const res = await api.get('/users/pending');
      setUsers(res.data.items);
    } catch {} finally { setLoading(false); }
  };

  const handleApprove = async (userId) => {
    try {
      await api.post(`/users/${userId}/approve`);
      toast.success('Uye onaylandi');
      fetchPending();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Hata olustu');
    }
  };

  const handleReject = async (userId) => {
    if (!confirm('Bu kaydi reddedip silmek istediginize emin misiniz?')) return;
    try {
      await api.delete(`/users/${userId}`);
      toast.success('Kayit silindi');
      fetchPending();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Hata olustu');
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader title="Bekleyen Uyeler" subtitle={`${users.length} yeni kayit onay bekliyor`} />

      {users.length === 0 ? (
        <EmptyState message="Onay bekleyen yeni uye yok" icon={UserPlus} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {users.map((u) => (
            <div key={u.id} className="card">
              <div className="mb-4">
                <h3 className="font-semibold text-lg">{u.first_name} {u.last_name}</h3>
                <p className="text-sm text-dark-400">{u.email}</p>
                {u.phone && <p className="text-sm text-dark-500 mt-1">Tel: {u.phone}</p>}
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleApprove(u.id)} className="btn-success btn-sm flex-1">
                  <UserCheck size={16} /> Onayla
                </button>
                <button onClick={() => handleReject(u.id)} className="btn-danger btn-sm flex-1">
                  <UserX size={16} /> Reddet
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
