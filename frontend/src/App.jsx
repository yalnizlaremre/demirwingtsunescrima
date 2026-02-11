import { Routes, Route } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Schools from './pages/Schools';
import Students from './pages/Students';
import PendingStudents from './pages/PendingStudents';
import Lessons from './pages/Lessons';
import Events from './pages/Events';
import Grades from './pages/Grades';
import Products from './pages/Products';
import Requests from './pages/Requests';
import Mail from './pages/Mail';
import Media from './pages/Media';
import Users from './pages/Users';

export default function App() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-dark-400">Yukleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/schools" element={
          <ProtectedRoute roles={['SUPER_ADMIN', 'ADMIN']}>
            <Schools />
          </ProtectedRoute>
        } />
        <Route path="/students" element={
          <ProtectedRoute roles={['SUPER_ADMIN', 'ADMIN', 'MANAGER']}>
            <Students />
          </ProtectedRoute>
        } />
        <Route path="/students/pending" element={
          <ProtectedRoute roles={['SUPER_ADMIN', 'ADMIN', 'MANAGER']}>
            <PendingStudents />
          </ProtectedRoute>
        } />
        <Route path="/lessons" element={
          <ProtectedRoute roles={['SUPER_ADMIN', 'ADMIN', 'MANAGER']}>
            <Lessons />
          </ProtectedRoute>
        } />
        <Route path="/events" element={<Events />} />
        <Route path="/grades" element={
          <ProtectedRoute roles={['SUPER_ADMIN', 'ADMIN']}>
            <Grades />
          </ProtectedRoute>
        } />
        <Route path="/products" element={<Products />} />
        <Route path="/requests" element={<Requests />} />
        <Route path="/mail" element={
          <ProtectedRoute roles={['SUPER_ADMIN', 'ADMIN', 'MANAGER']}>
            <Mail />
          </ProtectedRoute>
        } />
        <Route path="/media" element={
          <ProtectedRoute roles={['SUPER_ADMIN', 'ADMIN', 'MANAGER']}>
            <Media />
          </ProtectedRoute>
        } />
        <Route path="/users" element={
          <ProtectedRoute roles={['SUPER_ADMIN', 'ADMIN']}>
            <Users />
          </ProtectedRoute>
        } />
      </Route>
    </Routes>
  );
}
