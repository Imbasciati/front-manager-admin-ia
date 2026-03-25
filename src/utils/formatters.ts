import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const formatarDataHora = (value: string | Date) => {
  return format(new Date(value), "dd/MM/yyyy HH:mm", { locale: ptBR });
};

export const formatarMoedaUsd = (value: number) => {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "USD" }).format(value);
};
