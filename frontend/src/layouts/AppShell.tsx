import { useState } from "react";
import { motion } from "framer-motion";
import { Outlet, useLocation } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import Sidebar from "../components/layout/Sidebar";
import TopBar from "../components/layout/TopBar";
import { useAuth } from "../context/AuthContext";
import LoadingSpinner from "../components/ui/LoadingSpinner";

export function AppShell() {
  const location = useLocation();
  const { isAuthenticated, isLoading } = useAuth();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  // Authenticated layout: sidebar + topbar + content
  if (isAuthenticated) {
    return (
      <div className="flex h-screen overflow-hidden bg-[radial-gradient(circle_at_top_right,_rgba(13,89,242,0.06),transparent_38%),radial-gradient(circle_at_8%_38%,_rgba(16,185,129,0.05),transparent_28%),#f8fafc]">
        <Sidebar
          isOpen={mobileSidebarOpen}
          onClose={() => setMobileSidebarOpen(false)}
        />
        <div className="flex flex-1 flex-col overflow-hidden">
          <TopBar onMenuToggle={() => setMobileSidebarOpen((prev) => !prev)} />
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="mx-auto max-w-6xl"
            >
              <Outlet />
            </motion.div>
          </main>
        </div>
      </div>
    );
  }

  // Public layout: navbar + content
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,_rgba(13,89,242,0.06),transparent_38%),radial-gradient(circle_at_8%_38%,_rgba(16,185,129,0.05),transparent_28%),#f8fafc]">
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
