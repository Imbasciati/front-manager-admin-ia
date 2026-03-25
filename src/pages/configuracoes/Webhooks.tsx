import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { CheckCircle, Copy, RefreshCw } from "lucide-react";
import { PageHeader } from "../../components/shared/PageHeader";
import { ConfirmModal } from "../../components/shared/ConfirmModal";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Card } from "../../components/ui/card";
import { webhooksService } from "../../services/atendimentos.service";
import type { ConfiguracaoWebhook } from "../../types/atendimento";

// ── schema ────────────────────────────────────────────────────────────────────

const schema = z.object({
  nome: z.string().min(2, "Mínimo 2 caracteres"),
  descricao: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

// ── helpers ───────────────────────────────────────────────────────────────────

function getWebhookUrl(token: string) {
  const base = import.meta.env.VITE_API_URL ?? "http://localhost:3001/api/v1";
  return `${base}/webhook/atendimento/${token}`;
}

function copiar(texto: string, label: string) {
  navigator.clipboard.writeText(texto).then(() => toast.success(`${label} copiado!`));
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR");
}

// ── card de webhook ───────────────────────────────────────────────────────────

function WebhookCard({ wh }: { wh: ConfiguracaoWebhook }) {
  const queryClient = useQueryClient();
  const [confirmRegenerar, setConfirmRegenerar] = useState(false);
  const [confirmExcluir, setConfirmExcluir] = useState(false);

  const webhookUrl = getWebhookUrl(wh.token);

  const regenerarMutation = useMutation({
    mutationFn: () => webhooksService.regenerarToken(wh.id),
    onSuccess: () => {
      toast.success("Token regenerado com sucesso");
      void queryClient.invalidateQueries({ queryKey: ["webhooks"] });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (ativo: boolean) => webhooksService.update(wh.id, { ativo }),
    onSuccess: (_, ativo) => {
      toast.success(ativo ? "Webhook ativado" : "Webhook desativado");
      void queryClient.invalidateQueries({ queryKey: ["webhooks"] });
    },
  });

  const excluirMutation = useMutation({
    mutationFn: () => webhooksService.remove(wh.id),
    onSuccess: () => {
      toast.success("Webhook excluído");
      void queryClient.invalidateQueries({ queryKey: ["webhooks"] });
    },
  });

  return (
    <Card className="space-y-4">
      {/* cabeçalho */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <p className="font-semibold">{wh.nome}</p>
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                wh.ativo ? "bg-green-500/20 text-green-400" : "bg-white/10 text-white/40"
              }`}
            >
              {wh.ativo ? "Ativo" : "Inativo"}
            </span>
          </div>
          {wh.descricao && <p className="mt-0.5 text-sm text-white/50">{wh.descricao}</p>}
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={toggleMutation.isPending}
            onClick={() => toggleMutation.mutate(!wh.ativo)}
          >
            {wh.ativo ? "Desativar" : "Ativar"}
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => setConfirmExcluir(true)}
          >
            Excluir
          </Button>
        </div>
      </div>

      {/* URL do webhook */}
      <div className="space-y-1.5">
        <label className="text-xs text-white/50">URL do Webhook</label>
        <div className="flex gap-2">
          <Input
            readOnly
            value={webhookUrl}
            className="flex-1 font-mono text-xs"
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() => copiar(webhookUrl, "URL")}
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Token */}
      <div className="space-y-1.5">
        <label className="text-xs text-white/50">Token de autenticação</label>
        <div className="flex gap-2">
          <Input
            readOnly
            value={wh.token}
            className="flex-1 font-mono text-xs"
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() => copiar(wh.token, "Token")}
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setConfirmRegenerar(true)}
            disabled={regenerarMutation.isPending}
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
        <p className="text-xs text-white/40">
          Envie o token no header: <code className="text-primary">x-webhook-token: {wh.token.slice(0, 8)}...</code>
        </p>
      </div>

      {/* estatísticas */}
      <div className="grid grid-cols-2 gap-3 rounded-lg bg-white/5 px-3 py-2 text-xs text-white/60">
        <div>
          <span className="text-white/40">Total de eventos: </span>
          <span className="font-medium text-white">{wh.totalEventos.toLocaleString("pt-BR")}</span>
        </div>
        <div>
          <span className="text-white/40">Último evento: </span>
          <span className="font-medium text-white">{formatDate(wh.ultimoEventoEm)}</span>
        </div>
      </div>

      {/* instruções n8n */}
      <details className="group">
        <summary className="cursor-pointer text-xs text-primary hover:underline">
          Ver instruções de configuração no n8n
        </summary>
        <div className="mt-3 space-y-2 rounded-lg bg-white/5 p-3 text-xs text-white/70">
          <p className="font-semibold text-white">Como configurar no n8n:</p>
          <ol className="list-inside list-decimal space-y-1">
            <li>Adicione um nó <strong>HTTP Request</strong></li>
            <li>Método: <code className="text-primary">POST</code></li>
            <li>URL: <code className="text-primary">{webhookUrl}</code></li>
            <li>
              Header: <code className="text-primary">x-webhook-token</code> = <code className="text-primary">{wh.token}</code>
            </li>
            <li>Body (JSON) com os campos abaixo</li>
          </ol>
          <div className="mt-2 rounded bg-black/30 p-2 font-mono text-[11px] text-white/80">
            <pre>{`{
  "evento": "NOVA_MENSAGEM",
  "conversaId": "id-unico-da-conversa",
  "telefone": "+5511999999999",
  "nome": "Nome do contato",
  "campanha": "Nome da campanha",
  "canal": "whatsapp",
  "mensagem": "Texto da mensagem",
  "origem": "CLIENTE"
}`}</pre>
          </div>
          <p className="mt-1 font-semibold text-white">Valores do campo <code>evento</code>:</p>
          <ul className="list-inside list-disc space-y-0.5">
            <li><code className="text-primary">NOVA_MENSAGEM</code> — nova mensagem em conversa existente ou nova</li>
            <li><code className="text-primary">NOVO_ATENDIMENTO</code> — inicia um novo atendimento</li>
            <li><code className="text-primary">ATENDIMENTO_FINALIZADO</code> — finaliza o atendimento</li>
          </ul>
          <p className="mt-1 font-semibold text-white">Valores do campo <code>origem</code>:</p>
          <ul className="list-inside list-disc space-y-0.5">
            <li><code className="text-primary">CLIENTE</code> — mensagem enviada pelo cliente</li>
            <li><code className="text-primary">AGENTE_IA</code> — resposta gerada pela IA</li>
            <li><code className="text-primary">VENDEDOR</code> — mensagem do vendedor humano</li>
          </ul>
        </div>
      </details>

      {/* confirms */}
      <ConfirmModal
        open={confirmRegenerar}
        onOpenChange={() => setConfirmRegenerar(false)}
        title="Regenerar token"
        description="O token atual deixará de funcionar imediatamente. Atualize o n8n com o novo token. Continuar?"
        onConfirm={() => { setConfirmRegenerar(false); regenerarMutation.mutate(); }}
      />
      <ConfirmModal
        open={confirmExcluir}
        onOpenChange={() => setConfirmExcluir(false)}
        title="Excluir webhook"
        description="Esta ação não pode ser desfeita. O n8n não conseguirá mais enviar eventos por este webhook."
        onConfirm={() => { setConfirmExcluir(false); excluirMutation.mutate(); }}
      />
    </Card>
  );
}

// ── formulário de criação ─────────────────────────────────────────────────────

function NovoWebhookForm({ onSuccess }: { onSuccess: () => void }) {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const mutation = useMutation({
    mutationFn: (values: FormValues) => webhooksService.create(values),
    onSuccess: () => {
      toast.success("Webhook criado com sucesso");
      reset();
      onSuccess();
    },
  });

  return (
    <Card>
      <p className="mb-3 text-sm font-semibold text-white/70">Novo webhook</p>
      <form
        onSubmit={handleSubmit((v) => mutation.mutate(v))}
        className="flex flex-wrap items-end gap-3"
      >
        <div className="flex-1 min-w-48">
          <label className="mb-1 block text-xs text-white/50">Nome</label>
          <Input placeholder="ex: n8n WhatsApp Principal" {...register("nome")} />
          {errors.nome && <p className="mt-1 text-xs text-red-400">{errors.nome.message}</p>}
        </div>
        <div className="flex-1 min-w-48">
          <label className="mb-1 block text-xs text-white/50">Descrição (opcional)</label>
          <Input placeholder="Descrição do uso deste webhook" {...register("descricao")} />
        </div>
        <Button disabled={isSubmitting || mutation.isPending}>
          <CheckCircle className="mr-2 h-4 w-4" />
          Criar webhook
        </Button>
      </form>
    </Card>
  );
}

// ── página ────────────────────────────────────────────────────────────────────

export function Webhooks() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: webhooks, isLoading } = useQuery({
    queryKey: ["webhooks"],
    queryFn: () => webhooksService.list(),
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Webhooks"
        subtitle="Gerencie os tokens de integração para receber eventos do n8n e outros sistemas"
        onBack={() => navigate("/configuracoes")}
      />

      <NovoWebhookForm onSuccess={() => queryClient.invalidateQueries({ queryKey: ["webhooks"] })} />

      {isLoading && (
        <p className="text-center text-sm text-white/50">Carregando...</p>
      )}

      {!isLoading && webhooks?.length === 0 && (
        <p className="text-center text-sm text-white/40">
          Nenhum webhook criado ainda. Crie um acima para começar.
        </p>
      )}

      {webhooks?.map((wh) => (
        <WebhookCard key={wh.id} wh={wh} />
      ))}
    </div>
  );
}
