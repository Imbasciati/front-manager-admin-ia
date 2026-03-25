import { useQuery } from "@tanstack/react-query";
import { agentesService } from "../services/agentes.service";

export const useAgentes = (page = 1, limit = 10) => {
  return useQuery({
    queryKey: ["agentes", page, limit],
    queryFn: () => agentesService.list({ page, limit }),
  });
};

