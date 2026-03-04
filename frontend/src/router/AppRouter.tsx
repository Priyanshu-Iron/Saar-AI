import { createBrowserRouter } from "react-router-dom";
import AppShell from "../layouts/AppShell";
import IndexRedirect from "../components/auth/IndexRedirect";
import ProtectedRoute from "../components/auth/ProtectedRoute";
import PublicOnlyRoute from "../components/auth/PublicOnlyRoute";
import Dashboard from "../pages/Dashboard";
import Home from "../pages/Home";
import Login from "../pages/Login";
import MeetingDetail from "../pages/MeetingDetail";
import Meetings from "../pages/Meetings";
import NotFound from "../pages/NotFound";
import Signup from "../pages/Signup";
import Transcript from "../pages/Transcript";

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
          { path: "meetings/:botId/transcript", element: <Transcript /> },
        ],
      },
      { path: "*", element: <NotFound /> },
    ],
  },
]);

export default appRouter;
