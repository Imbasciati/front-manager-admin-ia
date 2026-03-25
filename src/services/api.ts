import axios from "axios";
import toast from "react-hot-toast";
import { getAccessToken, setAccessToken } from "./token-store";

/**
 * Resolução dinâmica da URL da API:
 * - localhost → usa VITE_NGROK_URL (túnel ngrok para dev local)
 * - qualquer outro domínio → deriva do próprio origin do browser (produção)
 */
function resolveBaseURL(): string {
  if (typeof window !== "undefined" && window.location.hostname === "localhost") {
    return import.meta.env.VITE_NGROK_URL ?? import.meta.env.VITE_API_URL;
  }
  // Em produção, deriva a URL da API a partir da origem do browser
  if (typeof window !== "undefined") {
    const origin = window.location.origin;
    // Se há uma URL de API explícita configurada para produção, usa ela
    if (import.meta.env.VITE_API_URL && !import.meta.env.VITE_API_URL.includes("localhost")) {
      return import.meta.env.VITE_API_URL;
    }
    // Fallback: substitui o subdomínio "app" por "api-manager", ou adiciona "/api"
    return `${origin}/api`;
  }
  return import.meta.env.VITE_API_URL;
}

const baseURL = resolveBaseURL();

export const api = axios.create({
  baseURL,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshingPromise: Promise<string> | null = null;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    if (error.response?.status === 401 && !original._retry && !String(original.url).includes("/auth/login") && !String(original.url).includes("/auth/refresh")) {
      original._retry = true;
      try {
        if (!refreshingPromise) {
          refreshingPromise = api
            .post("/auth/refresh", {})
            .then((res) => {
              const token = res.data.data.accessToken as string;
              setAccessToken(token);
              return token;
            })
            .finally(() => {
              refreshingPromise = null;
            });
        }

        const token = await refreshingPromise;
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      } catch (refreshError) {
        setAccessToken(null);
        toast.error("Sessão expirada. Faça login novamente.");
        return Promise.reject(refreshError);
      }
    }

    const isAuthEndpoint = String(original.url).includes("/auth/refresh") || String(original.url).includes("/auth/login");
    if (error.response?.data?.error && !(isAuthEndpoint && error.response?.status === 401)) {
      toast.error(error.response.data.error);
    }

    return Promise.reject(error);
  },
);

