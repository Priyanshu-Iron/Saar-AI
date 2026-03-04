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
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="hidden rounded-3xl border border-slate-200 bg-white p-8 lg:block">
        <BrandLogo className="h-16" />
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Welcome Back</p>
        <h1 className="mt-4 text-4xl font-semibold text-slate-900">Meeting intelligence without the clutter.</h1>
        <p className="mt-4 text-slate-600">Sign in to access your latest summaries, insights, and strategy outputs.</p>
      </motion.div>

      <motion.form
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        onSubmit={handleSubmit}
        className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_20px_50px_-28px_rgba(15,23,42,0.4)] sm:p-8"
      >
        <h2 className="text-2xl font-semibold text-slate-900">Login</h2>
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
        <Button type="submit" className="mt-6" fullWidth disabled={loading}>
          {loading ? "Signing in…" : "Sign In"}
        </Button>
        <p className="mt-4 text-center text-sm text-slate-500">
          New here? <Link to="/signup" className="font-medium text-sky-600">Create an account</Link>
        </p>
      </motion.form>
    </div>
  );
}

export default Login;
