import { useQuery } from "@tanstack/react-query";
import { usuariosService } from "../services/usuarios.service";

export const useUsers = (page = 1, limit = 10) => {
  return useQuery({
    queryKey: ["usuarios", page, limit],
    queryFn: () => usuariosService.list({ page, limit }),
  });
};

