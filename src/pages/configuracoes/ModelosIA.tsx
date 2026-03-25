import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import * as Dialog from "@radix-ui/react-dialog";
import { DataTable } from "../../components/shared/DataTable";
import { PageHeader } from "../../components/shared/PageHeader";
import { ConfirmModal } from "../../components/shared/ConfirmModal";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { modelosService } from "../../services/configuracoes.service";
import type { ModeloIA } from "../../types/configuracoes";

// ── schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  nome: z.string().min(2, "Mínimo 2 caracteres"),
  modelId: z.string().min(2, "Mínimo 2 caracteres"),
  provider: z.string().min(2, "Mínimo 2 caracteres"),
  descricao: z.string().optional(),
  ativo: z.boolean(),
  custoInputPorMilToken: z.coerce.number().min(0),
  custoOutputPorMilToken: z.coerce.number().min(0),
});

type FormValues = z.infer<typeof schema>;

const PROVIDERS = ["openai", "anthropic", "google", "mistral", "cohere", "outro"];

// ── helpers ───────────────────────────────────────────────────────────────────

function FieldError({ message }: { message?: string }) {
  return message ? <p className="mt-1 text-xs text-red-400">{message}</p> : null;
}

function ModalBase({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/70" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-[95vw] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl border border-white/20 bg-surface p-6">
          <Dialog.Title className="mb-4 text-lg font-heading">{title}</Dialog.Title>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ── modal criar/editar ────────────────────────────────────────────────────────

function ModeloModal({
  modelo,
  onClose,
}: {
  modelo: ModeloIA | null | "new";
  onClose: () => void;
}) {
  const isNew = modelo === "new";
  const queryClient = useQueryClient();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: !isNew && modelo
      ? {
          nome: modelo.nome,
          modelId: modelo.modelId,
          provider: modelo.provider,
          descricao: modelo.descricao ?? "",
          ativo: modelo.ativo,
          custoInputPorMilToken: modelo.custoInputPorMilToken,
          custoOutputPorMilToken: modelo.custoOutputPorMilToken,
        }
      : {
          nome: "",
          modelId: "",
          provider: "openai",
          descricao: "",
          ativo: true,
          custoInputPorMilToken: 0,
          custoOutputPorMilToken: 0,
        },
  });

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      isNew
        ? modelosService.create(values)
        : modelosService.update((modelo as ModeloIA).id, values),
    onSuccess: () => {
      toast.success(isNew ? "Modelo criado com sucesso" : "Modelo atualizado");
      void queryClient.invalidateQueries({ queryKey: ["modelos"] });
      onClose();
    },
  });

  return (
    <ModalBase
      open={Boolean(modelo)}
      onClose={onClose}
      title={isNew ? "Novo modelo de IA" : "Editar modelo"}
    >
      <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm">Nome de exibição</label>
            <Input placeholder="ex: GPT-4o" {...register("nome")} />
            <FieldError message={errors.nome?.message} />
          </div>
          <div>
            <label className="mb-1 block text-sm">ID do modelo (API)</label>
            <Input placeholder="ex: gpt-4o" {...register("modelId")} />
            <FieldError message={errors.modelId?.message} />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm">Provedor</label>
          <select
            className="h-10 w-full rounded-md border border-white/20 bg-surface px-3 text-sm"
            {...register("provider")}
          >
            {PROVIDERS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <FieldError message={errors.provider?.message} />
        </div>
        <div>
          <label className="mb-1 block text-sm">Descrição (opcional)</label>
          <Input placeholder="Breve descrição do modelo" {...register("descricao")} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm">Custo input (USD / 1k tokens)</label>
            <Input type="number" step="0.0001" min="0" {...register("custoInputPorMilToken")} />
            <FieldError message={errors.custoInputPorMilToken?.message} />
          </div>
          <div>
            <label className="mb-1 block text-sm">Custo output (USD / 1k tokens)</label>
            <Input type="number" step="0.0001" min="0" {...register("custoOutputPorMilToken")} />
            <FieldError message={errors.custoOutputPorMilToken?.message} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" id="ativo-modelo" {...register("ativo")} className="h-4 w-4 accent-primary" />
          <label htmlFor="ativo-modelo" className="text-sm">Modelo ativo</label>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button disabled={isSubmitting || mutation.isPending}>
            {isNew ? "Criar modelo" : "Salvar"}
          </Button>
        </div>
      </form>
    </ModalBase>
  );
}

// ── página ────────────────────────────────────────────────────────────────────

export function ModelosIA() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState<ModeloIA | null | "new">(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["modelos", page],
    queryFn: () => modelosService.list({ page, limit: 10 }),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => modelosService.remove(id),
    onSuccess: () => {
      toast.success("Modelo excluído");
      setDeleteId(null);
      void queryClient.invalidateQueries({ queryKey: ["modelos"] });
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, ativo }: { id: string; ativo: boolean }) =>
      modelosService.changeStatus(id, ativo),
    onSuccess: (_, vars) => {
      toast.success(vars.ativo ? "Modelo ativado" : "Modelo desativado");
      void queryClient.invalidateQueries({ queryKey: ["modelos"] });
    },
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Modelos de IA"
        subtitle="Gerencie os modelos disponíveis e seus custos"
        actionLabel="+ Novo modelo"
        onAction={() => setModal("new")}
        onBack={() => navigate("/configuracoes")}
      />

      <DataTable
        page={page}
        onPageChange={setPage}
        limit={data?.meta?.limit ?? 10}
        total={data?.meta?.total ?? 0}
        loading={isLoading}
        data={data?.data ?? []}
        columns={[
          { key: "nome", label: "Nome" },
          { key: "modelId", label: "ID do modelo" },
          {
            key: "provider",
            label: "Provedor",
            render: (row) => (
              <span className="rounded bg-white/10 px-2 py-0.5 text-xs">{row.provider}</span>
            ),
          },
          {
            key: "custos",
            label: "Custo (input / output)",
            render: (row) => (
              <span className="text-xs text-white/70">
                ${row.custoInputPorMilToken.toFixed(4)} / ${row.custoOutputPorMilToken.toFixed(4)}
              </span>
            ),
          },
          {
            key: "ativo",
            label: "Status",
            render: (row) => (
              <span
                className={`rounded px-2 py-0.5 text-xs font-medium ${
                  row.ativo ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                }`}
              >
                {row.ativo ? "Ativo" : "Inativo"}
              </span>
            ),
          },
          {
            key: "acoes",
            label: "Ações",
            render: (row) => (
              <div className="flex flex-wrap gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setModal(row as ModeloIA)}
                >
                  Editar
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => statusMutation.mutate({ id: row.id, ativo: !row.ativo })}
                  disabled={statusMutation.isPending}
                >
                  {row.ativo ? "Desativar" : "Ativar"}
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => setDeleteId(row.id)}
                >
                  Excluir
                </Button>
              </div>
            ),
          },
        ]}
      />

      <ModeloModal modelo={modal} onClose={() => setModal(null)} />
      <ConfirmModal
        open={Boolean(deleteId)}
        onOpenChange={() => setDeleteId(null)}
        title="Excluir modelo"
        description="Esta ação não pode ser desfeita. Deseja continuar?"
        onConfirm={() => { if (deleteId) removeMutation.mutate(deleteId); }}
      />
    </div>
  );
}
