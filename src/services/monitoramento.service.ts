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

