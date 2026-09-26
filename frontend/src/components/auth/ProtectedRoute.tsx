import { Navigate, Outlet, useLocation } from "react-router-dom";
import LoadingThread from "../ui/LoadingThread";
import { useAuth } from "../../context/AuthContext";

export function ProtectedRoute() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <LoadingThread />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (user?.status === "pending" && location.pathname !== "/pending") {
    return <Navigate to="/pending" replace />;
  }

  return <Outlet />;
}

export default ProtectedRoute;
