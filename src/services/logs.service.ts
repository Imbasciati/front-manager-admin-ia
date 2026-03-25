import type { ApiResponse, QueryParams } from "../types/api";
import { api } from "./api";

export const logsService = {
  async ativos() {
    const { data } = await api.get<ApiResponse<any[]>>("/logs/ativos");
    return data.data;
  },
  async list(params?: QueryParams) {
    const { data } = await api.get<ApiResponse<any[]>>("/logs", { params });
    return data;
  },
  async porUsuario() {
    const { data } = await api.get<ApiResponse<any[]>>("/logs/por-usuario");
    return data.data;
  },
  async detalheUsuario(usuarioId: string, params?: QueryParams) {
    const { data } = await api.get<ApiResponse<any[]>>(`/logs/usuario/${usuarioId}`, { params });
    return data;
  },
};
