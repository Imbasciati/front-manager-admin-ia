import type { ApiResponse, QueryParams } from "../types/api";
import { api } from "./api";

export const usoService = {
  async resumo(params?: QueryParams) {
    const { data } = await api.get<ApiResponse<any>>("/uso", { params });
    return data.data;
  },
  async porHora(params?: QueryParams) {
    const { data } = await api.get<ApiResponse<any[]>>("/uso/por-hora", { params });
    return data.data;
  },
};

