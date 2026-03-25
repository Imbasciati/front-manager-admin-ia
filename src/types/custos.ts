export interface CustoProfissao {
  profissao: string;
  inputTokens: number;
  outputTokens: number;
  custoUsd: number;
  totalConversas: number;
  totalMensagens: number;
}

export interface CustoDia {
  dia: string;
  inputTokens: number;
  outputTokens: number;
  custoUsd: number;
  mensagens: number;
}

export interface CustosAtendimentos {
  modelo: string;
  precoInputPorMilhao: number;
  precoOutputPorMilhao: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  totalCustoUsd: number;
  totalConversas: number;
  totalMensagens: number;
  mediaCustoPorConversa: number;
  porProfissao: CustoProfissao[];
  porDia: CustoDia[];
}
