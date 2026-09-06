import { Navigate, Outlet } from "react-router-dom";
import LoadingThread from "../ui/LoadingThread";
import { useAuth } from "../../context/AuthContext";

export function PublicOnlyRoute() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingThread />;
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}

export default PublicOnlyRoute;
