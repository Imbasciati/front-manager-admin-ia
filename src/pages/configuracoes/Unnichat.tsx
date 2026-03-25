import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  CheckCircle2,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  Loader2,
  WifiOff,
  XCircle,
  Zap,
} from "lucide-react";
import { PageHeader } from "../../components/shared/PageHeader";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
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

function mascaraApiKey(key: string | null | undefined) {
  if (!key) return "—";
  if (key.length <= 12) return "•".repeat(key.length);
  return key.slice(0, 6) + "•".repeat(key.length - 10) + key.slice(-4);
}

// ── card por agente ───────────────────────────────────────────────────────────

type TesteStatus = "idle" | "loading" | "ok" | "error";

function AgenteUnnichatCard({ agente }: { agente: Agente }) {
  const navigate = useNavigate();
  const [mostrarKey, setMostrarKey] = useState(false);
  const [testeStatus, setTesteStatus] = useState<TesteStatus>("idle");
  const [testeMensagem, setTesteMensagem] = useState("");

  const url = webhookUrl(agente.id);

  const testeMutation = useMutation({
    mutationFn: () => agentesService.testarUnnichat(agente.id),
    onMutate: () => { setTesteStatus("loading"); setTesteMensagem(""); },
    onSuccess: (resultado) => {
      if (resultado.ok) {
        setTesteStatus("ok");
        setTesteMensagem(resultado.mensagem);
        toast.success("Conexão Unnichat OK");
      } else {
        setTesteStatus("error");
        setTesteMensagem(resultado.mensagem);
        toast.error("Falha na conexão");
      }
    },
    onError: (err: any) => {
      setTesteStatus("error");
      setTesteMensagem(err?.response?.data?.error ?? err?.message ?? "Erro desconhecido");
      toast.error("Falha ao testar conexão");
    },
  });

  return (
    <Card className="space-y-4">
      {/* cabeçalho */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-green-500/20">
            <Zap className="h-4 w-4 text-green-400" />
          </div>
          <div>
            <p className="font-semibold">{agente.nome}</p>
            {agente.unnichatConexaoNome && (
              <p className="text-xs text-white/50">{agente.unnichatConexaoNome}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* badge de ativo/inativo */}
          <span
            className={`rounded px-2 py-0.5 text-[10px] font-semibold ${
              agente.unnichatAtivo
                ? "bg-green-500/20 text-green-400"
                : "bg-white/10 text-white/40"
            }`}
          >
            {agente.unnichatAtivo ? "Ativo" : "Inativo"}
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate(`/agentes/${agente.id}/editar`)}
          >
            <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
            Editar
          </Button>
        </div>
      </div>

      {/* informações */}
      <div className="grid gap-3 rounded-lg bg-white/5 p-3 sm:grid-cols-2">
        {/* API Key */}
        <div className="space-y-1">
          <p className="text-[11px] uppercase tracking-wide text-white/40">API Key</p>
          <div className="flex items-center gap-2">
            <span className="flex-1 truncate font-mono text-xs text-white/80">
              {mostrarKey ? (agente.unnichatApiKey ?? "—") : mascaraApiKey(agente.unnichatApiKey)}
            </span>
            {agente.unnichatApiKey && (
              <button
                type="button"
                onClick={() => setMostrarKey((v) => !v)}
                className="text-white/40 hover:text-white"
              >
                {mostrarKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            )}
          </div>
        </div>

        {/* Modelo */}
        <div className="space-y-1">
          <p className="text-[11px] uppercase tracking-wide text-white/40">Modelo</p>
          <span className="font-mono text-xs text-white/80">{agente.modelo}</span>
        </div>
      </div>

      {/* URL do Webhook */}
      <div className="space-y-1.5">
        <p className="text-xs text-white/50">URL do Webhook (configure no Unnichat)</p>
        <div className="flex gap-2">
          <input
            readOnly
            value={url}
            className="h-9 flex-1 rounded-md border border-white/20 bg-white/5 px-3 font-mono text-xs text-white/70"
          />
          <button
            type="button"
            onClick={() => copiar(url, "URL")}
            className="flex h-9 w-9 items-center justify-center rounded-md border border-white/20 bg-white/5 text-white/60 hover:text-white"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* resultado do teste */}
      {testeStatus !== "idle" && (
        <div
          className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
            testeStatus === "loading"
              ? "bg-white/5 text-white/60"
              : testeStatus === "ok"
              ? "bg-green-500/10 text-green-400"
              : "bg-red-500/10 text-red-400"
          }`}
        >
          {testeStatus === "loading" && <Loader2 className="h-4 w-4 animate-spin" />}
          {testeStatus === "ok" && <CheckCircle2 className="h-4 w-4" />}
          {testeStatus === "error" && <XCircle className="h-4 w-4" />}
          <span>{testeStatus === "loading" ? "Testando conexão..." : testeMensagem}</span>
        </div>
      )}

      {/* botão testar */}
      <Button
        size="sm"
        variant="outline"
        disabled={testeMutation.isPending || !agente.unnichatApiKey}
        onClick={() => testeMutation.mutate()}
        className="w-full"
        title={!agente.unnichatApiKey ? "Configure a API Key antes de testar" : undefined}
      >
        {testeMutation.isPending ? (
          <><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> Testando...</>
        ) : (
          <><Zap className="mr-2 h-3.5 w-3.5" /> Testar Conexão Unnichat</>
        )}
      </Button>
    </Card>
  );
}

// ── página ────────────────────────────────────────────────────────────────────

export function ConfigUnnichat() {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ["agentes", "all"],
    queryFn: () => agentesService.list({ limit: 200 }),
    select: (r) => r.data as Agente[],
  });

  const ativos   = data?.filter((a) => a.unnichatAtivo)   ?? [];
  const inativos = data?.filter((a) => !a.unnichatAtivo)  ?? [];
  const semKey   = ativos.filter((a) => !a.unnichatApiKey);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Integração Unnichat"
        subtitle="Visualize e teste a conexão dos agentes com o Unnichat (WhatsApp)"
        onBack={() => navigate("/configuracoes")}
      />

      {/* aviso — agentes ativos sem API Key */}
      {semKey.length > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-400">
          <WifiOff className="h-4 w-4 flex-shrink-0" />
          <span>
            {semKey.length === 1
              ? `O agente "${semKey[0].nome}" está ativo mas sem API Key configurada.`
              : `${semKey.length} agentes estão ativos mas sem API Key configurada.`}
            {" "}Acesse <strong>Editar Agente</strong> para configurar.
          </span>
        </div>
      )}

      {isLoading && (
        <p className="text-center text-sm text-white/40">Carregando agentes...</p>
      )}

      {/* agentes com Unnichat ativo */}
      {ativos.length > 0 && (
        <section className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/40">
            Ativos ({ativos.length})
          </p>
          {ativos.map((a) => <AgenteUnnichatCard key={a.id} agente={a} />)}
        </section>
      )}

      {/* agentes com Unnichat inativo */}
      {inativos.length > 0 && (
        <section className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/40">
            Inativo / Não configurado ({inativos.length})
          </p>
          {inativos.map((a) => <AgenteUnnichatCard key={a.id} agente={a} />)}
        </section>
      )}

      {!isLoading && data?.length === 0 && (
        <p className="text-center text-sm text-white/40">
          Nenhum agente criado. Crie um agente e ative a integração Unnichat nele.
        </p>
      )}

      {/* guia de configuração */}
      <Card>
        <details>
          <summary className="cursor-pointer text-sm font-semibold text-white/70 hover:text-white">
            Como configurar no Unnichat?
          </summary>
          <div className="mt-4 space-y-3 text-xs text-white/60">
            <ol className="list-inside list-decimal space-y-2">
              <li>Acesse o painel do Unnichat → <strong className="text-white">Configurações</strong></li>
              <li>Vá em <strong className="text-white">API</strong> → gere ou copie o Bearer token</li>
              <li>
                No painel da plataforma, vá em <strong className="text-white">Agentes</strong> →
                {" "}<strong className="text-white">Editar Agente</strong> → seção <strong className="text-white">Integração Unnichat</strong>
              </li>
              <li>Ative a integração e cole a API Key</li>
              <li>
                Copie a <strong className="text-white">URL do Webhook</strong> exibida e configure-a
                nas configurações do Unnichat como destino de webhook
              </li>
              <li>
                Clique em <strong className="text-white">Testar Conexão Unnichat</strong> nesta página
                para verificar se a chave é válida
              </li>
            </ol>
            <p className="rounded-lg bg-white/5 px-3 py-2 font-mono text-[11px] text-white/50">
              POST {"{VITE_API_URL}"}/webhook/unnichat/{"{agenteId}"}
            </p>
          </div>
        </details>
      </Card>
    </div>
  );
}
