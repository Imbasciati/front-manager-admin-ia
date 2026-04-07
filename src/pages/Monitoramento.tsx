import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle, Bot, CheckCircle, Clock, XCircle,
  Wifi, WifiOff, RefreshCw, ChevronDown, ChevronRight,
  Activity, Zap, AlertCircle,
} from "lucide-react";
import { PageHeader } from "../components/shared/PageHeader";
import { Card } from "../components/ui/card";
import {
  monitoramentoService,
  type AgenteStatus,
  type LogInteracao,
  type EventoAgente,
  type ErroExecucao,
  type ConexaoStatus,
} from "../services/monitoramento.service";

// ── helpers ───────────────────────────────────────────────────────────────────

const SITUACAO_CONFIG = {
  ativo:    { label: "Ativo",     cor: "bg-emerald-500/20 text-emerald-400", dot: "bg-emerald-400", icon: CheckCircle },
  inativo:  { label: "Inativo",   cor: "bg-white/10 text-white/40",          dot: "bg-white/30",   icon: XCircle },
  problema: { label: "Sem ativ.", cor: "bg-amber-500/20 text-amber-400",     dot: "bg-amber-400",  icon: AlertTriangle },
} as const;

const STATUS_CONFIG = {
  SUGESTAO:      { label: "Sugestão",      cor: "bg-blue-500/20 text-blue-400" },
  AUTO_RESPOSTA: { label: "Auto-resposta", cor: "bg-emerald-500/20 text-emerald-400" },
  EDITADA:       { label: "Editada",       cor: "bg-amber-500/20 text-amber-400" },
  IGNORADA:      { label: "Ignorada",      cor: "bg-red-500/20 text-red-400" },
} as const;

const CONEXAO_CONFIG: Record<string, { label: string; cor: string; icon: React.ElementType }> = {
  ONLINE:       { label: "Online",       cor: "text-emerald-400", icon: Wifi },
  OFFLINE:      { label: "Offline",      cor: "text-white/40",    icon: WifiOff },
  ERRO:         { label: "Erro",         cor: "text-red-400",     icon: WifiOff },
  DESCONHECIDO: { label: "Desconhecido", cor: "text-white/30",    icon: Wifi },
};

const TIPO_EVENTO_CONFIG: Record<string, { label: string; cor: string }> = {
  MENSAGEM_RECEBIDA: { label: "Recebida",   cor: "bg-blue-500/20 text-blue-400" },
  LOTE_PROCESSADO:   { label: "Processado", cor: "bg-emerald-500/20 text-emerald-400" },
  ERRO_WEBHOOK:      { label: "Erro",       cor: "bg-red-500/20 text-red-400" },
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function formatRelativo(iso: string | null) {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const min  = Math.floor(diff / 60000);
  const h    = Math.floor(min / 60);
  const d    = Math.floor(h / 24);
  if (d > 0)   return `${d}d atrás`;
  if (h > 0)   return `${h}h atrás`;
  if (min > 0) return `${min}min atrás`;
  return "agora";
}

// ── Sub-componentes ───────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, valor, cor }: { icon: React.ElementType; label: string; valor: number; cor: string }) {
  return (
    <Card className="flex items-center gap-4">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${cor}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-sm text-white/60">{label}</p>
        <p className="text-2xl font-heading font-bold">{valor}</p>
      </div>
    </Card>
  );
}

