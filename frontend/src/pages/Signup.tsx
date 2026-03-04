import { motion } from "framer-motion";
import { type FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Button from "../components/ui/Button";
import BrandLogo from "../components/ui/BrandLogo";
import FormField from "../components/ui/FormField";
import { useAuth } from "../context/AuthContext";

export function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    try {
      await signup(email, password);
      navigate("/dashboard", { replace: true });
    } catch (err: any) {
      setError(err.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-2">
      <motion.div
        initial={{ opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
        className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-cyan-500 via-sky-600 to-blue-700 p-8 text-white"
      >
        <BrandLogo className="h-16" />
        <div className="absolute -right-10 -top-12 h-44 w-44 rounded-full bg-white/20 blur-xl" />
        <div className="absolute bottom-0 left-8 h-40 w-40 rounded-full bg-emerald-300/20 blur-xl" />
        <p className="mt-3 text-xs uppercase tracking-[0.2em] text-cyan-100">Get Started</p>
        <h1 className="mt-4 text-4xl font-semibold">Create your SaarAI workspace</h1>
        <p className="mt-4 max-w-md text-cyan-100">
          Connect conversations to clear decisions with automated MOM, insights, and strategy.
        </p>
      </motion.div>

      <motion.form
        initial={{ opacity: 0, x: 12 }}
        animate={{ opacity: 1, x: 0 }}
        onSubmit={handleSubmit}
        className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8"
      >
        <h2 className="text-2xl font-semibold text-slate-900">Sign Up</h2>
        <p className="mt-2 text-sm text-slate-500">Create your account to get started.</p>

        {error && (
          <div className="mt-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="mt-6 space-y-4">
          <FormField label="Work Email" type="email" placeholder="founder@company.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <FormField label="Password" type="password" hint="Minimum 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <Button type="submit" className="mt-6" fullWidth disabled={loading}>
          {loading ? "Creating account…" : "Create Account"}
        </Button>
        <p className="mt-4 text-center text-sm text-slate-500">
          Already have an account? <Link to="/login" className="font-medium text-sky-600">Login</Link>
        </p>
      </motion.form>
    </div>
  );
}

export default Signup;
