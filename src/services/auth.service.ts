import type { ApiResponse } from "../types/api";
import type { Usuario } from "../types/user";
import { api } from "./api";

type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  usuario: Usuario;
};

export const authService = {
  async login(email: string, senha: string) {
    const { data } = await api.post<ApiResponse<LoginResponse>>("/auth/login", { email, senha });
    return data.data;
  },
  async refresh() {
    const { data } = await api.post<ApiResponse<{ accessToken: string }>>("/auth/refresh", {});
    return data.data;
  },
  async logout() {
    await api.post("/auth/logout", {});
  },
  async me() {
    const { data } = await api.get<ApiResponse<Usuario>>("/auth/me");
    return data.data;
  },
};

