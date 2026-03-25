import type { ApiResponse, QueryParams } from "../types/api";
import type { Usuario } from "../types/user";
import { api } from "./api";

const toQuery = (params?: QueryParams) => ({ params });

export const usuariosService = {
  async list(params?: QueryParams) {
    const { data } = await api.get<ApiResponse<Usuario[]>>("/usuarios", toQuery(params));
    return data;
  },
  async create(payload: Partial<Usuario> & { senha: string }) {
    const { data } = await api.post<ApiResponse<Usuario>>("/usuarios", payload);
    return data.data;
  },
  async update(id: string, payload: Partial<Usuario>) {
    const { data } = await api.put<ApiResponse<Usuario>>(`/usuarios/${id}`, payload);
    return data.data;
  },
  async changeSenha(id: string, senha: string) {
    const { data } = await api.patch<ApiResponse<{ message: string }>>(`/usuarios/${id}/senha`, { senha });
    return data.data;
  },
  async changeStatus(id: string, status: boolean) {
    const { data } = await api.patch<ApiResponse<{ id: string; status: boolean }>>(`/usuarios/${id}/status`, {
      status,
    });
    return data.data;
  },
  async reenviarAcesso(id: string) {
    const { data } = await api.post<ApiResponse<{ message: string }>>(`/usuarios/${id}/reenviar-acesso`);
    return data.data;
  },
  async remove(id: string) {
    await api.delete(`/usuarios/${id}`);
  },
};

