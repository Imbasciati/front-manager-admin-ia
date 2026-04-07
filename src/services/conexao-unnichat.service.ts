import { api } from "./api";
import type { ApiResponse } from "../types/api";

export interface ConexaoUnnichat {
  id: string;
  nome: string;
  apiKeyMasked: string;
  ativo: boolean;
  agentesCount: number;
  criadoEm: string;
}

export interface ConexaoUnnichatPayload {
  nome: string;
  apiKey: string;
  ativo?: boolean;
}

export interface TesteConexaoResult {
  ok: boolean;
  mensagem: string;
}

export const conexaoUnnichatService = {
  list: (): Promise<ConexaoUnnichat[]> =>
    api.get<ApiResponse<ConexaoUnnichat[]>>("/configuracoes/unnichat/conexoes").then((r) => r.data.data),

  create: (payload: ConexaoUnnichatPayload): Promise<ConexaoUnnichat> =>
    api.post<ApiResponse<ConexaoUnnichat>>("/configuracoes/unnichat/conexoes", payload).then((r) => r.data.data),

  update: (id: string, payload: Partial<ConexaoUnnichatPayload>): Promise<ConexaoUnnichat> =>
    api.put<ApiResponse<ConexaoUnnichat>>(`/configuracoes/unnichat/conexoes/${id}`, payload).then((r) => r.data.data),

  remove: (id: string): Promise<{ deleted: boolean }> =>
    api.delete<ApiResponse<{ deleted: boolean }>>(`/configuracoes/unnichat/conexoes/${id}`).then((r) => r.data.data),

  testar: (id: string): Promise<TesteConexaoResult> =>
    api.post<ApiResponse<TesteConexaoResult>>(`/configuracoes/unnichat/conexoes/${id}/testar`).then((r) => r.data.data),
};
