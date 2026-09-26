import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

/** Nested inside ProtectedRoute, so loading and sign-in are already handled. */
export function AdminRoute() {
  const { user } = useAuth();

  if (!user?.isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}

export default AdminRoute;
