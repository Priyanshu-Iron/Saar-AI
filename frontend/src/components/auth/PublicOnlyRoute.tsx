import { Navigate, Outlet } from "react-router-dom";
import LoadingSpinner from "../ui/LoadingSpinner";
import { useAuth } from "../../context/AuthContext";

export function PublicOnlyRoute() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}

export default PublicOnlyRoute;
