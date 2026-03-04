import { motion } from "framer-motion";
import { NavLink } from "react-router-dom";
import Button from "../ui/Button";
import { useAuth } from "../../context/AuthContext";
import BrandLogo from "../ui/BrandLogo";

const publicLinks = [
  { to: "/overview", label: "Overview" },
  { to: "/login", label: "Login" },
  { to: "/signup", label: "Sign Up" },
];

export function Navbar() {
  const { isAuthenticated, logout } = useAuth();

  const privateLinks = [
    { to: "/dashboard", label: "Dashboard" },
    { to: "/meetings", label: "Meetings" },
  ];

  const links = isAuthenticated ? privateLinks : publicLinks;

  return (
    <motion.header
      initial={{ y: -16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.35 }}
      className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/85 backdrop-blur"
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <BrandLogo mode="icon" />
          <span className="text-sm font-semibold tracking-wide text-slate-800">SaarAI Console</span>
        </div>
        <nav className="flex items-center gap-2 overflow-x-auto">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                [
                  "rounded-lg px-3 py-2 text-sm transition-colors",
                  isActive ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100",
                ].join(" ")
              }
            >
              {link.label}
            </NavLink>
          ))}
          {isAuthenticated ? (
            <Button variant="ghost" className="ml-2" onClick={logout}>
              Logout
            </Button>
          ) : null}
        </nav>
      </div>
    </motion.header>
  );
}

export default Navbar;
