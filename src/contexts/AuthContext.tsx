import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import toast from "react-hot-toast";
import type { Usuario } from "../types/user";
import { authService } from "../services/auth.service";
import { setAccessToken } from "../services/token-store";

type AuthContextData = {
  user: Usuario | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, senha: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextData | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Usuario | null>(null);
  const [accessToken, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const refreshed = await authService.refresh();
        setToken(refreshed.accessToken);
        setAccessToken(refreshed.accessToken);
        const me = await authService.me();
        setUser(me);
      } catch {
        setUser(null);
        setToken(null);
        setAccessToken(null);
      } finally {
        setLoading(false);
      }
    };
    void bootstrap();
  }, []);

  const value = useMemo(
    () => ({
      user,
      accessToken,
      loading,
      isAuthenticated: Boolean(user && accessToken),
      login: async (email: string, senha: string) => {
        const data = await authService.login(email, senha);
        setToken(data.accessToken);
        setAccessToken(data.accessToken);
        setUser(data.usuario);
        toast.success("Login realizado com sucesso");
      },
      logout: async () => {
        await authService.logout();
        setToken(null);
        setAccessToken(null);
        setUser(null);
      },
    }),
    [accessToken, loading, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth deve ser usado dentro de AuthProvider");
  }
  return context;
};


