import { Navigate } from "react-router-dom";
import LoadingThread from "../ui/LoadingThread";
import { useAuth } from "../../context/AuthContext";

export function IndexRedirect() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingThread />;
  }

  return <Navigate to={isAuthenticated ? "/dashboard" : "/overview"} replace />;
}

export default IndexRedirect;
