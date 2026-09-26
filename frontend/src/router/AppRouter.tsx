import { createBrowserRouter, Navigate, useParams } from "react-router-dom";
import AppShell from "../layouts/AppShell";
import AdminRoute from "../components/auth/AdminRoute";
import IndexRedirect from "../components/auth/IndexRedirect";
import ProtectedRoute from "../components/auth/ProtectedRoute";
import PublicOnlyRoute from "../components/auth/PublicOnlyRoute";
import Admin from "../pages/Admin";
import Chat from "../pages/Chat";
import Dashboard from "../pages/Dashboard";
import Home from "../pages/Home";
import Login from "../pages/Login";
import MeetingDetail from "../pages/MeetingDetail";
import Meetings from "../pages/Meetings";
import NotFound from "../pages/NotFound";
import Pending from "../pages/Pending";
import Settings from "../pages/Settings";
import Signup from "../pages/Signup";

/** The standalone transcript page is now the workspace drawer. */
function TranscriptRedirect() {
  const { botId } = useParams();
  return <Navigate to={`/meetings/${botId}?transcript=open`} replace />;
}

export const appRouter = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <IndexRedirect /> },
      { path: "overview", element: <Home /> },
      {
        element: <PublicOnlyRoute />,
        children: [
          { path: "login", element: <Login /> },
          { path: "signup", element: <Signup /> },
        ],
      },
      {
        element: <ProtectedRoute />,
        children: [
          { path: "dashboard", element: <Dashboard /> },
          { path: "meetings", element: <Meetings /> },
          { path: "meetings/:botId", element: <MeetingDetail /> },
          { path: "meetings/:botId/transcript", element: <TranscriptRedirect /> },
          { path: "chat", element: <Chat /> },
          { path: "settings", element: <Settings /> },
          { path: "pending", element: <Pending /> },
          {
            element: <AdminRoute />,
            children: [{ path: "admin", element: <Admin /> }],
          },
        ],
      },
      { path: "*", element: <NotFound /> },
    ],
  },
], { future: { v7_relativeSplatPath: true } });

export default appRouter;
