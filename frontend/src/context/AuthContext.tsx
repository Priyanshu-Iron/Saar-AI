import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ACCESS_EVENT, type AccountStatus, ApiError, authApi, clearApiKey, hasApiKey, setApiKey } from "../api";

type AuthUser = {
  email: string;
  name?: string;
  status: AccountStatus;
  isAdmin: boolean;
};

type AuthContextValue = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  signup: (email: string, password: string, name?: string) => Promise<AuthUser>;
  logout: () => void;
  /** Re-read status from the API; resolves to the updated user, or null if signed out. */
  refresh: () => Promise<AuthUser | null>;
};

const AUTH_STORAGE_KEY = "saarai_auth_user";

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function toUser(res: { email: string; status: AccountStatus; is_admin: boolean }, name?: string): AuthUser {
  const user: AuthUser = { email: res.email, status: res.status, isAdmin: res.is_admin };
  return name ? { ...user, name } : user;
}

function readStoredUser(): AuthUser | null {
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw || !hasApiKey()) return null;
    const parsed = JSON.parse(raw) as Partial<AuthUser>;
    if (!parsed.email) return null;
    // Sessions stored before approvals existed have no status; /auth/me corrects it on load.
    const user: AuthUser = { email: parsed.email, status: parsed.status ?? "approved", isAdmin: parsed.isAdmin ?? false };
    return parsed.name ? { ...user, name: parsed.name } : user;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const userRef = useRef<AuthUser | null>(null);
  userRef.current = user;

  const writeUser = (nextUser: AuthUser | null) => {
    if (!nextUser || nextUser.status === "disabled") {
      setUser(null);
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
      clearApiKey();
      return;
    }
    setUser(nextUser);
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextUser));
  };

  useEffect(() => {
    const stored = readStoredUser();
    if (!stored) {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
      setIsLoading(false);
      return;
    }
    setUser(stored);
    let cancelled = false;
    authApi
      .me()
      .then((me) => {
        if (!cancelled) writeUser(toUser(me, stored.name));
      })
      .catch((err) => {
        // Offline or server trouble keeps the stored session; a rejected key ends it.
        if (!cancelled && err instanceof ApiError && err.status === 401) writeUser(null);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onAccess = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail;
      const current = userRef.current;
      if (!current) return;
      if (detail === "session_expired" || detail === "account_disabled") {
        writeUser(null);
        return;
      }
      writeUser({ ...current, status: "pending" });
    };
    window.addEventListener(ACCESS_EVENT, onAccess);
    return () => window.removeEventListener(ACCESS_EVENT, onAccess);
  }, []);

  const login = async (email: string, password: string) => {
    const res = await authApi.login(email, password);
    setApiKey(res.api_key);
    const next = toUser(res);
    writeUser(next);
    return next;
  };

  const signup = async (email: string, password: string, name?: string) => {
    const res = await authApi.register(email, password);
    setApiKey(res.api_key);
    const next = toUser(res, name?.trim() || undefined);
    writeUser(next);
    return next;
  };

  const logout = () => {
    writeUser(null);
  };

  const refresh = async () => {
    try {
      const next = toUser(await authApi.me(), userRef.current?.name);
      writeUser(next);
      return next.status === "disabled" ? null : next;
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        writeUser(null);
        return null;
      }
      throw err;
    }
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isLoading,
      login,
      signup,
      logout,
      refresh,
    }),
    [user, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}

export default AuthContext;
