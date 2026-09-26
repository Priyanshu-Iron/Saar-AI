import { useState } from "react";
import { Navigate } from "react-router-dom";
import Button from "../components/ui/Button";
import ErrorNotice from "../components/ui/ErrorNotice";
import PageHeader from "../components/ui/PageHeader";
import { useAuth } from "../context/AuthContext";
import { NETWORK_ERROR } from "./Login";

export function Pending() {
  const { user, refresh, logout } = useAuth();
  const [checking, setChecking] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (user && user.status !== "pending") {
    return <Navigate to="/dashboard" replace />;
  }

  const check = async () => {
    setChecking(true);
    setNotice(null);
    setError(null);
    try {
      const next = await refresh();
      if (next?.status === "pending") setNotice("Still waiting. Check again later.");
    } catch {
      setError(NETWORK_ERROR);
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl space-y-6 py-10">
      <PageHeader
        title="Waiting for approval"
        subtitle="Your account is created. The admin will approve it soon, then you can send SaarAI to your meetings."
      />
      {notice ? (
        <p role="status" className="text-body text-ink-2">
          {notice}
        </p>
      ) : null}
      {error ? <ErrorNotice message={error} /> : null}
      <div className="flex gap-3">
        <Button onClick={() => void check()} disabled={checking}>
          {checking ? "Checking" : "Check again"}
        </Button>
        <Button variant="secondary" onClick={logout}>
          Log out
        </Button>
      </div>
    </div>
  );
}

export default Pending;
