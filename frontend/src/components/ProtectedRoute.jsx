import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, roles, permission }) {
  const { user, loading, hasPermission } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const roleAllowed = !roles || roles.includes(user.role);
  const allowed = permission ? (roleAllowed || hasPermission(permission)) : roleAllowed;

  if (!allowed) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