function SituacaoBadge({ situacao }: { situacao: AgenteStatus["situacao"] }) {
  const cfg = SITUACAO_CONFIG[situacao];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${cfg.cor}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function ConexaoBadge({ status }: { status: string }) {
  const cfg = CONEXAO_CONFIG[status] ?? CONEXAO_CONFIG.DESCONHECIDO;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${cfg.cor}`}>
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  );
}

function AgentCard({
  agente,
  conexao,
  selecionado,
  onClick,
}: {
  agente: AgenteStatus;
  conexao?: ConexaoStatus;
  selecionado: boolean;
  onClick: () => void;
}) {
  const avatarCor =
    agente.situacao === "ativo" ? "bg-emerald-700" :
    agente.situacao === "problema" ? "bg-amber-700" : "bg-white/15";

  return (
    <button
      onClick={onClick}
      className={`w-full rounded-xl border px-4 py-3 text-left transition ${
        selecionado ? "border-primary/60 bg-primary/10" : "border-white/10 hover:border-white/20 hover:bg-white/5"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${avatarCor}`}>
            {agente.nome.charAt(0).toUpperCase()}
          </div>
          <div className="overflow-hidden">
            <p className="truncate text-sm font-medium text-white">{agente.nome}</p>
            <p className="truncate text-[11px] text-white/40">{agente.modelo}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <SituacaoBadge situacao={agente.situacao} />
          {conexao && <ConexaoBadge status={conexao.status} />}
        </div>
      </div>
      <div className="mt-2 flex items-center gap-3 pl-[46px] text-[11px] text-white/35">
        <span>{agente.totalInteracoes.toLocaleString("pt-BR")} interações</span>
        {agente.ultimaInteracao && (
          <>
            <span>·</span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatRelativo(agente.ultimaInteracao)}
            </span>
          </>
        )}
      </div>
    </button>
  );
}

// ── Aba Atividade ─────────────────────────────────────────────────────────────

function LogRow({ log }: { log: LogInteracao }) {
  const cfg = STATUS_CONFIG[log.statusResposta];
  return (
    <div className="border-b border-white/5 px-4 py-3 hover:bg-white/[0.025]">
      <div className="flex items-center gap-3 text-[12px]">
        <span className="w-[108px] shrink-0 text-[11px] text-white/35">{formatDateTime(log.criadoEm)}</span>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${cfg.cor}`}>{cfg.label}</span>
        <span className="truncate text-white/60">{log.usuario.nome}</span>
        <span className="ml-auto shrink-0 text-[11px] text-white/25">{log.telefone}</span>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 pl-[108px]">
        <div className="overflow-hidden rounded-lg bg-white/5 px-3 py-2">
          <p className="mb-1 text-[10px] text-white/30">Cliente</p>
          <p className="text-[12px] leading-relaxed text-white/75 line-clamp-2">{log.mensagemOriginal}</p>
        </div>
        <div className="overflow-hidden rounded-lg bg-primary/10 px-3 py-2">
          <p className="mb-1 text-[10px] text-primary/50">IA</p>
          <p className="text-[12px] leading-relaxed text-white/75 line-clamp-2">{log.respostaIA}</p>
        </div>
      </div>
    </div>
  );
}

// ── Aba Eventos ───────────────────────────────────────────────────────────────

