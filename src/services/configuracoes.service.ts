import { api } from "./api";
import type { ConfiguracaoProvedor, ModeloIA, ProviderSlug } from "../types/configuracoes";
import type { ApiResponse } from "../types/api";

const BASE = "/configuracoes/modelos";

export const modelosService = {
  list: (params?: { page?: number; limit?: number; ativo?: boolean }) =>
    api.get<ApiResponse<ModeloIA[]>>(BASE, { params }).then((r) => r.data),

  get: (id: string) =>
    api.get<ApiResponse<ModeloIA>>(`${BASE}/${id}`).then((r) => r.data.data),

  create: (payload: Omit<ModeloIA, "id" | "criadoEm" | "atualizadoEm">) =>
    api.post<ApiResponse<ModeloIA>>(BASE, payload).then((r) => r.data.data),

  update: (id: string, payload: Partial<Omit<ModeloIA, "id" | "criadoEm" | "atualizadoEm">>) =>
    api.put<ApiResponse<ModeloIA>>(`${BASE}/${id}`, payload).then((r) => r.data.data),

  changeStatus: (id: string, ativo: boolean) =>
    api.patch<ApiResponse<ModeloIA>>(`${BASE}/${id}/status`, { ativo }).then((r) => r.data.data),

  remove: (id: string) =>
    api.delete(`${BASE}/${id}`).then((r) => r.data),
};

const BASE_PROV = "/configuracoes/provedores";

export const provedoresService = {
  list: () =>
    api.get<ApiResponse<ConfiguracaoProvedor[]>>(BASE_PROV).then((r) => r.data.data),

  save: (provider: ProviderSlug, payload: { apiKey: string; ativo?: boolean }) =>
    api.put<ApiResponse<ConfiguracaoProvedor>>(`${BASE_PROV}/${provider}`, payload).then((r) => r.data.data),

  toggle: (provider: ProviderSlug, ativo: boolean) =>
    api.patch<ApiResponse<{ provider: string; ativo: boolean }>>(`${BASE_PROV}/${provider}/toggle`, { ativo }).then((r) => r.data.data),

  testar: (provider: ProviderSlug) =>
    api.post<ApiResponse<{ ok: boolean; mensagem: string; modelo?: string }>>(`${BASE_PROV}/${provider}/testar`).then((r) => r.data.data),
};
