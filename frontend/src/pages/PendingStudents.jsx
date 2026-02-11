import { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import PageHeader from '../components/PageHeader';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { UserCheck, UserX, Users } from 'lucide-react';

export default function PendingStudents() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchPending(); }, []);

  const fetchPending = async () => {
    try {
      const res = await api.get('/students/pending');
      setStudents(res.data.items);
    } catch {} finally { setLoading(false); }
  };

  const handleApprove = async (studentId, approved) => {
    try {
      await api.post(`/students/${studentId}/approve`, { approved });
      toast.success(approved ? 'Ogrenci onaylandi' : 'Ogrenci reddedildi');
      fetchPending();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Hata olustu');
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader title="Onay Bekleyen Ogrenciler" subtitle={`${students.length} ogrenci bekliyor`} />

      {students.length === 0 ? (
        <EmptyState message="Onay bekleyen ogrenci yok" icon={Users} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {students.map(s => (
            <div key={s.id} className="card">
              <div className="mb-4">
                <h3 className="font-semibold text-lg">{s.user_name || 'Bilinmiyor'}</h3>
                <p className="text-sm text-dark-400">{s.user_email}</p>
                <p className="text-sm text-dark-500 mt-1">Okul: {s.school_name || '-'}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleApprove(s.id, true)} className="btn-success btn-sm flex-1">
                  <UserCheck size={16} /> Onayla
                </button>
                <button onClick={() => handleApprove(s.id, false)} className="btn-danger btn-sm flex-1">
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
