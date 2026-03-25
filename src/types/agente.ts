export type Tom = "PROFISSIONAL" | "CASUAL" | "FORMAL" | "AMIGAVEL";
export type CanalIntegracao = "NENHUM" | "UNNICHAT" | "MANYCHAT" | "AMBOS";

export interface Documento {
  id: string;
  nome: string;
  path: string;
  tamanho: number;
  criadoEm: string;
}

export interface Agente {
  id: string;
  nome: string;
  promptSistema: string;
  contextoProdutos?: string | null;
  tom: Tom;
  modelo: string;
  temperatura: number;
  tokensMaximos: number;
  ativo: boolean;
  todosVendedores: boolean;
  criadoEm: string;
  documentos: Documento[];
  canalIntegracao?: CanalIntegracao;
  unnichatApiKey?: string | null;
  unnichatAtivo?: boolean;
  unnichatConexaoNome?: string | null;
  produto?: string | null;
  atuacao?: string | null;
}
