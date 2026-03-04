import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { authApi, setApiKey, clearApiKey, hasApiKey } from "../api";

type AuthUser = {
  email: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AUTH_STORAGE_KEY = "saarai_auth_user";

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
      if (raw && hasApiKey()) {
        const parsed = JSON.parse(raw) as AuthUser;
        if (parsed.email) {
          setUser(parsed);
        }
      } else {
        // No API key means not authenticated
        window.localStorage.removeItem(AUTH_STORAGE_KEY);
      }
    } catch {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const writeUser = (nextUser: AuthUser | null) => {
    setUser(nextUser);
    if (!nextUser) {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
      clearApiKey();
      return;
    }
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextUser));
  };

  const login = async (email: string, password: string) => {
    const res = await authApi.login(email, password);
    setApiKey(res.api_key);
    writeUser({ email });
  };

  const signup = async (email: string, password: string) => {
    const res = await authApi.register(email, password);
    setApiKey(res.api_key);
    writeUser({ email });
  };

  const logout = () => {
    writeUser(null);
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isLoading,
      login,
      signup,
      logout,
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
