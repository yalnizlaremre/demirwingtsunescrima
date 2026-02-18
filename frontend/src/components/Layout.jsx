import { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, School, Users, GraduationCap, BookOpen,
  CalendarDays, Package, MessageSquare, Mail, Menu, X,
  LogOut, ChevronDown, Shield, Image, User,
} from 'lucide-react';

export default function Layout() {
  const { user, logout, isAdmin, isManager, isUser, isMember, isSuperAdmin } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard, show: true },
    { to: '/profile', label: 'Profilim', icon: User, show: true },
    { to: '/my-school', label: 'Okulum', icon: School, show: isUser },
    { to: '/schools', label: 'Okullar', icon: School, show: isAdmin || isMember || isUser },
    { to: '/students', label: 'Ogrenciler', icon: GraduationCap, show: isAdmin || isManager },
    { to: '/students/pending', label: 'Onay Bekleyenler', icon: Users, show: isAdmin || isManager },
    { to: '/lessons', label: 'Dersler', icon: BookOpen, show: isAdmin || isManager },
    { to: '/events', label: 'Etkinlikler', icon: CalendarDays, show: true },
    { to: '/grades', label: 'Dereceler', icon: Shield, show: isAdmin },
    { to: '/products', label: 'Urunler', icon: Package, show: true },
    { to: '/requests', label: 'Talepler', icon: MessageSquare, show: !isMember },
    { to: '/mail', label: 'Mail', icon: Mail, show: isAdmin || isManager },
    { to: '/media', label: 'Medya', icon: Image, show: isAdmin || (isManager && user?.can_upload_media) || isUser },
    { to: '/users', label: 'Kullanicilar', icon: Users, show: isAdmin },
  ];

  const filteredNav = navItems.filter((item) => item.show);

  const getRoleBadge = () => {
    const roles = {
      SUPER_ADMIN: { label: 'Super Admin', class: 'bg-purple-100 text-purple-800' },
      ADMIN: { label: 'Admin', class: 'bg-blue-100 text-blue-800' },
      MANAGER: { label: 'Egitmen', class: 'bg-emerald-100 text-emerald-800' },
      USER: { label: 'Ogrenci', class: 'bg-amber-100 text-amber-800' },
      MEMBER: { label: 'Uye', class: 'bg-gray-100 text-gray-800' },
    };
    const r = roles[user?.role] || roles.MEMBER;
    return <span className={`badge ${r.class}`}>{r.label}</span>;
  };

  return (
    <div className="min-h-screen bg-dark-50">
      {/* Mobile Header */}
      <div className="lg:hidden flex items-center justify-between bg-dark-900 text-white px-4 py-3">
        <button onClick={() => setSidebarOpen(!sidebarOpen)}>
          {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
        <h1 className="text-lg font-bold">WT&E</h1>
        <div className="w-8" />
      </div>

      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-40 h-full w-64 bg-dark-900 text-white transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
      >
        <div className="p-5 border-b border-dark-700">
          <h1 className="text-xl font-bold text-primary-400">Wing Tsun & Escrima</h1>
          <p className="text-dark-400 text-xs mt-1">Okul Yonetim Sistemi</p>
        </div>

        <nav className="p-3 space-y-1 flex-1 overflow-y-auto max-h-[calc(100vh-180px)]">
          {filteredNav.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors
                  ${active ? 'bg-primary-600 text-white' : 'text-dark-300 hover:bg-dark-800 hover:text-white'}`}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-dark-700">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-primary-600 flex items-center justify-center text-sm font-bold overflow-hidden shrink-0">
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <>{user?.first_name?.[0]}{user?.last_name?.[0]}</>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.first_name} {user?.last_name}</p>
              <div>{getRoleBadge()}</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-dark-400 hover:text-red-400 text-sm w-full transition-colors"
          >
            <LogOut size={16} />
            Cikis Yap
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-64 min-h-screen">
        <div className="p-4 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
