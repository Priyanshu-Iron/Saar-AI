import { motion } from "framer-motion";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Button from "../ui/Button";
import BrandLogo from "../ui/BrandLogo";

const links = [
  { to: "/dashboard", label: "Dashboard", icon: "🏠" },
  { to: "/meetings", label: "Meetings", icon: "📋" },
];

export function Sidebar() {
  const { user, isAuthenticated, logout } = useAuth();

  if (!isAuthenticated) {
    return null;
  }

  return (
    <motion.aside
      initial={{ x: -16, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.35, delay: 0.1 }}
      className="hidden w-64 shrink-0 border-r border-slate-200 bg-white/80 px-3 py-4 lg:block"
    >
      {/* <div className="mb-4 flex items-center gap-2 px-1">
        <BrandLogo mode="icon" />
        <span className="text-xs font-semibold tracking-wide text-slate-700">SaarAI</span>
      </div> */}
      <nav className="space-y-1">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              [
                "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition-colors",
                isActive ? "bg-sky-100 text-sky-700" : "text-slate-600 hover:bg-slate-100",
              ].join(" ")
            }
          >
            <span>{link.icon}</span>
            {link.label}
          </NavLink>
        ))}
      </nav>

      {user && (
        <div className="mt-4 rounded-xl bg-slate-50 px-3 py-2.5 text-xs text-slate-500">
          {user.email}
        </div>
      )}

      <div className="mt-3 border-t border-slate-200 pt-3">
        <Button fullWidth variant="ghost" onClick={logout}>
          Logout
        </Button>
      </div>
    </motion.aside>
  );
}

export default Sidebar;
