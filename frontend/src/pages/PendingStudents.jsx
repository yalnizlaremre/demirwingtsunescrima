import { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import PageHeader from '../components/PageHeader';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { UserCheck, UserX, Users } from 'lucide-react';

export default function PendingStudents() {
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchPending(); }, []);

  const fetchPending = async () => {
    try {
      const res = await api.get('/enrollments/?status=PENDING');
      setEnrollments(res.data.items);
    } catch {} finally { setLoading(false); }
  };

  const handleApprove = async (enrollmentId) => {
    try {
      await api.post(`/enrollments/${enrollmentId}/approve`);
      toast.success('Talep onaylandi');
      fetchPending();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Hata olustu');
    }
  };

  const handleReject = async (enrollmentId) => {
    try {
      await api.post(`/enrollments/${enrollmentId}/reject`);
      toast.success('Talep reddedildi');
      fetchPending();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Hata olustu');
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader title="Onay Bekleyen Talepler" subtitle={`${enrollments.length} talep bekliyor`} />

      {enrollments.length === 0 ? (
        <EmptyState message="Onay bekleyen talep yok" icon={Users} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {enrollments.map(e => (
            <div key={e.id} className="card">
              <div className="mb-4">
                <h3 className="font-semibold text-lg">{e.user_name || 'Bilinmiyor'}</h3>
                <p className="text-sm text-dark-400">{e.user_email}</p>
                <p className="text-sm text-dark-500 mt-1">Okul: {e.school_name || '-'}</p>
                {e.notes && <p className="text-sm text-dark-400 mt-1">Not: {e.notes}</p>}
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleApprove(e.id)} className="btn-success btn-sm flex-1">
                  <UserCheck size={16} /> Onayla
                </button>
                <button onClick={() => handleReject(e.id)} className="btn-danger btn-sm flex-1">
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
