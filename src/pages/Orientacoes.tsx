import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { PageHeader } from "../components/shared/PageHeader";
import { Card } from "../components/ui/card";
import { Textarea } from "../components/ui/textarea";
import { Button } from "../components/ui/button";
import { orientacoesService } from "../services/orientacoes.service";

const schema = z.object({
  conteudo: z.string().min(10, "Conteúdo deve ter ao menos 10 caracteres"),
});

type Values = z.infer<typeof schema>;

export function Orientacoes() {
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: ["orientacoes"], queryFn: orientacoesService.get });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(schema),
    values: { conteudo: data?.conteudo ?? "" },
  });

  const saveMutation = useMutation({
    mutationFn: (values: Values) => orientacoesService.update(values.conteudo),
    onSuccess: () => {
      toast.success("Orientação atualizada");
      void queryClient.invalidateQueries({ queryKey: ["orientacoes"] });
    },
  });

  const restoreMutation = useMutation({
    mutationFn: orientacoesService.restore,
    onSuccess: (payload) => {
      reset({ conteudo: payload.conteudo });
      toast.success("Orientação restaurada");
    },
  });

  return (
    <div className="space-y-4">
      <PageHeader title="Orientações Globais" subtitle="Diretriz central para todos os agentes" />
      <Card>
        <form className="space-y-3" onSubmit={handleSubmit((v) => saveMutation.mutate(v))}>
          <Textarea className="min-h-[360px] font-mono" {...register("conteudo")} />
          {errors.conteudo ? <p className="text-xs text-red-400">{errors.conteudo.message}</p> : null}
          <div className="flex gap-2">
            <Button type="submit">Salvar</Button>
            <Button type="button" variant="outline" onClick={() => restoreMutation.mutate()}>
              Restaurar padrão
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

