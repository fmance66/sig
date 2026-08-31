import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function RequireAuth() {
  const { usuario, loading } = useAuth();
  const location = useLocation();

  if (loading) return null;
  if (!usuario) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  return <Outlet />;
}
