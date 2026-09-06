import { type FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Button from "../components/ui/Button";
import ErrorNotice from "../components/ui/ErrorNotice";
import FormField from "../components/ui/FormField";
import { useAuth } from "../context/AuthContext";
import { BrandPanel, isNetworkError, NETWORK_ERROR } from "./Login";

const SHORT_PASSWORD = "Use at least 8 characters.";

export function Signup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | undefined>();
  const [error, setError] = useState<{ message: string; retry: boolean } | null>(null);
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  const submit = async () => {
    setError(null);
    if (password.length < 8) {
      setPasswordError(SHORT_PASSWORD);
      return;
    }
    setPasswordError(undefined);
    setLoading(true);
    try {
      await signup(email, password, name);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(
        isNetworkError(err)
          ? { message: NETWORK_ERROR, retry: true }
          : { message: err instanceof Error && err.message ? err.message : "Couldn't create the account. Try again.", retry: false },
      );
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
      <BrandPanel title="Start with one meeting." body="Send a bot to your next call and read the essence when it ends." />
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4 border-line bg-surface px-6 py-10 sm:px-9 lg:border-l">
        <h1 className="text-h2">Create account</h1>
        <FormField label="Full name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} required />
        <FormField label="Work email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <FormField
          label="Password"
          type="password"
          autoComplete="new-password"
          hint="At least 8 characters"
          error={passwordError}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error ? <ErrorNotice message={error.message} onRetry={error.retry ? () => void submit() : undefined} /> : null}
        <Button type="submit" fullWidth disabled={loading}>
          {loading ? "Creating account" : "Create account"}
        </Button>
        <p className="text-small text-ink-2">
          Already have an account?{" "}
          <Link to="/login" className="text-violet hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}

export default Signup;
