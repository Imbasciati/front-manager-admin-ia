// ── Conversas Supabase ────────────────────────────────────────────────────────

export interface ProfissaoResumo {
  profissao: string;
  totalSessoes: number;
  totalMensagens: number;
}

export interface Sessao {
  sessionId: string;
  totalMensagens: number;
  primeiraMensagem: string;
  ultimaAtividade: string | null;
}

export interface StatsConversas {
  totalConversas: number;
  totalMensagens: number;
  mediaMsgPorConversa: number;
  maisAtiva: { profissao: string; totalSessoes: number } | null;
  porProfissao: ProfissaoResumo[];
}

export type TipoMensagem = "human" | "ai";

export interface MensagemConversa {
  id: number | string;
  tipo: TipoMensagem;
  conteudo: string;
  criadoEm: string | null;
}

// ── Webhook-based (mantido para configurações) ────────────────────────────────

export type StatusAtendimento = "NOVO" | "EM_ANDAMENTO" | "AGUARDANDO" | "FINALIZADO";
export type OrigemMensagem = "CLIENTE" | "AGENTE_IA" | "VENDEDOR";

export interface MensagemAtendimento {
  id: string;
  atendimentoId: string;
  origem: OrigemMensagem;
  conteudo: string;
  criadoEm: string;
}

export interface Atendimento {
  id: string;
  conversaId?: string | null;
  telefone: string;
  nome?: string | null;
  campanha?: string | null;
  canal: string;
  status: StatusAtendimento;
  mensagens: MensagemAtendimento[];
  _count?: { mensagens: number };
  criadoEm: string;
  atualizadoEm: string;
}

export interface ConfiguracaoWebhook {
  id: string;
  nome: string;
  token: string;
  ativo: boolean;
  descricao?: string | null;
  totalEventos: number;
  ultimoEventoEm?: string | null;
  criadoEm: string;
  atualizadoEm: string;
}
