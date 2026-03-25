import { api } from "./api";
import type { ConfiguracaoWebhook, ProfissaoResumo, Sessao, MensagemConversa, StatsConversas } from "../types/atendimento";
import type { ApiResponse } from "../types/api";

// ── Atendimentos Unnichat ─────────────────────────────────────────────────────

export const atendimentosService = {
  list: () =>
    api.get<ApiResponse<any[]>>("/atendimentos").then((r) => r.data.data),

  getMensagens: (atendimentoId: string) =>
    api.get<ApiResponse<any[]>>(`/atendimentos/${atendimentoId}/mensagens`).then((r) => r.data.data),
};

// ── Conversas Supabase ────────────────────────────────────────────────────────

export const conversasService = {
  stats: () =>
    api.get<ApiResponse<StatsConversas>>("/conversas/stats").then((r) => r.data.data),

  listProfissoes: () =>
    api.get<ApiResponse<ProfissaoResumo[]>>("/conversas/profissoes").then((r) => r.data.data),

  listSessoes: (profissao: string) =>
    api.get<ApiResponse<Sessao[]>>(`/conversas/${profissao}/sessoes`).then((r) => r.data.data),

  getMensagens: (profissao: string, sessionId: string) =>
    api
      .get<ApiResponse<MensagemConversa[]>>(
        `/conversas/${profissao}/sessoes/${encodeURIComponent(sessionId)}/mensagens`,
      )
      .then((r) => r.data.data),
};

// ── Webhooks ──────────────────────────────────────────────────────────────────

export const webhooksService = {
  list: () =>
    api.get<ApiResponse<ConfiguracaoWebhook[]>>("/configuracoes/webhooks").then((r) => r.data.data),

  create: (payload: { nome: string; descricao?: string }) =>
    api.post<ApiResponse<ConfiguracaoWebhook>>("/configuracoes/webhooks", payload).then((r) => r.data.data),

  update: (id: string, payload: { nome?: string; descricao?: string; ativo?: boolean }) =>
    api.put<ApiResponse<ConfiguracaoWebhook>>(`/configuracoes/webhooks/${id}`, payload).then((r) => r.data.data),

  regenerarToken: (id: string) =>
    api.post<ApiResponse<ConfiguracaoWebhook>>(`/configuracoes/webhooks/${id}/regenerar-token`).then((r) => r.data.data),

  remove: (id: string) =>
    api.delete(`/configuracoes/webhooks/${id}`).then((r) => r.data),
};
