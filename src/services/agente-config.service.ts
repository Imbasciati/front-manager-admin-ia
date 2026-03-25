import { api } from "./api";
import type { ApiResponse } from "../types/api";

export interface ConfigCampo {
  chave: string;
  descricao: string;
  sensivel: boolean;
  padrao?: string;
  fonte: "database" | "env" | "padrao" | "nao_configurado";
  valor: string;
  configurado: boolean;
}

export const agenteConfigService = {
  list: (): Promise<ConfigCampo[]> =>
    api.get<ApiResponse<ConfigCampo[]>>("/configuracoes/agente").then((r) => r.data.data),

  update: (chave: string, valor: string): Promise<{ updated: boolean }> =>
    api
      .put<ApiResponse<{ updated: boolean }>>(`/configuracoes/agente/${chave}`, { valor })
      .then((r) => r.data.data),

  remove: (chave: string): Promise<{ deleted: boolean }> =>
    api
      .delete<ApiResponse<{ deleted: boolean }>>(`/configuracoes/agente/${chave}`)
      .then((r) => r.data.data),
};
