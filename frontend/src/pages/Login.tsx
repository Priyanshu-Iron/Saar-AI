import { type FormEvent, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import BrandLogo from "../components/ui/BrandLogo";
import Button from "../components/ui/Button";
import ErrorNotice from "../components/ui/ErrorNotice";
import FormField from "../components/ui/FormField";
import { useAuth } from "../context/AuthContext";

export const NETWORK_ERROR = "Couldn't reach SaarAI. Check your connection and try again.";
export const CREDENTIAL_ERROR = "That password doesn't match this email. Try again.";

export function isNetworkError(err: unknown): boolean {
  return err instanceof TypeError;
}

export function BrandPanel({ title, body }: { title: string; body: string }) {
  return (
    <div className="relative hidden flex-col justify-end overflow-hidden p-12 lg:flex">
      <svg aria-hidden="true" viewBox="0 0 220 220" fill="none" className="pointer-events-none absolute bottom-0 right-0 h-72 w-72" style={{ opacity: "var(--mesh-opacity)" }}>
        <defs>
          <linearGradient id="brand-mesh" x1="0" x2="1">
            <stop stopColor="rgb(var(--cyan))" />
            <stop offset="0.6" stopColor="rgb(var(--violet))" />
            <stop offset="1" stopColor="rgb(var(--gold))" />
          </linearGradient>
        </defs>
        <g stroke="url(#brand-mesh)" strokeWidth="1">
          <path d="M30 40 L90 20 L150 45 L200 30 M30 40 L60 110 L90 20 M60 110 L150 45 L130 120 L200 30 M60 110 L40 180 L130 120 L170 190 L200 120 L130 120 M170 190 L200 30" />
        </g>
        <g fill="rgb(var(--cyan))"><circle cx="30" cy="40" r="3" /><circle cx="90" cy="20" r="3" /><circle cx="60" cy="110" r="3" /></g>
        <g fill="rgb(var(--violet))"><circle cx="150" cy="45" r="3" /><circle cx="130" cy="120" r="4" /><circle cx="40" cy="180" r="3" /></g>
        <g fill="rgb(var(--gold))"><circle cx="200" cy="30" r="3" /><circle cx="200" cy="120" r="5" /><circle cx="170" cy="190" r="3" /></g>
      </svg>
      <div className="mb-auto">
        <BrandLogo mode="mark" className="h-8 w-8" />
      </div>
      <h2 className="text-display" style={{ fontSize: 34 }}>{title}</h2>
      <p className="mt-3 max-w-prose text-body font-light text-ink-2">{body}</p>
    </div>
  );
}

export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<{ message: string; retry: boolean } | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const submit = async () => {
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      const target = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? "/dashboard";
      navigate(target, { replace: true });
    } catch (err) {
      setError(isNetworkError(err) ? { message: NETWORK_ERROR, retry: true } : { message: CREDENTIAL_ERROR, retry: false });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void submit();
  };

  return (
    <div className="mx-auto grid min-h-[calc(100vh-56px)] max-w-canvas lg:grid-cols-[1fr_420px]">
      <BrandPanel title="Welcome back." body="Your meetings, transcripts, and essence are where you left them." />
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 border-line bg-surface px-6 py-10 sm:px-9 lg:border-l">
        <h1 className="text-h2">Sign in</h1>
        <FormField label="Work email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <FormField label="Password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        {error ? <ErrorNotice message={error.message} onRetry={error.retry ? () => void submit() : undefined} /> : null}
        <Button type="submit" fullWidth disabled={loading}>
          {loading ? "Signing in" : "Sign in"}
        </Button>
        <p className="text-small text-ink-2">
          New to SaarAI?{" "}
          <Link to="/signup" className="text-violet hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet">
            Create an account
          </Link>
        </p>
      </form>
    </div>
  );
}

export default Login;
