import type { ApiResponse } from "../types/api";
import { api } from "./api";

export const orientacoesService = {
  async get() {
    const { data } = await api.get<ApiResponse<any>>("/orientacoes");
    return data.data;
  },
  async update(conteudo: string) {
    const { data } = await api.put<ApiResponse<any>>("/orientacoes", { conteudo });
    return data.data;
  },
  async restore() {
    const { data } = await api.post<ApiResponse<any>>("/orientacoes/restaurar");
    return data.data;
  },
};

