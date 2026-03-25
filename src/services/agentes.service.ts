import type { Agente } from "../types/agente";
import type { ApiResponse, QueryParams } from "../types/api";
import { api } from "./api";

export const agentesService = {
  async list(params?: QueryParams) {
    const { data } = await api.get<ApiResponse<Agente[]>>("/agentes", { params });
    return data;
  },
  async get(id: string) {
    const { data } = await api.get<ApiResponse<Agente>>(`/agentes/${id}`);
    return data.data;
  },
  async create(payload: FormData) {
    const { data } = await api.post<ApiResponse<Agente>>("/agentes", payload, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data.data;
  },
  async update(id: string, payload: Partial<Agente>) {
    const { data } = await api.put<ApiResponse<Agente>>(`/agentes/${id}`, payload);
    return data.data;
  },
  async duplicar(id: string) {
    const { data } = await api.post<ApiResponse<Agente>>(`/agentes/${id}/duplicar`);
    return data.data;
  },
  async status(id: string, ativo: boolean) {
    const { data } = await api.patch<ApiResponse<{ id: string; ativo: boolean }>>(`/agentes/${id}/status`, { ativo });
    return data.data;
  },
  async remove(id: string) {
    await api.delete(`/agentes/${id}`);
  },
  async chat(id: string, mensagem: string) {
    const { data } = await api.post<ApiResponse<{ resposta: string }>>(`/agentes/${id}/chat`, { mensagem });
    return data.data;
  },
  async removeDocumento(id: string, docId: string) {
    const { data } = await api.delete<ApiResponse<{ message: string }>>(`/agentes/${id}/documentos/${docId}`);
    return data.data;
  },
  async testarUnnichat(id: string) {
    const { data } = await api.post<ApiResponse<{ ok: boolean; mensagem: string }>>(`/agentes/${id}/unnichat/testar`);
    return data.data;
  },
};

