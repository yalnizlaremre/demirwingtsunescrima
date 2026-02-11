import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import PageHeader from '../components/PageHeader';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { GraduationCap, Search, Award } from 'lucide-react';

export default function Students() {
  const { isAdmin } = useAuth();
  const [students, setStudents] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [schoolFilter, setSchoolFilter] = useState('');
  const [schools, setSchools] = useState([]);

  useEffect(() => {
    api.get('/schools/?limit=100').then(r => setSchools(r.data.items || [])).catch(() => {});
    fetchStudents();
  }, []);

  const fetchStudents = async (s = '', sid = '') => {
    setLoading(true);
    try {
      let url = '/students/?limit=100';
      if (s) url += `&search=${s}`;
      if (sid) url += `&school_id=${sid}`;
      const res = await api.get(url);
      setStudents(res.data.items);
      setTotal(res.data.total);
    } catch {} finally { setLoading(false); }
  };

  const handleSearch = () => fetchStudents(search, schoolFilter);

  const getGrade = (progress, branch) => {
    const p = progress?.find(pr => pr.branch === branch);
    return p ? p.current_grade : '-';
  };

  const getHours = (progress, branch) => {
    const p = progress?.find(pr => pr.branch === branch);
    return p ? p.completed_hours : 0;
  };

  return (
    <div>
      <PageHeader title="Ogrenciler" subtitle={`${total} ogrenci`} />

      <div className="card mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Ad veya soyad ile ara..."
              className="input-field"
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          {isAdmin && (
            <select value={schoolFilter} onChange={(e) => { setSchoolFilter(e.target.value); fetchStudents(search, e.target.value); }} className="select-field sm:w-48">
              <option value="">Tum Okullar</option>
              {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          )}
          <button onClick={handleSearch} className="btn-primary"><Search size={18} /> Ara</button>
        </div>
      </div>

      {loading ? <LoadingSpinner /> : students.length === 0 ? (
        <EmptyState message="Ogrenci bulunamadi" icon={GraduationCap} />
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Ad Soyad</th>
                <th className="hidden sm:table-cell">Okul</th>
                <th>WT Derece</th>
                <th>WT Saat</th>
                <th className="hidden md:table-cell">Esc Derece</th>
                <th className="hidden md:table-cell">Esc Saat</th>
              </tr>
            </thead>
            <tbody>
              {students.map(s => (
                <tr key={s.id}>
                  <td>
                    <div>
                      <p className="font-medium">{s.user_name || '-'}</p>
                      <p className="text-xs text-dark-400">{s.user_email}</p>
                    </div>
                  </td>
                  <td className="hidden sm:table-cell text-dark-500">{s.school_name || '-'}</td>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
