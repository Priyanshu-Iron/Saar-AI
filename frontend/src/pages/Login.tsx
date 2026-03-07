import { motion } from "framer-motion";
import { type FormEvent, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Button from "../components/ui/Button";
import BrandLogo from "../components/ui/BrandLogo";
import FormField from "../components/ui/FormField";
import { useAuth } from "../context/AuthContext";

export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      const redirectTarget = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? "/dashboard";
      navigate(redirectTarget, { replace: true });
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[1.1fr_1fr]">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="hidden rounded-3xl border border-white/60 bg-white/70 backdrop-blur-sm p-8 lg:block shadow-[0_8px_32px_-8px_rgba(15,23,42,0.08)]">
        <BrandLogo className="h-16" />
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Welcome Back</p>
        <h1 className="mt-4 text-4xl font-bold text-slate-900">Meeting intelligence without the clutter.</h1>
        <p className="mt-4 text-slate-600">Sign in to access your latest summaries, insights, and strategy outputs.</p>
      </motion.div>

      <motion.form
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        onSubmit={handleSubmit}
        className="rounded-3xl border border-white/60 bg-white/70 backdrop-blur-sm p-6 shadow-[0_20px_50px_-28px_rgba(13,89,242,0.3)] sm:p-8"
      >
        <h2 className="text-2xl font-bold text-slate-900">Login</h2>
        <p className="mt-2 text-sm text-slate-500">Use your account credentials to continue.</p>

        {error && (
          <div className="mt-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="mt-6 space-y-4">
          <FormField label="Email" type="email" placeholder="name@company.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <FormField label="Password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>

        <div className="mt-3 text-right">
          <button type="button" className="text-xs text-primary-600 hover:text-primary-500 font-medium">Forgot Password?</button>
        </div>

        <Button type="submit" className="mt-4" fullWidth disabled={loading}>
          {loading ? "Signing in…" : "Sign In"}
        </Button>

        {/* Social Login */}
        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white/70 px-3 text-slate-400">or continue with</span>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <button type="button" className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-all hover:bg-slate-50 hover:shadow-sm">
              <svg className="h-4 w-4" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
              Google
            </button>
            <button type="button" className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-all hover:bg-slate-50 hover:shadow-sm">
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" /></svg>
              GitHub
            </button>
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-slate-500">
          New here? <Link to="/signup" className="font-medium text-primary-600 hover:text-primary-500">Create an account</Link>
        </p>
      </motion.form>
    </div>
  );
}

export default Login;