function EventoRow({ evento }: { evento: EventoAgente }) {
  const [expandido, setExpandido] = useState(false);
  const cfg = TIPO_EVENTO_CONFIG[evento.tipo] ?? { label: evento.tipo, cor: "bg-white/10 text-white/50" };
  const temErro = !!evento.erro;

  return (
    <div className={`border-b border-white/5 ${temErro ? "bg-red-500/[0.03]" : ""}`}>
      <button
        onClick={() => setExpandido((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.025]"
      >
        <span className="w-[128px] shrink-0 text-[11px] text-white/35">{formatDateTime(evento.criadoEm)}</span>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${cfg.cor}`}>{cfg.label}</span>
        <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] text-white/40 bg-white/5">{evento.canal}</span>
        {evento.contactId && (
          <span className="truncate text-[11px] text-white/40 font-mono">{evento.contactId}</span>
        )}
        {temErro && (
          <span className="ml-auto shrink-0 flex items-center gap-1 text-[11px] text-red-400">
            <AlertCircle className="h-3 w-3" />
            Erro
          </span>
        )}
        <span className="ml-auto shrink-0 text-white/30">
          {expandido ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        </span>
      </button>

      {expandido && (
        <div className="px-4 pb-3 space-y-2">
          {temErro && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2">
              <p className="text-[10px] text-red-400/70 mb-1">Erro</p>
              <p className="text-[12px] text-red-300 font-mono">{evento.erro}</p>
            </div>
          )}
          <div className="rounded-lg bg-white/5 px-3 py-2">
            <p className="text-[10px] text-white/30 mb-1.5">Payload JSON</p>
            <pre className="text-[11px] text-white/70 font-mono overflow-x-auto whitespace-pre-wrap break-all leading-relaxed max-h-64 overflow-y-auto">
              {JSON.stringify(evento.payload, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Aba Erros ─────────────────────────────────────────────────────────────────

function ErroRow({ erro }: { erro: ErroExecucao }) {
  const [expandido, setExpandido] = useState(false);

  return (
    <div className="border-b border-white/5">
      <button
        onClick={() => setExpandido((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.025]"
      >
        <span className="w-[128px] shrink-0 text-[11px] text-white/35">{formatDateTime(erro.criadoEm)}</span>
        <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] text-white/40 bg-white/5">{erro.canal}</span>
        <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] text-white/40 bg-white/5">{erro.modelo}</span>
        <span className="truncate text-[12px] text-red-400/80 font-mono">{erro.erro}</span>
        <span className="ml-auto shrink-0 text-white/30">
          {expandido ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        </span>
      </button>

      {expandido && (
        <div className="px-4 pb-3 space-y-2">
          <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2">
            <p className="text-[10px] text-red-400/70 mb-1">Mensagem de erro</p>
            <p className="text-[12px] text-red-300 font-mono whitespace-pre-wrap">{erro.erro}</p>
          </div>
          <div className="rounded-lg bg-white/5 px-3 py-2">
            <p className="text-[10px] text-white/30 mb-1.5">Mensagem do cliente</p>
            <p className="text-[12px] text-white/70 leading-relaxed">{erro.inputMensagem}</p>
          </div>
          <div className="flex gap-4 text-[11px] text-white/35">
            <span>Contact: <span className="font-mono text-white/50">{erro.contactId}</span></span>
            <span>Duração: {erro.duracao}ms</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Aba Conexões ──────────────────────────────────────────────────────────────

function ConexaoRow({ conexao, onVerificar }: { conexao: ConexaoStatus; onVerificar: () => void }) {
  const cfg = CONEXAO_CONFIG[conexao.status] ?? CONEXAO_CONFIG.DESCONHECIDO;
  const Icon = cfg.icon;

  return (
    <div className="flex items-center gap-4 border-b border-white/5 px-4 py-3 hover:bg-white/[0.025]">
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white bg-white/10`}>
        {conexao.nome.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{conexao.nome}</p>
        {conexao.detalhe && (
          <p className="text-[11px] text-white/40 truncate">{conexao.detalhe}</p>
        )}
      </div>
      <div className="shrink-0 text-right">
        <div className={`flex items-center gap-1 justify-end text-[12px] font-medium ${cfg.cor}`}>
          <Icon className="h-3.5 w-3.5" />
          {cfg.label}
        </div>
        {conexao.verificadoEm && (
          <p className="text-[10px] text-white/25">{formatRelativo(conexao.verificadoEm)}</p>
        )}
      </div>
      {conexao.unnichatAtivo && (
        <button
          onClick={onVerificar}
          className="shrink-0 rounded-lg border border-white/10 p-1.5 text-white/40 hover:border-white/20 hover:text-white/70 transition"
          title="Verificar agora"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

// ── Filtros da lista ──────────────────────────────────────────────────────────

type Filtro = "todos" | "ativo" | "inativo" | "problema";
const FILTROS: { value: Filtro; label: string }[] = [
  { value: "todos",    label: "Todos" },
  { value: "ativo",    label: "Ativos" },
  { value: "inativo",  label: "Inativos" },
  { value: "problema", label: "Atenção" },
];

type Aba = "atividade" | "eventos" | "erros" | "conexoes";
const ABAS: { value: Aba; label: string; icon: React.ElementType }[] = [
  { value: "atividade", label: "Atividade",  icon: Activity },
  { value: "eventos",   label: "Eventos",    icon: Zap },
  { value: "erros",     label: "Erros",      icon: AlertCircle },
  { value: "conexoes",  label: "Conexões",   icon: Wifi },
];

// ── Página ────────────────────────────────────────────────────────────────────

export function Monitoramento() {
  const queryClient = useQueryClient();
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [filtro, setFiltro]           = useState<Filtro>("todos");
  const [aba, setAba]                 = useState<Aba>("atividade");
  const [apenasErros, setApenasErros] = useState(false);

  const { data: agentes = [], isLoading } = useQuery({
    queryKey: ["monitoramento-agentes"],
    queryFn:  monitoramentoService.agentesStatus,
    refetchInterval: 30_000,
  });

  const { data: conexoes = [] } = useQuery({
    queryKey: ["monitoramento-conexoes"],
    queryFn:  monitoramentoService.conexoesStatus,
    refetchInterval: 60_000,
  });

  const { data: logs = [], isLoading: loadingLogs } = useQuery({
    queryKey: ["monitoramento-logs", selecionado],
    queryFn:  () => monitoramentoService.logsAgente(selecionado!),
    enabled:  !!selecionado && aba === "atividade",
    refetchInterval: 15_000,
  });

  const { data: eventosResp, isLoading: loadingEventos } = useQuery({
    queryKey: ["monitoramento-eventos", selecionado, apenasErros],
    queryFn:  () => monitoramentoService.eventosAgente(selecionado!, { erros: apenasErros }),
    enabled:  !!selecionado && aba === "eventos",
    refetchInterval: 15_000,
  });

  const { data: erros = [], isLoading: loadingErros } = useQuery({
    queryKey: ["monitoramento-erros", selecionado],
    queryFn:  () => monitoramentoService.errosAgente(selecionado!),
    enabled:  !!selecionado && aba === "erros",
    refetchInterval: 30_000,
  });

  const verificarMutation = useMutation({
    mutationFn: (agenteId: string) => monitoramentoService.verificarConexao(agenteId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["monitoramento-conexoes"] });
    },
  });

  const ativos    = agentes.filter((a) => a.situacao === "ativo").length;
  const inativos  = agentes.filter((a) => a.situacao === "inativo").length;
  const problemas = agentes.filter((a) => a.situacao === "problema").length;

  const filtrados   = filtro === "todos" ? agentes : agentes.filter((a) => a.situacao === filtro);
  const agenteAtual = agentes.find((a) => a.id === selecionado);

  const conexaoMap = new Map(conexoes.map((c) => [c.agenteId, c]));

  const eventos = eventosResp?.eventos ?? [];
  const resumo  = eventosResp?.resumo;

  // Painel direito: conteúdo da aba selecionada
  function renderPainelDireito() {
    if (aba === "conexoes") {
      return (
        <div className="flex-1 overflow-y-auto">
          {conexoes.length === 0 && (
            <div className="flex h-full items-center justify-center text-sm text-white/30">
              Nenhum agente com integração configurada.
            </div>
          )}
          {conexoes.map((c) => (
            <ConexaoRow
              key={c.agenteId}
              conexao={c}
              onVerificar={() => verificarMutation.mutate(c.agenteId)}
            />
          ))}
        </div>
      );
    }

    if (!selecionado) {
      return (
        <div className="flex h-full items-center justify-center text-sm text-white/30">
          Selecione um agente para ver os dados
        </div>
      );
    }

    if (aba === "atividade") {
      if (loadingLogs) return <Spinner />;
      if (logs.length === 0) return <Empty msg="Nenhuma interação registrada para este agente." />;
      return <div className="flex-1 overflow-y-auto">{logs.map((l) => <LogRow key={l.id} log={l} />)}</div>;
    }

    if (aba === "eventos") {
      if (loadingEventos) return <Spinner />;
      return (
        <div className="flex flex-col overflow-hidden h-full">
          {resumo && (
            <div className="shrink-0 flex items-center gap-4 border-b border-white/5 px-4 py-2 text-[11px] text-white/40">
              <span>{resumo.total} eventos nas últimas 24h</span>
              {resumo.erros > 0 && (
                <span className="text-red-400">{resumo.erros} com erro</span>
              )}
            </div>
          )}
          {eventos.length === 0
            ? <Empty msg="Nenhum evento registrado." />
            : <div className="flex-1 overflow-y-auto">{eventos.map((e) => <EventoRow key={e.id} evento={e} />)}</div>
          }
        </div>
      );
    }

    if (aba === "erros") {
      if (loadingErros) return <Spinner />;
      if (erros.length === 0) return <Empty msg="Nenhum erro de execução registrado." />;
      return <div className="flex-1 overflow-y-auto">{erros.map((e) => <ErroRow key={e.id} erro={e} />)}</div>;
    }

    return null;
  }

  return (
    <div className="flex h-full flex-col gap-5 overflow-hidden">
      <PageHeader title="Monitoramento" subtitle="Eventos, erros e conectividade dos agentes de IA" />

      {/* stat cards */}
      <div className="grid shrink-0 gap-3 sm:grid-cols-3">
        <StatCard icon={CheckCircle}   label="Ativos"               valor={ativos}    cor="bg-emerald-500/20 text-emerald-400" />
        <StatCard icon={XCircle}       label="Inativos"              valor={inativos}  cor="bg-white/10 text-white/50" />
        <StatCard icon={AlertTriangle} label="Sem atividade recente" valor={problemas} cor="bg-amber-500/20 text-amber-400" />
      </div>

      {/* painel principal */}
      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[300px_1fr]">

        {/* lista de agentes */}
        <Card className="flex flex-col overflow-hidden p-0">
          <div className="flex shrink-0 gap-1 border-b border-white/10 px-3 py-2">
            {FILTROS.map((f) => (
              <button
                key={f.value}
                onClick={() => setFiltro(f.value)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  filtro === f.value
                    ? "bg-primary/20 text-primary"
                    : "text-white/50 hover:bg-white/5 hover:text-white"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto p-3">
            {isLoading && <Spinner />}
            {!isLoading && filtrados.length === 0 && (
              <p className="py-10 text-center text-sm text-white/30">Nenhum agente neste filtro.</p>
            )}
            {filtrados.map((a) => (
              <AgentCard
                key={a.id}
                agente={a}
                conexao={conexaoMap.get(a.id)}
                selecionado={selecionado === a.id}
                onClick={() => setSelecionado(a.id)}
              />
            ))}
          </div>
        </Card>

        {/* painel de detalhes */}
        <Card className="flex flex-col overflow-hidden p-0">
          {/* header com abas */}
          <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-2">
            <div className="flex items-center gap-1">
              {ABAS.map((a) => {
                const Icon = a.icon;
                return (
                  <button
                    key={a.value}
                    onClick={() => setAba(a.value)}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                      aba === a.value
                        ? "bg-primary/20 text-primary"
                        : "text-white/50 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {a.label}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              {aba === "eventos" && selecionado && (
                <button
                  onClick={() => setApenasErros((v) => !v)}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition ${
                    apenasErros
                      ? "bg-red-500/20 text-red-400"
                      : "text-white/40 hover:bg-white/5 hover:text-white/60"
                  }`}
                >
                  Só erros
                </button>
              )}
              {agenteAtual && aba !== "conexoes" && (
                <div className="flex items-center gap-2">
                  <Bot className="h-4 w-4 text-white/30" />
                  <span className="text-xs font-medium text-white/60">{agenteAtual.nome}</span>
                </div>
              )}
            </div>
          </div>

          {/* conteúdo */}
          <div className="flex flex-1 flex-col overflow-hidden">
            {renderPainelDireito()}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ── micro-helpers de UI ───────────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="flex h-32 items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}

function Empty({ msg }: { msg: string }) {
  return (
    <div className="flex h-full items-center justify-center text-sm text-white/30">{msg}</div>
  );
}
