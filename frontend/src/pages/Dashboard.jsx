import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import PageHeader from '../components/PageHeader';
import {
  School, Users, GraduationCap, CalendarDays,
  MessageSquare, Shield, Clock, Award, ArrowRight,
} from 'lucide-react';

export default function Dashboard() {
  const { user, isAdmin, isManager, isUser, isMember } = useAuth();
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
            <ProgressCard
              title="Wing Tsun"
              color="primary"
              grade={stats.wt_grade}
              completed={stats.wt_completed_hours || 0}
              required={stats.wt_required_hours || 0}
              minimum={stats.wt_minimum_hours || 0}
              remaining={stats.wt_remaining_hours || 0}
            />

            {/* Escrima Progress */}
            <ProgressCard
              title="Escrima"
              color="emerald"
              grade={stats.escrima_grade}
              completed={stats.escrima_completed_hours || 0}
              required={stats.escrima_required_hours || 0}
              minimum={stats.escrima_minimum_hours || 0}
              remaining={stats.escrima_remaining_hours || 0}
            />
          </div>
        </div>
      )}

      {isMember && (
        <div className="space-y-6">
          <div className="card bg-blue-50 border border-blue-200">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-blue-100 text-blue-600">
                <School size={22} />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg text-blue-900">Okula Katilma Talebi Olusturun</h3>
                <p className="text-sm text-blue-700 mt-1">
                  Henuz bir okula kayitli degilsiniz. Okullar sayfasindan bir okula katilma talebi olusturabilirsiniz.
                  Talebiniz onaylandiginda ogrenci olarak sisteme erisim saglayabileceksiniz.
                </p>
                <Link to="/schools" className="inline-flex items-center gap-2 mt-3 text-sm font-medium text-blue-600 hover:text-blue-800">
                  Okullari Gor <ArrowRight size={16} />
                </Link>
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

function ProgressCard({ title, color, grade, completed, required, minimum, remaining }) {
  const percent = required > 0 ? Math.min(100, Math.round((completed / required) * 100)) : 0;
  const minPercent = required > 0 ? Math.round((minimum / required) * 100) : 0;

  const colorMap = {
    primary: {
      bg: 'bg-primary-50',
      text: 'text-primary-600',
      bar: 'bg-primary-600',
      border: 'border-primary-200',
      icon: 'bg-primary-100 text-primary-600',
    },
    emerald: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-600',
      bar: 'bg-emerald-600',
      border: 'border-emerald-200',
      icon: 'bg-emerald-100 text-emerald-600',
    },
  };

  const c = colorMap[color] || colorMap.primary;

  return (
    <div className={`card border ${c.border}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${c.icon}`}>
            <Award size={16} />
          </div>
          {title}
        </h3>
        <span className={`text-2xl font-bold ${c.text}`}>{grade}. Derece</span>
      </div>

      {/* Ilerleme Cubugu */}
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-dark-500">Tamamlanan</span>
          <span className="font-medium">{completed} / {required} saat</span>
        </div>
        <div className="relative w-full bg-dark-200 rounded-full h-3">
          {/* Alt sinir isaretcisi */}
          {minimum > 0 && (
            <div
              className="absolute top-0 h-3 border-r-2 border-amber-500 z-10"
              style={{ left: `${minPercent}%` }}
              title={`Alt sinir: ${minimum} saat`}
            />
          )}
          <div
            className={`h-3 rounded-full transition-all duration-500 ${
              percent >= 100 ? 'bg-emerald-500' :
              percent >= minPercent ? 'bg-amber-500' :
              c.bar
            }`}
            style={{ width: `${percent}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-dark-400 mt-1">
          <span>0</span>
          <span className="text-amber-600">Alt sinir: {minimum}s</span>
          <span>{required}s</span>
        </div>
      </div>

      {/* Detay Bilgiler */}
      <div className="grid grid-cols-3 gap-2">
        <div className="text-center p-2 bg-dark-50 rounded-lg">
          <p className="text-xs text-dark-500">Kalan</p>
          <p className="font-bold text-lg flex items-center justify-center gap-1">
            <Clock size={14} className="text-dark-400" />
            {remaining}s
          </p>
        </div>
        <div className="text-center p-2 bg-dark-50 rounded-lg">
          <p className="text-xs text-dark-500">Ilerleme</p>
          <p className="font-bold text-lg">%{percent}</p>
        </div>
        <div className="text-center p-2 bg-dark-50 rounded-lg">
          <p className="text-xs text-dark-500">Durum</p>
          <p className={`font-bold text-sm mt-0.5 ${
            percent >= 100 ? 'text-emerald-600' :
            percent >= minPercent ? 'text-amber-600' :
            'text-dark-500'
          }`}>
            {percent >= 100 ? 'Hazir' : percent >= minPercent ? 'Onayla' : 'Devam'}
          </p>
        </div>
      </div>
    </div>
  );
}
