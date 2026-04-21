import { api } from "./api";
import type { ApiResponse } from "../types/api";

// ── tipos ─────────────────────────────────────────────────────────────────────

export interface ConexaoWABA {
  id:                string;
  nome:              string;
  wabaId:            string;
  phoneNumberId:     string;
  accessTokenMasked: string;
  displayPhone:      string | null;
  qualidade:         string | null;
  ativo:             boolean;
  agentesCount:      number;
  criadoEm:          string;
}

export interface ConexaoWABAManualPayload {
  nome:          string;
  wabaId:        string;
  phoneNumberId: string;
  accessToken:   string;
}

export interface TesteConexaoResult {
  ok:       boolean;
  mensagem: string;
}

export interface WABATemplate {
  id:         string;
  name:       string;
  status:     string;
  language:   string;
  category:   string;
  components: unknown[];
}

// ── service ───────────────────────────────────────────────────────────────────

export const conexaoWABAService = {
  list: (): Promise<ConexaoWABA[]> =>
    api.get<ApiResponse<ConexaoWABA[]>>("/configuracoes/waba/conexoes").then((r) => r.data.data),

  /** Recebe o code do Embedded Signup e conecta via OAuth */
  conectarOAuth: (code: string, nome: string): Promise<ConexaoWABA> =>
    api
      .post<ApiResponse<ConexaoWABA>>("/configuracoes/waba/oauth/callback", { code, nome })
      .then((r) => r.data.data),

  /** Cria a conexão inserindo as credenciais manualmente */
  createManual: (payload: ConexaoWABAManualPayload): Promise<ConexaoWABA> =>
    api
      .post<ApiResponse<ConexaoWABA>>("/configuracoes/waba/conexoes", payload)
      .then((r) => r.data.data),

  update: (id: string, payload: { nome?: string; accessToken?: string }): Promise<ConexaoWABA> =>
    api
      .put<ApiResponse<ConexaoWABA>>(`/configuracoes/waba/conexoes/${id}`, payload)
      .then((r) => r.data.data),

  remove: (id: string): Promise<{ deleted: boolean }> =>
    api
      .delete<ApiResponse<{ deleted: boolean }>>(`/configuracoes/waba/conexoes/${id}`)
      .then((r) => r.data.data),

  testar: (id: string): Promise<TesteConexaoResult> =>
    api
      .post<ApiResponse<TesteConexaoResult>>(`/configuracoes/waba/conexoes/${id}/testar`)
      .then((r) => r.data.data),

  getTemplates: (id: string): Promise<WABATemplate[]> =>
    api
      .get<ApiResponse<WABATemplate[]>>(`/configuracoes/waba/conexoes/${id}/templates`)
      .then((r) => r.data.data),
};
