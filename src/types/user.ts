export type Perfil = "ADMIN" | "SUPERVISOR" | "VENDEDOR";

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  perfil: Perfil;
  status: boolean;
  agenteIaId?: string | null;
  criadoEm: string;
}

