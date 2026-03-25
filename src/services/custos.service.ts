import type { ApiResponse, QueryParams } from "../types/api";
import { api } from "./api";
import type { CustosAtendimentos } from "../types/custos";

export { type CustosAtendimentos };

export const custosService = {
  async custosAtendimentos(params?: { dataInicio?: string; dataFim?: string }) {
    const { data } = await api.get<ApiResponse<CustosAtendimentos>>("/conversas/custos", { params });
    return data.data;
  },
  async resumo() {
    const { data } = await api.get<ApiResponse<any>>("/custos/resumo");
    return data.data;
  },
  async porModelo(params?: QueryParams) {
    const { data } = await api.get<ApiResponse<any[]>>("/custos/por-modelo", { params });
    return data.data;
  },
  async porVendedor() {
    const { data } = await api.get<ApiResponse<any[]>>("/custos/por-vendedor");
    return data.data;
  },
  async tendencia() {
    const { data } = await api.get<ApiResponse<any[]>>("/custos/tendencia");
    return data.data;
  },
  async log(params?: QueryParams) {
    const { data } = await api.get<ApiResponse<any[]>>("/custos/log", { params });
    return data;
  },
};

