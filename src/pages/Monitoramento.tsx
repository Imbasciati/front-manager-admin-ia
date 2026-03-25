import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Bot, CheckCircle, Clock, XCircle } from "lucide-react";
import { PageHeader } from "../components/shared/PageHeader";
import { Card } from "../components/ui/card";
import { monitoramentoService, type AgenteStatus, type LogInteracao } from "../services/monitoramento.service";

// ── helpers ───────────────────────────────────────────────────────────────────

const SITUACAO_CONFIG = {
  ativo:    { label: "Ativo",       cor: "bg-emerald-500/20 text-emerald-400", dot: "bg-emerald-400", icon: CheckCircle },
  inativo:  { label: "Inativo",     cor: "bg-white/10 text-white/40",          dot: "bg-white/30",   icon: XCircle },
  problema: { label: "Sem ativ.",   cor: "bg-amber-500/20 text-amber-400",     dot: "bg-amber-400",  icon: AlertTriangle },
} as const;

const STATUS_CONFIG = {
  SUGESTAO:      { label: "Sugestão",      cor: "bg-blue-500/20 text-blue-400" },
  AUTO_RESPOSTA: { label: "Auto-resposta", cor: "bg-emerald-500/20 text-emerald-400" },
  EDITADA:       { label: "Editada",       cor: "bg-amber-500/20 text-amber-400" },
  IGNORADA:      { label: "Ignorada",      cor: "bg-red-500/20 text-red-400" },
} as const;

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
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

// ── StatCard ──────────────────────────────────────────────────────────────────

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

// ── Badge de situação ─────────────────────────────────────────────────────────

function SituacaoBadge({ situacao }: { situacao: AgenteStatus["situacao"] }) {
  const cfg = SITUACAO_CONFIG[situacao];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${cfg.cor}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

// ── Card de agente na lista ───────────────────────────────────────────────────

function AgentCard({ agente, selecionado, onClick }: { agente: AgenteStatus; selecionado: boolean; onClick: () => void }) {
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
        <SituacaoBadge situacao={agente.situacao} />
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

// ── Linha do log técnico ──────────────────────────────────────────────────────

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

// ── Filtros da lista ──────────────────────────────────────────────────────────

type Filtro = "todos" | "ativo" | "inativo" | "problema";

const FILTROS: { value: Filtro; label: string }[] = [
  { value: "todos",    label: "Todos" },
  { value: "ativo",    label: "Ativos" },
  { value: "inativo",  label: "Inativos" },
  { value: "problema", label: "Atenção" },
];

// ── Página ────────────────────────────────────────────────────────────────────

export function Monitoramento() {
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [filtro, setFiltro]           = useState<Filtro>("todos");

  const { data: agentes = [], isLoading } = useQuery({
    queryKey: ["monitoramento-agentes"],
    queryFn:  monitoramentoService.agentesStatus,
    refetchInterval: 30_000,
  });

  const { data: logs = [], isLoading: loadingLogs } = useQuery({
    queryKey: ["monitoramento-logs", selecionado],
    queryFn:  () => monitoramentoService.logsAgente(selecionado!),
    enabled:  !!selecionado,
    refetchInterval: 15_000,
  });

  const ativos    = agentes.filter((a) => a.situacao === "ativo").length;
  const inativos  = agentes.filter((a) => a.situacao === "inativo").length;
  const problemas = agentes.filter((a) => a.situacao === "problema").length;

  const filtrados  = filtro === "todos" ? agentes : agentes.filter((a) => a.situacao === filtro);
  const agenteAtual = agentes.find((a) => a.id === selecionado);

  return (
    <div className="flex h-full flex-col gap-5 overflow-hidden">
      <PageHeader title="Monitoramento" subtitle="Status e logs técnicos dos agentes de IA" />

      {/* ── stat cards ── */}
      <div className="grid shrink-0 gap-3 sm:grid-cols-3">
        <StatCard icon={CheckCircle}   label="Ativos"               valor={ativos}    cor="bg-emerald-500/20 text-emerald-400" />
        <StatCard icon={XCircle}       label="Inativos"              valor={inativos}  cor="bg-white/10 text-white/50" />
        <StatCard icon={AlertTriangle} label="Sem atividade recente" valor={problemas} cor="bg-amber-500/20 text-amber-400" />
      </div>

      {/* ── painel principal ── */}
      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[300px_1fr]">

        {/* ── lista de agentes ── */}
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
            {isLoading && (
              <div className="flex h-32 items-center justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            )}
            {!isLoading && filtrados.length === 0 && (
              <p className="py-10 text-center text-sm text-white/30">Nenhum agente neste filtro.</p>
            )}
            {filtrados.map((a) => (
              <AgentCard
                key={a.id}
                agente={a}
                selecionado={selecionado === a.id}
                onClick={() => setSelecionado(a.id)}
              />
            ))}
          </div>
        </Card>

        {/* ── log técnico ── */}
        <Card className="flex flex-col overflow-hidden p-0">
          <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-5 py-3">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-white/40" />
              <p className="font-semibold">
                {agenteAtual ? agenteAtual.nome : "Log técnico"}
              </p>
              {agenteAtual && <SituacaoBadge situacao={agenteAtual.situacao} />}
            </div>
            {agenteAtual && (
              <span className="text-xs text-white/30">{logs.length} registros</span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {!selecionado && (
              <div className="flex h-full items-center justify-center text-sm text-white/30">
                Selecione um agente para ver o log de interações
              </div>
            )}
            {selecionado && loadingLogs && (
              <div className="flex h-32 items-center justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            )}
            {selecionado && !loadingLogs && logs.length === 0 && (
              <div className="flex h-full items-center justify-center text-sm text-white/30">
                Nenhuma interação registrada para este agente.
              </div>
            )}
            {logs.map((log) => (
              <LogRow key={log.id} log={log} />
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
