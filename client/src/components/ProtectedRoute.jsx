import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../state/AuthContext';
import { getHomeRoute } from '../utils/routing';

function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="screen-center">Loading your dashboard...</div>;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={getHomeRoute(user.role)} replace />;
  }

  return children;
}

export default ProtectedRoute;
