import { Navigate } from "react-router-dom";
import LoadingSpinner from "../ui/LoadingSpinner";
import { useAuth } from "../../context/AuthContext";

export function IndexRedirect() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return <Navigate to={isAuthenticated ? "/dashboard" : "/overview"} replace />;
}

export default IndexRedirect;
