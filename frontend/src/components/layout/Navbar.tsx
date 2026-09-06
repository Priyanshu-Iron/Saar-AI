import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import BrandLogo from "../ui/BrandLogo";

const linkClass = ({ isActive }: { isActive: boolean }) =>
  [
    "rounded-control px-3 py-1.5 text-small transition-colors",
    isActive ? "text-ink" : "text-ink-2 hover:text-ink",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2 focus-visible:ring-offset-ground",
  ].join(" ");

export function Navbar() {
  const { isAuthenticated, logout } = useAuth();

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-ground/70 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-canvas items-center gap-3 px-4 sm:px-8">
        <Link to="/overview" className="flex items-center gap-2" aria-label="SaarAI home">
          <BrandLogo mode="mark" className="h-6 w-6" />
          <span className="text-h3" style={{ fontStretch: "115%" }}>SaarAI</span>
        </Link>
        <nav className="ml-auto flex items-center gap-1">
          {isAuthenticated ? (
            <>
              <NavLink to="/dashboard" className={linkClass}>Dashboard</NavLink>
              <button type="button" onClick={logout} className={linkClass({ isActive: false })}>Sign out</button>
            </>
          ) : (
            <>
              <NavLink to="/overview" className={linkClass}>Overview</NavLink>
              <NavLink to="/login" className={linkClass}>Sign in</NavLink>
              <Link
                to="/signup"
                className="ml-1 rounded-control bg-violet px-3 py-1.5 text-small text-white hover:bg-violet/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2 focus-visible:ring-offset-ground"
              >
                Create account
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

export default Navbar;
