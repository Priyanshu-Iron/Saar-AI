import { motion } from "framer-motion";
import { Outlet, useLocation } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import { useAuth } from "../context/AuthContext";
import LoadingSpinner from "../components/ui/LoadingSpinner";

export function AppShell() {
  const location = useLocation();
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,_rgba(56,189,248,0.12),transparent_38%),radial-gradient(circle_at_8%_38%,_rgba(16,185,129,0.09),transparent_28%),#f8fafc]">
      <Navbar />
      <div className="mx-auto max-w-7xl">
        <main className="w-full p-4 sm:p-6 lg:p-8">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  );
}

export default AppShell;
