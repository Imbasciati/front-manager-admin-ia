import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { PageHeader } from "../components/shared/PageHeader";
import { DataTable } from "../components/shared/DataTable";
import { StatusBadge } from "../components/shared/StatusBadge";
import { ConfirmModal } from "../components/shared/ConfirmModal";
import { EscolherTipoAgente } from "../components/shared/EscolherTipoAgente";
import { Button } from "../components/ui/button";
import { agentesService } from "../services/agentes.service";

export function Agentes() {
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mostrarEscolha, setMostrarEscolha] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["agentes", page],
    queryFn: () => agentesService.list({ page, limit: 10 }),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, ativo }: { id: string; ativo: boolean }) => agentesService.status(id, ativo),
    onSuccess: () => {
      toast.success("Status do agente atualizado");
      void queryClient.invalidateQueries({ queryKey: ["agentes"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => agentesService.remove(id),
    onSuccess: () => {
      toast.success("Agente removido");
      setSelectedId(null);
      void queryClient.invalidateQueries({ queryKey: ["agentes"] });
    },
  });

  return (
    <div className="space-y-4">
      <PageHeader title="Agentes" subtitle="Crie e administre agentes de IA para vendas" actionLabel="Novo agente" onAction={() => setMostrarEscolha(true)} />
      <DataTable
        page={page}
        onPageChange={setPage}
        limit={data?.meta?.limit ?? 10}
        total={data?.meta?.total ?? 0}
        loading={isLoading}
        data={data?.data ?? []}
        columns={[
          { key: "nome", label: "Nome" },
          {
            key: "produto",
            label: "Profissão",
            render: (row) => {
              const p = row.produto as string | null | undefined;
              if (!p) return <span className="text-white/30">—</span>;
              const profissao = p.includes(": ") ? p.split(": ")[1] : p;
              return <span>{profissao}</span>;
            },
          },
          { key: "modelo", label: "Modelo" },
          { key: "ativo", label: "Status", render: (row) => <StatusBadge type="status" value={row.ativo ? "Ativo" : "Inativo"} /> },
          {
            key: "acoes",
            label: "Ações",
            render: (row) => (
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" asChild><Link to={`/agentes/${row.id}/testar`}>Testar</Link></Button>
                <Button size="sm" variant="outline" asChild><Link to={`/agentes/${row.id}/editar`}>Editar</Link></Button>
                <Button size="sm" variant="outline" onClick={() => void agentesService.duplicar(row.id)}>Duplicar</Button>
                <Button size="sm" variant="ghost" onClick={() => statusMutation.mutate({ id: row.id, ativo: !row.ativo })}>{row.ativo ? "Desativar" : "Ativar"}</Button>
                <Button size="sm" variant="destructive" onClick={() => setSelectedId(row.id)}>Excluir</Button>
              </div>
            ),
          },
        ]}
      />

      <ConfirmModal
        open={Boolean(selectedId)}
        onOpenChange={() => setSelectedId(null)}
        title="Excluir agente"
        description="Deseja remover este agente e seus documentos?"
        onConfirm={() => selectedId && deleteMutation.mutate(selectedId)}
      />

      {mostrarEscolha && (
        <EscolherTipoAgente
          onClose={() => setMostrarEscolha(false)}
          onVendas={() => { setMostrarEscolha(false); navigate("/agentes/novo", { state: { atuacao: "Vendas" } }); }}
          onRecuperacao={() => { setMostrarEscolha(false); navigate("/agentes/novo/recuperacao"); }}
          onZero={() => { setMostrarEscolha(false); navigate("/agentes/novo"); }}
        />
      )}
    </div>
  );
}


