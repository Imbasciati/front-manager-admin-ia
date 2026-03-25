export interface ModeloIA {
  id: string;
  nome: string;
  modelId: string;
  provider: string;
  descricao?: string | null;
  ativo: boolean;
  custoInputPorMilToken: number;
  custoOutputPorMilToken: number;
  criadoEm: string;
  atualizadoEm: string;
}

export type ProviderSlug = "openai" | "anthropic" | "google";

export interface ConfiguracaoProvedor {
  provider: ProviderSlug;
  configurado: boolean;
  ativo: boolean;
  verificado: boolean;
  apiKeyMascarada: string | null;
  atualizadoEm: string | null;
}
