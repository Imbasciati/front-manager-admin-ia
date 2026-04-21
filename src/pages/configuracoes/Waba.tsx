import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Loader2,
  Phone,
  Save,
  Trash2,
  XCircle,
  Zap,
} from "lucide-react";
import { PageHeader } from "../../components/shared/PageHeader";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import {
  conexaoWABAService,
  type ConexaoWABA,
  type WABATemplate,
} from "../../services/conexao-waba.service";

// ── env ───────────────────────────────────────────────────────────────────────

const META_APP_ID    = import.meta.env.VITE_META_APP_ID    ?? "";
const META_CONFIG_ID = import.meta.env.VITE_META_CONFIG_ID ?? "";

// ── helpers ───────────────────────────────────────────────────────────────────

function qualidadeCor(q: string | null) {
  if (q === "GREEN")  return "bg-green-500/20 text-green-400";
  if (q === "YELLOW") return "bg-yellow-500/20 text-yellow-400";
  if (q === "RED")    return "bg-red-500/20 text-red-400";
  return "bg-white/10 text-white/40";
}

function qualidadeLabel(q: string | null) {
  if (q === "GREEN")  return "Qualidade Alta";
  if (q === "YELLOW") return "Qualidade Média";
  if (q === "RED")    return "Qualidade Baixa";
  return "Qualidade Desconhecida";
}

// ── Embedded Signup (Meta SDK) ────────────────────────────────────────────────

function useMetaSDK() {
  const loaded = useRef(false);

  useEffect(() => {
    if (loaded.current || !META_APP_ID) return;
    loaded.current = true;

    (window as any).fbAsyncInit = () => {
      (window as any).FB.init({
        appId:   META_APP_ID,
        cookie:  true,
        xfbml:   true,
        version: "v20.0",
      });
    };

    const script    = document.createElement("script");
    script.id       = "facebook-jssdk";
    script.async    = true;
    script.src      = "https://connect.facebook.net/pt_BR/sdk.js";
    document.body.appendChild(script);
  }, []);
}

// ── formulário manual (fallback sem SDK) ──────────────────────────────────────

interface FormManualProps {
  onSalvo:    () => void;
  onCancelar: () => void;
}

