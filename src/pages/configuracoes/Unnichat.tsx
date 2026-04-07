import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  Loader2,
  Plus,
  Save,
  Trash2,
  XCircle,
  Zap,
} from "lucide-react";
import { PageHeader } from "../../components/shared/PageHeader";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { conexaoUnnichatService, type ConexaoUnnichat } from "../../services/conexao-unnichat.service";
import { agentesService } from "../../services/agentes.service";
import type { Agente } from "../../types/agente";

// ── helpers ───────────────────────────────────────────────────────────────────

function webhookUrl(id: string) {
  const base = import.meta.env.VITE_API_URL ?? "http://localhost:3001/api/v1";
  return `${base}/webhook/unnichat/${id}`;
}

function copiar(texto: string, label: string) {
  navigator.clipboard.writeText(texto).then(() => toast.success(`${label} copiado!`));
}

// ── formulário de conexão (novo ou edição inline) ─────────────────────────────

interface FormConexaoProps {
  inicial?: ConexaoUnnichat;
  onSalvo: () => void;
  onCancelar: () => void;
}

function FormConexao({ inicial, onSalvo, onCancelar }: FormConexaoProps) {
  const queryClient = useQueryClient();
  const [nome, setNome] = useState(inicial?.nome ?? "");
  const [apiKey, setApiKey] = useState("");
  const [mostrar, setMostrar] = useState(false);

  const isEdicao = Boolean(inicial);

  const mutation = useMutation({
    mutationFn: () =>
      isEdicao
        ? conexaoUnnichatService.update(inicial!.id, {
            nome,
            ...(apiKey.trim() ? { apiKey } : {}),
          })
        : conexaoUnnichatService.create({ nome, apiKey }),
    onSuccess: () => {
      toast.success(isEdicao ? "Conexão atualizada!" : "Conexão criada!");
      queryClient.invalidateQueries({ queryKey: ["conexoes-unnichat"] });
      onSalvo();
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.error ?? "Erro ao salvar conexão"),
  });

  const podeSubmeter = nome.trim().length >= 2 && (isEdicao || apiKey.trim().length >= 10);

  return (
    <div className="space-y-3 rounded-xl border border-white/15 bg-white/5 p-4">
      <p className="text-sm font-semibold text-white">{isEdicao ? "Editar conexão" : "Nova conexão"}</p>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs text-white/50">Nome da conexão</label>
          <Input
            placeholder="ex: WhatsApp Principal"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-white/50">
            API Key (Bearer token){isEdicao && <span className="ml-1 text-white/30">— deixe vazio para manter a atual</span>}
          </label>
          <div className="relative">
            <Input
              type={mostrar ? "text" : "password"}
              placeholder={isEdicao ? "Nova API Key (opcional)" : "Cole o Bearer token do Unnichat"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="pr-10 font-mono text-sm"
            />
            <button
              type="button"
              onClick={() => setMostrar((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
            >
              {mostrar ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          size="sm"
          disabled={!podeSubmeter || mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending ? (
            <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Salvando...</>
          ) : (
            <><Save className="mr-1.5 h-3.5 w-3.5" /> Salvar</>
          )}
        </Button>
        <Button size="sm" variant="outline" onClick={onCancelar}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}

// ── card de conexão ───────────────────────────────────────────────────────────

type TesteStatus = "idle" | "loading" | "ok" | "error";

function ConexaoCard({ conexao }: { conexao: ConexaoUnnichat }) {
  const queryClient = useQueryClient();
  const [editando, setEditando] = useState(false);
  const [testeStatus, setTesteStatus] = useState<TesteStatus>("idle");
  const [testeMensagem, setTesteMensagem] = useState("");

  const deleteMutation = useMutation({
    mutationFn: () => conexaoUnnichatService.remove(conexao.id),
    onSuccess: () => {
      toast.success("Conexão removida!");
      queryClient.invalidateQueries({ queryKey: ["conexoes-unnichat"] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.error ?? "Erro ao remover"),
  });

  const testeMutation = useMutation({
    mutationFn: () => conexaoUnnichatService.testar(conexao.id),
    onMutate: () => { setTesteStatus("loading"); setTesteMensagem(""); },
    onSuccess: (r) => {
      setTesteStatus(r.ok ? "ok" : "error");
      setTesteMensagem(r.mensagem);
      if (r.ok) toast.success("Conexão OK");
      else toast.error("Falha na conexão");
    },
    onError: (err: any) => {
      setTesteStatus("error");
      setTesteMensagem(err?.response?.data?.error ?? "Erro desconhecido");
      toast.error("Falha ao testar");
    },
  });

  if (editando) {
    return (
      <FormConexao
        inicial={conexao}
        onSalvo={() => setEditando(false)}
        onCancelar={() => setEditando(false)}
      />
    );
  }

  return (
    <Card className="space-y-3">
      {/* cabeçalho */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-green-500/20">
            <Zap className="h-4 w-4 text-green-400" />
          </div>
          <div>
            <p className="font-semibold text-white">{conexao.nome}</p>
            <p className="font-mono text-xs text-white/40">{conexao.apiKeyMasked}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded px-2 py-0.5 text-[10px] font-semibold ${conexao.ativo ? "bg-green-500/20 text-green-400" : "bg-white/10 text-white/40"}`}>
            {conexao.ativo ? "Ativa" : "Inativa"}
          </span>
          {conexao.agentesCount > 0 && (
            <span className="rounded bg-blue-500/20 px-2 py-0.5 text-[10px] font-semibold text-blue-400">
              {conexao.agentesCount} agente{conexao.agentesCount > 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      {/* resultado do teste */}
      {testeStatus !== "idle" && (
        <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
          testeStatus === "loading" ? "bg-white/5 text-white/60"
          : testeStatus === "ok" ? "bg-green-500/10 text-green-400"
          : "bg-red-500/10 text-red-400"
        }`}>
          {testeStatus === "loading" && <Loader2 className="h-4 w-4 animate-spin" />}
          {testeStatus === "ok" && <CheckCircle2 className="h-4 w-4" />}
          {testeStatus === "error" && <XCircle className="h-4 w-4" />}
          <span>{testeStatus === "loading" ? "Testando conexão..." : testeMensagem}</span>
        </div>
      )}

      {/* ações */}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" disabled={testeMutation.isPending} onClick={() => testeMutation.mutate()} className="flex-1">
          {testeMutation.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Zap className="mr-1.5 h-3.5 w-3.5" />}
          Testar
        </Button>
        <Button size="sm" variant="outline" onClick={() => setEditando(true)}>
          Editar
        </Button>
        <Button
          size="sm"
          variant="destructive"
          disabled={deleteMutation.isPending}
          onClick={() => {
            if (conexao.agentesCount > 0) {
              toast.error(`Desvincule os ${conexao.agentesCount} agente(s) antes de excluir.`);
              return;
            }
            deleteMutation.mutate();
          }}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </Card>
  );
}

// ── card de agente vinculado ──────────────────────────────────────────────────

function AgenteCard({ agente, conexoes }: { agente: Agente; conexoes: ConexaoUnnichat[] }) {
  const url = webhookUrl(agente.id);
  const conexao = conexoes.find((c) => c.id === (agente as any).conexaoUnnichatId);

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/5 px-4 py-3">
      <div className="flex items-center gap-3">
        <div className={`h-2 w-2 flex-shrink-0 rounded-full ${agente.unnichatAtivo ? "bg-green-400" : "bg-white/20"}`} />
        <div>
          <p className="text-sm font-medium text-white">{agente.nome}</p>
          <p className="text-xs text-white/40">
            {conexao ? conexao.nome : <span className="text-yellow-400/80">Sem conexão vinculada</span>}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => copiar(url, "URL")}
        className="flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/50 hover:text-white"
        title={url}
      >
        <Copy className="h-3 w-3" />
        Webhook
      </button>
    </div>
  );
}

// ── página ────────────────────────────────────────────────────────────────────

export function ConfigUnnichat() {
  const navigate = useNavigate();
  const [adicionando, setAdicionando] = useState(false);

  const { data: conexoes = [], isLoading: loadingConexoes } = useQuery({
    queryKey: ["conexoes-unnichat"],
    queryFn: conexaoUnnichatService.list,
  });

  const { data: agentes, isLoading: loadingAgentes } = useQuery({
    queryKey: ["agentes", "all"],
    queryFn: () => agentesService.list({ limit: 200 }),
    select: (r) => r.data as Agente[],
  });

  const agentesUnnichat = agentes?.filter(
    (a) => a.canalIntegracao === "UNNICHAT" || a.canalIntegracao === "AMBOS",
  ) ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Integração Unnichat"
        subtitle="Gerencie as conexões do Unnichat e vincule-as aos agentes"
        onBack={() => navigate("/configuracoes")}
      />

      {/* ── Conexões ── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[11px] font-semibold uppercase tracking-widest text-white/40">
            Conexões {loadingConexoes ? "" : `(${conexoes.length})`}
          </h2>
          <Button size="sm" onClick={() => setAdicionando(true)} disabled={adicionando}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Nova conexão
          </Button>
        </div>

        {adicionando && (
          <FormConexao
            onSalvo={() => setAdicionando(false)}
            onCancelar={() => setAdicionando(false)}
          />
        )}

        {loadingConexoes && <p className="text-center text-sm text-white/40">Carregando...</p>}

        {!loadingConexoes && conexoes.length === 0 && !adicionando && (
          <div className="rounded-xl border border-white/10 bg-white/5 px-6 py-8 text-center">
            <Zap className="mx-auto mb-3 h-8 w-8 text-white/20" />
            <p className="text-sm text-white/40">Nenhuma conexão criada.</p>
            <p className="mt-1 text-xs text-white/30">Clique em "Nova conexão" para começar.</p>
          </div>
        )}

        {conexoes.map((c) => (
          <ConexaoCard key={c.id} conexao={c} />
        ))}
      </section>

      {/* ── Agentes vinculados ── */}
      {agentesUnnichat.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-widest text-white/40">
            Agentes com Unnichat ({agentesUnnichat.length})
          </h2>
          {loadingAgentes
            ? <p className="text-center text-sm text-white/40">Carregando agentes...</p>
            : agentesUnnichat.map((a) => <AgenteCard key={a.id} agente={a} conexoes={conexoes} />)
          }
        </section>
      )}

      {/* guia */}
      <Card>
        <details>
          <summary className="cursor-pointer text-sm font-semibold text-white/70 hover:text-white">
            Como configurar no Unnichat?
          </summary>
          <div className="mt-4 space-y-3 text-xs text-white/60">
            <ol className="list-inside list-decimal space-y-2">
              <li>Acesse o painel do Unnichat → <strong className="text-white">Configurações → API</strong> e copie o Bearer token</li>
              <li>Clique em <strong className="text-white">Nova conexão</strong>, dê um nome e cole a API Key</li>
              <li>Clique em <strong className="text-white">Testar</strong> para validar a chave</li>
              <li>Edite o agente desejado e selecione esta conexão no campo <strong className="text-white">Conexão Unnichat</strong></li>
              <li>Copie a <strong className="text-white">URL do Webhook</strong> do agente e configure-a no painel do Unnichat</li>
            </ol>
          </div>
        </details>
      </Card>
    </div>
  );
}
