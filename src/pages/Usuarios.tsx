import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import * as Dialog from "@radix-ui/react-dialog";
import { DataTable } from "../components/shared/DataTable";
import { PageHeader } from "../components/shared/PageHeader";
import { StatusBadge } from "../components/shared/StatusBadge";
import { ConfirmModal } from "../components/shared/ConfirmModal";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card } from "../components/ui/card";
import { usuariosService } from "../services/usuarios.service";
import type { Usuario } from "../types/user";

// ── schemas ──────────────────────────────────────────────────────────────────

const createSchema = z.object({
  nome: z.string().min(3, "Mínimo 3 caracteres"),
  email: z.string().email("Email inválido"),
  senha: z.string().min(8, "Mínimo 8 caracteres"),
  perfil: z.enum(["ADMIN", "SUPERVISOR", "VENDEDOR"]),
});

const editSchema = z.object({
  nome: z.string().min(3, "Mínimo 3 caracteres"),
  email: z.string().email("Email inválido"),
  perfil: z.enum(["ADMIN", "SUPERVISOR", "VENDEDOR"]),
  status: z.boolean(),
});

const senhaSchema = z.object({
  senha: z.string().min(8, "Mínimo 8 caracteres"),
  confirmar: z.string().min(8, "Mínimo 8 caracteres"),
}).refine((v) => v.senha === v.confirmar, {
  message: "As senhas não coincidem",
  path: ["confirmar"],
});

type CreateValues = z.infer<typeof createSchema>;
type EditValues = z.infer<typeof editSchema>;
type SenhaValues = z.infer<typeof senhaSchema>;

// ── helpers ───────────────────────────────────────────────────────────────────

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
        <Dialog.Content className="fixed left-1/2 top-1/2 w-[95vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-white/20 bg-surface p-6">
          <Dialog.Title className="mb-4 text-lg font-heading">{title}</Dialog.Title>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function FieldError({ message }: { message?: string }) {
  return message ? <p className="mt-1 text-xs text-red-400">{message}</p> : null;
}

// ── modal editar ──────────────────────────────────────────────────────────────

