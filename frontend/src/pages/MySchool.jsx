import { useState, useEffect } from 'react';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import {
  School, MapPin, Phone, Mail, Clock, BookOpen,
  Users, Image, Film, Play, Calendar,
} from 'lucide-react';

export default function MySchool() {
  const [school, setSchool] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('info');

  useEffect(() => {
    api.get('/schools/my-school')
      .then((res) => setSchool(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  if (!school) {
    return (
      <div>
        <PageHeader title="Okulum" subtitle="Okul bilgileri" />
        <EmptyState message="Bir okula kayitli degilsiniz" icon={School} />
      </div>
    );
  }

  const tabs = [
    { id: 'info', label: 'Bilgiler', icon: School },
    { id: 'instructors', label: 'Egitmenler', icon: Users },
    { id: 'lessons', label: 'Dersler', icon: BookOpen },
    { id: 'gallery', label: 'Galeri', icon: Image },
  ];

  const getBranchLabel = (b) => b === 'WING_TSUN' ? 'Wing Tsun' : b === 'ESCRIMA' ? 'Escrima' : b;
  const getLessonTypeLabel = (t) => t === 'GROUP' ? 'Grup' : t === 'PRIVATE' ? 'Ozel' : t;

  const getYouTubeEmbedUrl = (url) => {
    if (!url) return null;
    const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return match ? `https://www.youtube.com/embed/${match[1]}` : null;
  };

  return (
    <div>
      <PageHeader title={school.name} subtitle="Okul bilgileri ve detaylari" />

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-dark-100 p-1 rounded-xl overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-white text-dark-900 shadow-sm'
                  : 'text-dark-500 hover:text-dark-700'
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Info Tab */}
      {activeTab === 'info' && (
        <div className="space-y-4">
          <div className="card">
            <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <School size={20} className="text-primary-600" />
              Okul Bilgileri
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <MapPin size={18} className="text-dark-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm text-dark-500">Adres</p>
                  <p className="font-medium">{school.address || 'Belirtilmemis'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone size={18} className="text-dark-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm text-dark-500">Telefon</p>
                  <p className="font-medium">{school.phone || 'Belirtilmemis'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Mail size={18} className="text-dark-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm text-dark-500">E-posta</p>
                  <p className="font-medium">{school.email || 'Belirtilmemis'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock size={18} className="text-dark-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm text-dark-500">Durum</p>
                  <span className={`badge ${school.is_active ? 'badge-success' : 'badge-danger'}`}>
                    {school.is_active ? 'Aktif' : 'Pasif'}
                  </span>
                </div>
              </div>
            </div>
            {school.description && (
              <div className="mt-4 pt-4 border-t border-dark-100">
                <p className="text-sm text-dark-500 mb-1">Aciklama</p>
                <p className="text-dark-700">{school.description}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Instructors Tab */}
      {activeTab === 'instructors' && (
        <div>
          {school.instructors && school.instructors.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {school.instructors.map((inst) => (
                <div key={inst.id} className="card flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-lg shrink-0">
                    {inst.first_name[0]}{inst.last_name[0]}
                  </div>
                  <div>
                    <p className="font-semibold">{inst.first_name} {inst.last_name}</p>
                    {inst.instructor_title && (
                      <p className="text-sm text-emerald-600">{inst.instructor_title}</p>
                    )}
                    <p className="text-sm text-dark-400">{inst.email}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState message="Egitmen bilgisi bulunamadi" icon={Users} />
          )}
        </div>
      )}

      {/* Lessons Tab */}
      {activeTab === 'lessons' && (
        <div>
          {school.lessons && school.lessons.length > 0 ? (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Tarih</th>
                    <th>Brans</th>
                    <th>Tur</th>
                    <th>Sure</th>
                    <th className="hidden sm:table-cell">Not</th>
                  </tr>
                </thead>
                <tbody>
                  {school.lessons.map((lesson) => (
                    <tr key={lesson.id}>
                      <td className="font-medium">
                        <div className="flex items-center gap-2">
                          <Calendar size={14} className="text-dark-400" />
                          {new Date(lesson.lesson_date).toLocaleDateString('tr-TR', {
                            day: '2-digit', month: '2-digit', year: 'numeric',
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${lesson.branch === 'WING_TSUN' ? 'bg-primary-100 text-primary-800' : 'bg-emerald-100 text-emerald-800'}`}>
                          {getBranchLabel(lesson.branch)}
                        </span>
                      </td>
                      <td>{getLessonTypeLabel(lesson.lesson_type)}</td>
                      <td>{lesson.duration_hours} saat</td>
                      <td className="hidden sm:table-cell text-dark-500">{lesson.notes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState message="Henuz ders bilgisi eklenmemis" icon={BookOpen} />
          )}
        </div>
      )}

      {/* Gallery Tab */}
      {activeTab === 'gallery' && (
        <div>
          {school.media && school.media.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {school.media.map((m) => (
                <div key={m.id} className="card p-3">
                  {m.media_type === 'IMAGE' ? (
                    <img src={m.file_url} alt={m.title || 'Medya'} className="w-full h-40 object-cover rounded-lg" />
                  ) : m.media_type === 'YOUTUBE' ? (
                    <div className="w-full h-40 rounded-lg overflow-hidden">
                      {getYouTubeEmbedUrl(m.youtube_url || m.file_url) ? (
                        <iframe
                          src={getYouTubeEmbedUrl(m.youtube_url || m.file_url)}
                          className="w-full h-full"
                          allowFullScreen
                          title={m.title || 'YouTube Video'}
                        />
                      ) : (
                        <a href={m.youtube_url || m.file_url} target="_blank" rel="noopener noreferrer" className="w-full h-full bg-red-50 flex items-center justify-center text-red-600 hover:bg-red-100 transition-colors">
                          <Play size={32} />
                        </a>
                      )}
                    </div>
                  ) : (
                    <div className="w-full h-40 bg-dark-100 rounded-lg flex items-center justify-center">
                      <Film size={32} className="text-dark-400" />
                    </div>
                  )}
                  {m.title && <p className="text-sm font-medium mt-2 truncate">{m.title}</p>}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState message="Henuz medya eklenmemis" icon={Image} />
          )}
        </div>
      )}
    </div>
  );
}
