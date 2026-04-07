import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  CheckCircle2,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  Loader2,
  Save,
  XCircle,
  Zap,
} from "lucide-react";
import { PageHeader } from "../../components/shared/PageHeader";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { agentesService } from "../../services/agentes.service";
import { agenteConfigService } from "../../services/agente-config.service";
import type { Agente } from "../../types/agente";

// ── helpers ───────────────────────────────────────────────────────────────────

function webhookUrl(id: string) {
  const base = import.meta.env.VITE_API_URL ?? "http://localhost:3001/api/v1";
  return `${base}/webhook/unnichat/${id}`;
}

function copiar(texto: string, label: string) {
  navigator.clipboard.writeText(texto).then(() => toast.success(`${label} copiado!`));
}

// ── seção de API Key global ───────────────────────────────────────────────────

function GlobalApiKeySection() {
  const queryClient = useQueryClient();
  const [mostrar, setMostrar] = useState(false);
  const [valor, setValor] = useState("");
  const [editando, setEditando] = useState(false);

  const { data: configs, isLoading } = useQuery({
    queryKey: ["agente-config"],
    queryFn: () => agenteConfigService.list(),
    select: (lista) => lista.find((c: any) => c.chave === "UNNICHAT_API_KEY"),
  });

  const configurado = configs?.configurado ?? false;

  const salvarMutation = useMutation({
    mutationFn: () => agenteConfigService.update("UNNICHAT_API_KEY", valor.trim()),
    onSuccess: () => {
      toast.success("API Key salva com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["agente-config"] });
      setValor("");
      setEditando(false);
    },
    onError: () => toast.error("Erro ao salvar API Key"),
  });

  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-green-500/20">
            <Zap className="h-4 w-4 text-green-400" />
          </div>
          <div>
            <p className="font-semibold text-white">API Key Global do Unnichat</p>
            <p className="text-xs text-white/50">Bearer token usado por todos os agentes com Unnichat ativo</p>
          </div>
        </div>
        <span
          className={`rounded px-2 py-0.5 text-[10px] font-semibold ${
            configurado
              ? "bg-green-500/20 text-green-400"
              : "bg-yellow-500/20 text-yellow-400"
          }`}
        >
          {isLoading ? "..." : configurado ? "Configurada" : "Não configurada"}
        </span>
      </div>

      {!editando ? (
        <div className="flex items-center gap-3">
          <div className="flex-1 rounded-md border border-white/10 bg-white/5 px-3 py-2 font-mono text-xs text-white/50">
            {configurado ? "••••••••••••••••••••••••" : "Nenhuma chave configurada"}
          </div>
          <Button size="sm" variant="outline" onClick={() => setEditando(true)}>
            {configurado ? "Alterar" : "Configurar"}
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="relative">
            <Input
              type={mostrar ? "text" : "password"}
              placeholder="Cole o Bearer token do Unnichat"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
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
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={!valor.trim() || salvarMutation.isPending}
              onClick={() => salvarMutation.mutate()}
            >
              {salvarMutation.isPending ? (
                <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Salvando...</>
              ) : (
                <><Save className="mr-1.5 h-3.5 w-3.5" /> Salvar</>
              )}
            </Button>
            <Button size="sm" variant="outline" onClick={() => { setEditando(false); setValor(""); }}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      <p className="text-xs text-white/40">
        A API Key é usada por todos os agentes com Unnichat ativo. Você pode sobrescrever por agente editando-o individualmente.
      </p>
    </Card>
  );
}

// ── card por agente ───────────────────────────────────────────────────────────

type TesteStatus = "idle" | "loading" | "ok" | "error";

function AgenteUnnichatCard({ agente }: { agente: Agente }) {
  const navigate = useNavigate();
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

      {/* modelo */}
      <div className="grid gap-3 rounded-lg bg-white/5 p-3">
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
        disabled={testeMutation.isPending}
        onClick={() => testeMutation.mutate()}
        className="w-full"
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

  const ativos   = data?.filter((a) => a.unnichatAtivo)  ?? [];
  const inativos = data?.filter((a) => !a.unnichatAtivo) ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Integração Unnichat"
        subtitle="Configure a API Key global e visualize os agentes conectados ao WhatsApp"
        onBack={() => navigate("/configuracoes")}
      />

      {/* API Key global */}
      <GlobalApiKeySection />

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
                Cole a API Key no campo <strong className="text-white">API Key Global</strong> acima e salve
              </li>
              <li>
                Em <strong className="text-white">Agentes</strong>, ative a integração Unnichat no agente desejado e defina o nome da conexão
              </li>
              <li>
                Copie a <strong className="text-white">URL do Webhook</strong> do agente e configure-a no painel do Unnichat
              </li>
              <li>
                Clique em <strong className="text-white">Testar Conexão Unnichat</strong> para verificar se a chave é válida
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