function FormManual({ onSalvo, onCancelar }: FormManualProps) {
  const queryClient = useQueryClient();
  const [nome,          setNome]          = useState("");
  const [wabaId,        setWabaId]        = useState("");
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [accessToken,   setAccessToken]   = useState("");
  const [mostrar,       setMostrar]       = useState(false);

  const mutation = useMutation({
    mutationFn: () =>
      conexaoWABAService.createManual({ nome, wabaId, phoneNumberId, accessToken }),
    onSuccess: () => {
      toast.success("Conexão criada!");
      queryClient.invalidateQueries({ queryKey: ["conexoes-waba"] });
      onSalvo();
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.error ?? "Erro ao criar conexão"),
  });

  const valido =
    nome.trim().length >= 2 &&
    wabaId.trim().length > 4 &&
    phoneNumberId.trim().length > 4 &&
    accessToken.trim().length > 10;

  return (
    <div className="space-y-3 rounded-xl border border-white/15 bg-white/5 p-4">
      <p className="text-sm font-semibold text-white">Adicionar conexão manualmente</p>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs text-white/50">Nome da conexão</label>
          <Input placeholder="ex: WABA Principal" value={nome} onChange={(e) => setNome(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-white/50">WABA ID</label>
          <Input placeholder="ex: 123456789012345" value={wabaId} onChange={(e) => setWabaId(e.target.value)} className="font-mono text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-white/50">Phone Number ID</label>
          <Input placeholder="ex: 987654321098765" value={phoneNumberId} onChange={(e) => setPhoneNumberId(e.target.value)} className="font-mono text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-white/50">Access Token (permanente)</label>
          <div className="relative">
            <Input
              type={mostrar ? "text" : "password"}
              placeholder="Cole o System User Token"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
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
        <Button size="sm" disabled={!valido || mutation.isPending} onClick={() => mutation.mutate()}>
          {mutation.isPending ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Salvando...</> : <><Save className="mr-1.5 h-3.5 w-3.5" />Salvar</>}
        </Button>
        <Button size="sm" variant="outline" onClick={onCancelar}>Cancelar</Button>
      </div>
    </div>
  );
}

// ── card de templates ─────────────────────────────────────────────────────────

function TemplatesPanel({ conexaoId }: { conexaoId: string }) {
  const [aberto, setAberto] = useState(false);

  const { data: templates, isLoading, refetch } = useQuery({
    queryKey: ["waba-templates", conexaoId],
    queryFn:  () => conexaoWABAService.getTemplates(conexaoId),
    enabled:  false,
  });

  function abrirTemplates() {
    setAberto((v) => !v);
    if (!aberto) refetch();
  }

  function statusCor(s: string) {
    if (s === "APPROVED") return "text-green-400";
    if (s === "REJECTED") return "text-red-400";
    return "text-yellow-400";
  }

  return (
    <div className="rounded-lg border border-white/10 bg-white/3">
      <button
        type="button"
        onClick={abrirTemplates}
        className="flex w-full items-center justify-between px-4 py-2.5 text-xs font-medium text-white/60 hover:text-white"
      >
        <span>Templates ({templates ? templates.length : "—"})</span>
        {aberto ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>

      {aberto && (
        <div className="border-t border-white/10 px-4 pb-3 pt-2">
          {isLoading && <p className="text-xs text-white/40">Carregando templates...</p>}
          {!isLoading && templates?.length === 0 && (
            <p className="text-xs text-white/40">Nenhum template encontrado.</p>
          )}
          {templates?.map((t: WABATemplate) => (
            <div key={t.id} className="flex items-center justify-between py-1.5">
              <div>
                <span className="text-xs font-mono font-medium text-white">{t.name}</span>
                <span className="ml-2 text-[10px] text-white/40">{t.language} · {t.category}</span>
              </div>
              <span className={`text-[10px] font-semibold ${statusCor(t.status)}`}>{t.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── card de conexão ───────────────────────────────────────────────────────────

type TesteStatus = "idle" | "loading" | "ok" | "error";

function ConexaoCard({ conexao }: { conexao: ConexaoWABA }) {
  const queryClient = useQueryClient();
  const [testeStatus,   setTesteStatus]   = useState<TesteStatus>("idle");
  const [testeMensagem, setTesteMensagem] = useState("");

  const deleteMutation = useMutation({
    mutationFn: () => conexaoWABAService.remove(conexao.id),
    onSuccess:  () => {
      toast.success("Conexão removida!");
      queryClient.invalidateQueries({ queryKey: ["conexoes-waba"] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.error ?? "Erro ao remover"),
  });

  const testeMutation = useMutation({
    mutationFn: () => conexaoWABAService.testar(conexao.id),
    onMutate:   () => { setTesteStatus("loading"); setTesteMensagem(""); },
    onSuccess:  (r) => {
      setTesteStatus(r.ok ? "ok" : "error");
      setTesteMensagem(r.mensagem);
      if (r.ok) toast.success("Conexão OK");
      else      toast.error("Falha na conexão");
    },
    onError: (err: any) => {
      setTesteStatus("error");
      setTesteMensagem(err?.response?.data?.error ?? "Erro desconhecido");
      toast.error("Falha ao testar");
    },
  });

  return (
    <Card className="space-y-3">
      {/* cabeçalho */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-green-500/20">
            <Phone className="h-4 w-4 text-green-400" />
          </div>
          <div>
            <p className="font-semibold text-white">{conexao.nome}</p>
            <p className="text-xs text-white/40">
              {conexao.displayPhone ?? conexao.phoneNumberId}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          {conexao.qualidade && (
            <span className={`rounded px-2 py-0.5 text-[10px] font-semibold ${qualidadeCor(conexao.qualidade)}`}>
              {qualidadeLabel(conexao.qualidade)}
            </span>
          )}
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

      {/* IDs */}
      <div className="grid grid-cols-2 gap-2 rounded-lg bg-white/5 px-3 py-2">
        <div>
          <p className="text-[10px] text-white/30">WABA ID</p>
          <p className="font-mono text-xs text-white/60">{conexao.wabaId}</p>
        </div>
        <div>
          <p className="text-[10px] text-white/30">Phone Number ID</p>
          <p className="font-mono text-xs text-white/60">{conexao.phoneNumberId}</p>
        </div>
        <div className="col-span-2">
          <p className="text-[10px] text-white/30">Access Token</p>
          <p className="font-mono text-xs text-white/60">{conexao.accessTokenMasked}</p>
        </div>
      </div>

      {/* resultado do teste */}
      {testeStatus !== "idle" && (
        <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
          testeStatus === "loading" ? "bg-white/5 text-white/60"
          : testeStatus === "ok"   ? "bg-green-500/10 text-green-400"
          : "bg-red-500/10 text-red-400"
        }`}>
          {testeStatus === "loading" && <Loader2 className="h-4 w-4 animate-spin" />}
          {testeStatus === "ok"      && <CheckCircle2 className="h-4 w-4" />}
          {testeStatus === "error"   && <XCircle className="h-4 w-4" />}
          <span>{testeStatus === "loading" ? "Testando conexão..." : testeMensagem}</span>
        </div>
      )}

      {/* templates */}
      <TemplatesPanel conexaoId={conexao.id} />

      {/* ações */}
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={testeMutation.isPending}
          onClick={() => testeMutation.mutate()}
          className="flex-1"
        >
          {testeMutation.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Zap className="mr-1.5 h-3.5 w-3.5" />}
          Testar
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

// ── página ────────────────────────────────────────────────────────────────────

export function ConfigWABA() {
  useMetaSDK();

  const navigate     = useNavigate();
  const queryClient  = useQueryClient();
  const [nomeOAuth,    setNomeOAuth]    = useState("");
  const [showManual,   setShowManual]   = useState(false);
  const [sdkPronto,    setSdkPronto]    = useState(false);
  const [conectando,   setConectando]   = useState(false);

  const sdkDisponivel = Boolean(META_APP_ID && META_CONFIG_ID);

  // Aguarda o SDK da Meta carregar
  useEffect(() => {
    if (!sdkDisponivel) return;
    const interval = setInterval(() => {
      if ((window as any).FB) {
        setSdkPronto(true);
        clearInterval(interval);
      }
    }, 300);
    return () => clearInterval(interval);
  }, [sdkDisponivel]);

  const { data: conexoes = [], isLoading } = useQuery({
    queryKey: ["conexoes-waba"],
    queryFn:  conexaoWABAService.list,
  });

  const oauthMutation = useMutation({
    mutationFn: ({ code, nome }: { code: string; nome: string }) =>
      conexaoWABAService.conectarOAuth(code, nome),
    onSuccess: () => {
      toast.success("Conta WABA conectada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["conexoes-waba"] });
      setNomeOAuth("");
      setConectando(false);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error ?? "Erro ao conectar conta WABA");
      setConectando(false);
    },
  });

  function abrirEmbeddedSignup() {
    if (!nomeOAuth.trim()) {
      toast.error("Informe um nome para a conexão antes de continuar.");
      return;
    }
    if (!(window as any).FB) {
      toast.error("SDK da Meta ainda não carregou. Aguarde e tente novamente.");
      return;
    }

    setConectando(true);

    (window as any).FB.login(
      (response: { authResponse?: { code?: string } }) => {
        if (response.authResponse?.code) {
          oauthMutation.mutate({ code: response.authResponse.code, nome: nomeOAuth.trim() });
        } else {
          toast.error("Autorização cancelada ou não concluída.");
          setConectando(false);
        }
      },
      {
        config_id:                      META_CONFIG_ID,
        response_type:                  "code",
        override_default_response_type: true,
        extras: {
          setup:              {},
          featureType:        "",
          sessionInfoVersion: "3",
        },
      },
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="WhatsApp Business API"
        subtitle="Conecte sua conta WABA e gerencie números, templates e disparos"
        onBack={() => navigate("/configuracoes")}
      />

      {/* ── Embedded Signup ── */}
      {sdkDisponivel ? (
        <Card className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-green-500/20">
              <Phone className="h-4 w-4 text-green-400" />
            </div>
            <div>
              <p className="font-semibold text-white">Conectar via Meta</p>
              <p className="text-xs text-white/40">
                Faça login com sua conta Meta e selecione a WABA automaticamente
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="mb-1 block text-xs text-white/50">Nome da conexão</label>
              <Input
                placeholder="ex: WABA Principal"
                value={nomeOAuth}
                onChange={(e) => setNomeOAuth(e.target.value)}
              />
            </div>
            <Button
              onClick={abrirEmbeddedSignup}
              disabled={conectando || !sdkPronto || oauthMutation.isPending}
              className="bg-[#1877F2] text-white hover:bg-[#166FE5]"
            >
              {conectando || oauthMutation.isPending ? (
                <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" />Conectando...</>
              ) : (
                <><Phone className="mr-1.5 h-4 w-4" />Conectar com Meta</>
              )}
            </Button>
          </div>

          {!sdkPronto && (
            <p className="flex items-center gap-1.5 text-xs text-white/30">
              <Loader2 className="h-3 w-3 animate-spin" />
              Aguardando SDK da Meta...
            </p>
          )}
        </Card>
      ) : (
        <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4 text-sm text-yellow-400">
          <p className="font-semibold">Embedded Signup não configurado</p>
          <p className="mt-1 text-xs text-yellow-400/70">
            Preencha <code className="font-mono">VITE_META_APP_ID</code> e{" "}
            <code className="font-mono">VITE_META_CONFIG_ID</code> no arquivo{" "}
            <code className="font-mono">.env</code> do frontend para habilitar o fluxo OAuth.
            <br />
            Por enquanto, use a opção manual abaixo.
          </p>
        </div>
      )}

      {/* ── Conexão manual ── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[11px] font-semibold uppercase tracking-widest text-white/40">
            Conexão manual
          </h2>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowManual((v) => !v)}
          >
            {showManual ? "Cancelar" : "Adicionar manualmente"}
          </Button>
        </div>

        {showManual && (
          <FormManual
            onSalvo={() => {
              setShowManual(false);
              queryClient.invalidateQueries({ queryKey: ["conexoes-waba"] });
            }}
            onCancelar={() => setShowManual(false)}
          />
        )}
      </section>

      {/* ── Conexões ativas ── */}
      <section className="space-y-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-white/40">
          Contas conectadas {isLoading ? "" : `(${conexoes.length})`}
        </h2>

        {isLoading && <p className="text-center text-sm text-white/40">Carregando...</p>}

        {!isLoading && conexoes.length === 0 && (
          <div className="rounded-xl border border-white/10 bg-white/5 px-6 py-8 text-center">
            <Phone className="mx-auto mb-3 h-8 w-8 text-white/20" />
            <p className="text-sm text-white/40">Nenhuma conta WABA conectada.</p>
            <p className="mt-1 text-xs text-white/30">
              Use o botão "Conectar com Meta" ou adicione manualmente.
            </p>
          </div>
        )}

        {conexoes.map((c) => (
          <ConexaoCard key={c.id} conexao={c} />
        ))}
      </section>

      {/* guia */}
      <Card>
        <details>
          <summary className="cursor-pointer text-sm font-semibold text-white/70 hover:text-white">
            Como configurar o webhook na Meta?
          </summary>
          <div className="mt-4 space-y-3 text-xs text-white/60">
            <ol className="list-inside list-decimal space-y-2">
              <li>Acesse <strong className="text-white">developers.facebook.com</strong> → seu App → WhatsApp → Configuração</li>
              <li>Em <strong className="text-white">Webhooks</strong>, insira a URL do backend:</li>
              <li>
                <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-white/80">
                  {(import.meta.env.VITE_API_URL ?? "https://seu-backend.com/api/v1")}/webhook/waba
                </code>
              </li>
              <li>No campo <strong className="text-white">Verify Token</strong>, insira o valor de <code className="font-mono">META_WEBHOOK_VERIFY_TOKEN</code> do backend</li>
              <li>Clique em <strong className="text-white">Verificar e salvar</strong></li>
              <li>Assine o campo <strong className="text-white">messages</strong> para receber mensagens e status</li>
            </ol>
          </div>
        </details>
      </Card>
    </div>
  );
}