function EditarModal({
  usuario,
  onClose,
}: {
  usuario: Usuario | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<EditValues>({
    resolver: zodResolver(editSchema),
    values: usuario
      ? { nome: usuario.nome, email: usuario.email, perfil: usuario.perfil, status: usuario.status }
      : undefined,
  });

  const mutation = useMutation({
    mutationFn: (values: EditValues) => usuariosService.update(usuario!.id, values),
    onSuccess: () => {
      toast.success("Usuário atualizado");
      void queryClient.invalidateQueries({ queryKey: ["usuarios"] });
      onClose();
    },
  });

  return (
    <ModalBase open={Boolean(usuario)} onClose={onClose} title="Editar usuário">
      <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-3">
        <div>
          <label className="mb-1 block text-sm">Nome</label>
          <Input {...register("nome")} />
          <FieldError message={errors.nome?.message} />
        </div>
        <div>
          <label className="mb-1 block text-sm">Email</label>
          <Input {...register("email")} />
          <FieldError message={errors.email?.message} />
        </div>
        <div>
          <label className="mb-1 block text-sm">Perfil</label>
          <select className="h-10 w-full rounded-md border border-white/20 bg-surface px-3 text-sm" {...register("perfil")}>
            <option value="VENDEDOR">Vendedor</option>
            <option value="SUPERVISOR">Supervisor</option>
            <option value="ADMIN">Admin</option>
          </select>
          <FieldError message={errors.perfil?.message} />
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" id="status-edit" {...register("status")} className="h-4 w-4 accent-primary" />
          <label htmlFor="status-edit" className="text-sm">Usuário ativo</label>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button disabled={isSubmitting || mutation.isPending}>Salvar</Button>
        </div>
      </form>
    </ModalBase>
  );
}

// ── modal senha ───────────────────────────────────────────────────────────────

function SenhaModal({
  usuario,
  onClose,
}: {
  usuario: Usuario | null;
  onClose: () => void;
}) {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<SenhaValues>({
    resolver: zodResolver(senhaSchema),
  });

  const mutation = useMutation({
    mutationFn: (values: SenhaValues) => usuariosService.changeSenha(usuario!.id, values.senha),
    onSuccess: () => {
      toast.success("Senha alterada com sucesso");
      reset();
      onClose();
    },
  });

  return (
    <ModalBase open={Boolean(usuario)} onClose={onClose} title={`Alterar senha — ${usuario?.nome ?? ""}`}>
      <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-3">
        <div>
          <label className="mb-1 block text-sm">Nova senha</label>
          <Input type="password" placeholder="••••••••" {...register("senha")} />
          <FieldError message={errors.senha?.message} />
        </div>
        <div>
          <label className="mb-1 block text-sm">Confirmar nova senha</label>
          <Input type="password" placeholder="••••••••" {...register("confirmar")} />
          <FieldError message={errors.confirmar?.message} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button disabled={isSubmitting || mutation.isPending}>Alterar senha</Button>
        </div>
      </form>
    </ModalBase>
  );
}

// ── página principal ──────────────────────────────────────────────────────────

export function Usuarios() {
  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editUser, setEditUser] = useState<Usuario | null>(null);
  const [senhaUser, setSenhaUser] = useState<Usuario | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["usuarios", page],
    queryFn: () => usuariosService.list({ page, limit: 10 }),
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { perfil: "VENDEDOR" },
  });

  const createMutation = useMutation({
    mutationFn: (values: CreateValues) => usuariosService.create(values),
    onSuccess: () => {
      toast.success("Usuário criado com sucesso");
      reset();
      void queryClient.invalidateQueries({ queryKey: ["usuarios"] });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => usuariosService.remove(id),
    onSuccess: () => {
      toast.success("Usuário excluído");
      setDeleteId(null);
      void queryClient.invalidateQueries({ queryKey: ["usuarios"] });
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: boolean }) =>
      usuariosService.changeStatus(id, status),
    onSuccess: (_, vars) => {
      toast.success(vars.status ? "Usuário ativado" : "Usuário desativado");
      void queryClient.invalidateQueries({ queryKey: ["usuarios"] });
    },
  });

  return (
    <div className="space-y-4">
      <PageHeader title="Usuários" subtitle="Gerencie acessos e perfis da operação" />

      {/* formulário de criação */}
      <Card>
        <p className="mb-3 text-sm font-semibold text-white/70">Novo usuário</p>
        <form onSubmit={handleSubmit((v) => createMutation.mutate(v))} className="grid gap-3 md:grid-cols-4">
          <div>
            <Input placeholder="Nome" {...register("nome")} />
            <FieldError message={errors.nome?.message} />
          </div>
          <div>
            <Input placeholder="Email" {...register("email")} />
            <FieldError message={errors.email?.message} />
          </div>
          <div>
            <Input type="password" placeholder="Senha (mín. 8 caracteres)" {...register("senha")} />
            <FieldError message={errors.senha?.message} />
          </div>
          <div className="flex gap-2">
            <select className="h-10 flex-1 rounded-md border border-white/20 bg-surface px-3 text-sm" {...register("perfil")}>
              <option value="VENDEDOR">Vendedor</option>
              <option value="SUPERVISOR">Supervisor</option>
              <option value="ADMIN">Admin</option>
            </select>
            <Button disabled={isSubmitting || createMutation.isPending}>Adicionar</Button>
          </div>
        </form>
      </Card>

      {/* tabela */}
      <DataTable
        page={page}
        onPageChange={setPage}
        limit={data?.meta?.limit ?? 10}
        total={data?.meta?.total ?? 0}
        loading={isLoading}
        data={data?.data ?? []}
        columns={[
          { key: "nome", label: "Nome" },
          { key: "email", label: "Email" },
          {
            key: "perfil",
            label: "Perfil",
            render: (row) => <StatusBadge type="perfil" value={row.perfil} />,
          },
          {
            key: "status",
            label: "Status",
            render: (row) => <StatusBadge type="status" value={row.status ? "Ativo" : "Inativo"} />,
          },
          {
            key: "acoes",
            label: "Ações",
            render: (row) => (
              <div className="flex flex-wrap gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditUser(row as Usuario)}
                >
                  Editar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSenhaUser(row as Usuario)}
                >
                  Senha
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    statusMutation.mutate({ id: row.id, status: !row.status })
                  }
                  disabled={statusMutation.isPending}
                >
                  {row.status ? "Desativar" : "Ativar"}
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

      {/* modais */}
      <EditarModal usuario={editUser} onClose={() => setEditUser(null)} />
      <SenhaModal usuario={senhaUser} onClose={() => setSenhaUser(null)} />
      <ConfirmModal
        open={Boolean(deleteId)}
        onOpenChange={() => setDeleteId(null)}
        title="Excluir usuário"
        description="Esta ação não pode ser desfeita. Deseja continuar?"
        onConfirm={() => { if (deleteId) removeMutation.mutate(deleteId); }}
      />
    </div>
  );
}
