import { Outlet } from "react-router-dom";
import CornerMesh from "../components/layout/CornerMesh";
import Navbar from "../components/layout/Navbar";
import Rail from "../components/layout/Rail";
import TopBar from "../components/layout/TopBar";
import LoadingThread from "../components/ui/LoadingThread";
import { useAuth } from "../context/AuthContext";
import { MeetingProvider } from "../context/MeetingContext";

export function AppShell() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingThread />;
  }

  if (isAuthenticated) {
    return (
      <MeetingProvider>
        <div className="flex h-screen overflow-hidden bg-ground bg-dotgrid">
          <Rail />
          <div className="relative flex flex-1 flex-col overflow-clip">
            <TopBar />
            <main className="relative z-10 flex-1 overflow-y-auto px-4 pb-20 pt-6 sm:px-8 sm:py-8 md:pb-8">
              <div className="mx-auto max-w-canvas">
                <Outlet />
              </div>
            </main>
          </div>
          <CornerMesh />
        </div>
      </MeetingProvider>
    );
  }

  return (
    <div className="min-h-screen bg-ground bg-dotgrid">
      <Navbar />
      <main className="relative z-10">
        <Outlet />
      </main>
    </div>
  );
}

export default AppShell;
