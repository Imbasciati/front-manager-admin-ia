import type { ApiResponse, QueryParams } from "../types/api";
import { api } from "./api";

export const errosService = {
  async resumo() {
    const { data } = await api.get<ApiResponse<any>>("/erros/resumo");
    return data.data;
  },
  async list(params?: QueryParams) {
    const { data } = await api.get<ApiResponse<any[]>>("/erros", { params });
    return data;
  },
};

