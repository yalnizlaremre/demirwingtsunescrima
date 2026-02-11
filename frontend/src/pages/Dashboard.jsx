import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import PageHeader from '../components/PageHeader';
import {
  School, Users, GraduationCap, CalendarDays,
  MessageSquare, Shield, Clock, Award,
} from 'lucide-react';

export default function Dashboard() {
  const { user, isAdmin, isManager, isUser } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard/stats')
      .then((res) => setStats(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader
        title={`Hosgeldin, ${user?.first_name}!`}
        subtitle="Genel durum ozeti"
      />

      {(isAdmin) && stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard icon={School} label="Toplam Okul" value={stats.total_schools} color="blue" />
          <StatCard icon={GraduationCap} label="Toplam Ogrenci" value={stats.total_students} color="emerald" />
          <StatCard icon={Users} label="Toplam Egitmen" value={stats.total_managers} color="purple" />
          <StatCard icon={CalendarDays} label="Aktif Etkinlik" value={stats.active_events} color="amber" />
          <StatCard icon={MessageSquare} label="Bekleyen Talep" value={stats.pending_requests} color="red" />
          <StatCard icon={Shield} label="Onay Bekleyen" value={stats.pending_approvals} color="orange" />
        </div>
      )}

      {isManager && stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard icon={School} label="Okul" value={stats.school_name} color="blue" isText />
          <StatCard icon={GraduationCap} label="Ogrenci Sayisi" value={stats.total_students} color="emerald" />
          <StatCard icon={MessageSquare} label="Bekleyen Talep" value={stats.pending_requests} color="red" />
          <StatCard icon={Shield} label="Onay Bekleyen" value={stats.pending_approvals} color="orange" />
          <StatCard icon={CalendarDays} label="Yaklasan Etkinlik" value={stats.upcoming_events} color="amber" />
        </div>
      )}

      {isUser && stats && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard icon={School} label="Okul" value={stats.school_name || '-'} color="blue" isText />
            <StatCard icon={CalendarDays} label="Yaklasan Etkinlik" value={stats.upcoming_events} color="amber" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Wing Tsun Progress */}
            <div className="card">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <Award size={20} className="text-primary-600" />
                Wing Tsun
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-dark-500">Derece</span>
                  <span className="font-bold text-lg">{stats.wt_grade || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-500">Tamamlanan Saat</span>
                  <span className="font-semibold">{stats.wt_completed_hours || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-500">Kalan Saat</span>
                  <span className="font-semibold">{stats.wt_remaining_hours || 0}</span>
                </div>
              </div>
            </div>

            {/* Escrima Progress */}
            <div className="card">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <Award size={20} className="text-emerald-600" />
                Escrima
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-dark-500">Derece</span>
                  <span className="font-bold text-lg">{stats.escrima_grade || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-500">Tamamlanan Saat</span>
                  <span className="font-semibold">{stats.escrima_completed_hours || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-500">Kalan Saat</span>
                  <span className="font-semibold">{stats.escrima_remaining_hours || 0}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color, isText = false }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    purple: 'bg-purple-50 text-purple-600',
    amber: 'bg-amber-50 text-amber-600',
    red: 'bg-red-50 text-red-600',
    orange: 'bg-orange-50 text-orange-600',
  };

  return (
    <div className="card flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colors[color]}`}>
        <Icon size={22} />
      </div>
      <div>
        <p className="text-dark-500 text-sm">{label}</p>
        <p className={`font-bold ${isText ? 'text-base' : 'text-2xl'}`}>{value}</p>
      </div>
    </div>
  );
}
