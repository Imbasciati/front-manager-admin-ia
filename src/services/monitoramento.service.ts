import type { ApiResponse } from "../types/api";
import { api } from "./api";

export const monitoramentoService = {
  async vendedores() {
    const { data } = await api.get<ApiResponse<any[]>>("/monitoramento/vendedores");
    return data.data;
  },
  async historico(usuarioId: string) {
    const { data } = await api.get<ApiResponse<any[]>>(`/monitoramento/${usuarioId}`);
    return data.data;
  },
  async stats(usuarioId: string) {
    const { data } = await api.get<ApiResponse<any>>(`/monitoramento/${usuarioId}/stats`);
    return data.data;
  },
  async agentesStatus() {
    const { data } = await api.get<ApiResponse<AgenteStatus[]>>("/monitoramento/agentes");
    return data.data;
  },
  async logsAgente(agenteId: string) {
    const { data } = await api.get<ApiResponse<LogInteracao[]>>(`/monitoramento/agentes/${agenteId}/logs`);
    return data.data;
  },
  async eventosAgente(agenteId: string, opts: { erros?: boolean; limit?: number; offset?: number } = {}) {
    const params: Record<string, unknown> = { limit: opts.limit ?? 50, offset: opts.offset ?? 0 };
    if (opts.erros) params.erros = "true";
    const { data } = await api.get<ApiResponse<EventosResp>>(`/monitoramento/agentes/${agenteId}/eventos`, { params });
    return data.data;
  },
  async errosAgente(agenteId: string) {
    const { data } = await api.get<ApiResponse<ErroExecucao[]>>(`/monitoramento/agentes/${agenteId}/erros`);
    return data.data;
  },
  async conexoesStatus() {
    const { data } = await api.get<ApiResponse<ConexaoStatus[]>>("/monitoramento/conexoes");
    return data.data;
  },
  async verificarConexao(agenteId: string) {
    const { data } = await api.post<ApiResponse<{ status: string; detalhe: string }>>(`/monitoramento/agentes/${agenteId}/verificar`);
    return data.data;
  },
};

export interface AgenteStatus {
  id: string;
  nome: string;
  modelo: string;
  ativo: boolean;
  situacao: "ativo" | "inativo" | "problema";
  totalInteracoes: number;
  ultimaInteracao: string | null;
}

export interface LogInteracao {
  id: string;
  campanha: string;
  telefone: string;
  mensagemOriginal: string;
  respostaIA: string;
  statusResposta: "SUGESTAO" | "AUTO_RESPOSTA" | "EDITADA" | "IGNORADA";
  criadoEm: string;
  usuario: { id: string; nome: string };
}

export interface EventoAgente {
  id: string;
  agenteId: string;
  tipo: "MENSAGEM_RECEBIDA" | "LOTE_PROCESSADO" | "ERRO_WEBHOOK";
  canal: string;
  contactId: string | null;
  payload: Record<string, unknown>;
  erro: string | null;
  criadoEm: string;
}

export interface ResumoEventos {
  total: number;
  erros: number;
  desde: string;
}

export interface EventosResp {
  eventos: EventoAgente[];
  resumo: ResumoEventos;
}

export interface ErroExecucao {
  id: string;
  contactId: string;
  modelo: string;
  canal: string;
  inputMensagem: string;
  erro: string;
  duracao: number;
  criadoEm: string;
}

export interface ConexaoStatus {
  agenteId: string;
  nome: string;
  unnichatAtivo: boolean;
  status: "ONLINE" | "OFFLINE" | "ERRO" | "DESCONHECIDO";
  detalhe: string | null;
  verificadoEm: string | null;
}

