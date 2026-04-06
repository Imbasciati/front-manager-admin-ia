import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  addMonths, eachDayOfInterval, endOfMonth, endOfWeek,
  format, isBefore, isSameDay, isWithinInterval,
  startOfMonth, startOfWeek, subDays, subMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid,
  Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  Bot, Calendar, ChevronDown, ChevronLeft, ChevronRight,
  Clock, MessageCircle, ShieldCheck, Users, X, Zap, AlertTriangle,
} from "lucide-react";
import { PageHeader } from "../components/shared/PageHeader";
import { Card } from "../components/ui/card";
import { api } from "../services/api";

// ── tipos ──────────────────────────────────────────────────────────────────────

interface Metricas {
  totalExecucoes: number;
  execucoesOk: number;
  execucoesErro: number;
  taxaErrosPct: number;
  slaMediaMs: number;
  slaMinMs: number;
  slaMaxMs: number;
  totalAtendimentos: number;
  duracaoMediaAtendMs: number;
  atendPorStatus: { status: string; total: number }[];
  mensagensCliente: number;
  mensagensIA: number;
  mensagensVendedor: number;
  totalMensagens: number;
  mediaMsgsPorAtend: number;
}

interface DiaDados {
  dia: string;
  execucoes: number;
  slaMedia: number;
  erros: number;
}

interface QualidadeAgente {
  agenteId: string;
  nomeAgente: string;
  atuacao: string | null;
  modelo: string;
  totalExecucoes: number;
  execucoesErro: number;
  taxaErrosPct: number;
  slaMediaMs: number;
  contatosUnicos: number;
  mediaInteracoesPorContato: number;
  qualidade: number;
}

interface AgenteInfo {
  id: string; nome: string; atuacao: string | null; modelo: string; ativo: boolean;
}

interface DateRange { from: Date | null; to: Date | null }

// ── helpers ─────────────────────────────────────────────────────────────────────

type ApiResp<T> = { success: boolean; data: T };

function buildParams(range: DateRange, agenteId = "") {
  const p: Record<string, string> = {};
  if (range.from) p.dataInicio = format(range.from, "yyyy-MM-dd");
  if (range.to)   p.dataFim    = format(range.to,   "yyyy-MM-dd");
  if (agenteId)   p.agenteId   = agenteId;
  return p;
}

function formatMs(ms: number): string {
  if (!ms || ms <= 0) return "—";
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  const m = Math.floor(ms / 60_000);
  const s = Math.round((ms % 60_000) / 1000);
  return `${m}m ${s}s`;
}

function formatDia(dia: string) {
  return format(new Date(dia + "T00:00:00"), "dd/MM", { locale: ptBR });
}

const STATUS_LABEL: Record<string, string> = {
  NOVO: "Novos", EM_ANDAMENTO: "Em andamento",
  AGUARDANDO: "Aguardando", FINALIZADO: "Finalizados",
};

function qualBadge(score: number) {
  if (score >= 80) return { bg: "bg-emerald-500/15", text: "text-emerald-400", label: "Excelente", bar: "#10b981" };
  if (score >= 60) return { bg: "bg-amber-500/15",   text: "text-amber-400",   label: "Bom",       bar: "#f59e0b" };
  if (score >= 40) return { bg: "bg-orange-500/15",  text: "text-orange-400",  label: "Regular",   bar: "#f97316" };
  return              { bg: "bg-red-500/15",          text: "text-red-400",     label: "Crítico",   bar: "#ef4444" };
}

// ── DateRangePicker ─────────────────────────────────────────────────────────────

const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function DateRangePicker({ value, onChange }: { value: DateRange; onChange: (r: DateRange) => void }) {
  const [open, setOpen]       = useState(false);
  const [month, setMonth]     = useState(new Date());
  const [hovered, setHovered] = useState<Date | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const start = startOfWeek(startOfMonth(month), { weekStartsOn: 0 });
  const end   = endOfWeek(endOfMonth(month),     { weekStartsOn: 0 });
  const dias  = eachDayOfInterval({ start, end });

  function selectDia(dia: Date) {
    if (!value.from || value.to) {
      onChange({ from: dia, to: null });
    } else if (isBefore(dia, value.from)) {
      onChange({ from: dia, to: null });
    } else {
      onChange({ from: value.from, to: dia });
      setOpen(false);
    }
  }

  function emRange(dia: Date) {
    const fim = value.from && !value.to && hovered && !isBefore(hovered, value.from) ? hovered : value.to;
    if (value.from && fim) return isWithinInterval(dia, { start: value.from, end: fim });
    return false;
  }

  const label = value.from
    ? value.to
      ? `${format(value.from, "dd/MM/yy")} → ${format(value.to, "dd/MM/yy")}`
      : `${format(value.from, "dd/MM/yy")} → ...`
    : "Selecionar período";

  const atalhos = [
    { label: "Hoje",     from: new Date(),               to: new Date() },
    { label: "7 dias",   from: subDays(new Date(), 6),   to: new Date() },
    { label: "30 dias",  from: subDays(new Date(), 29),  to: new Date() },
    { label: "Este mês", from: startOfMonth(new Date()), to: new Date() },
    { label: "Mês ant.", from: startOfMonth(subMonths(new Date(), 1)), to: endOfMonth(subMonths(new Date(), 1)) },
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex h-9 items-center gap-2 rounded-lg border px-3 text-sm transition-all ${
          open || value.from
            ? "border-primary/60 bg-primary/10 text-white"
            : "border-white/10 bg-white/5 text-white/60 hover:border-white/20 hover:bg-white/8 hover:text-white"
        }`}
      >
        <Calendar className="h-3.5 w-3.5 shrink-0" />
        <span className="whitespace-nowrap">{label}</span>
        {value.from ? (
          <span
            className="ml-0.5 rounded-full p-0.5 hover:bg-white/15 transition-colors"
            onClick={e => { e.stopPropagation(); onChange({ from: null, to: null }); }}
          >
            <X className="h-3 w-3" />
          </span>
        ) : (
          <ChevronDown className="h-3 w-3 text-white/30" />
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-72 rounded-xl border border-white/10 bg-[#0f172a] shadow-2xl shadow-black/60">
          <div className="flex flex-wrap gap-1.5 border-b border-white/8 px-4 py-3">
            {atalhos.map(a => (
              <button
                key={a.label}
                onClick={() => { onChange({ from: a.from, to: a.to }); setOpen(false); }}
                className="rounded-full bg-white/5 px-2.5 py-1 text-[10px] font-medium text-white/60 hover:bg-primary/20 hover:text-primary transition-colors"
              >
                {a.label}
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between px-4 pt-3 pb-2">
            <button onClick={() => setMonth(m => subMonths(m, 1))} className="rounded-lg p-1.5 text-white/40 hover:bg-white/10 hover:text-white transition-colors">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-semibold capitalize text-white">
              {format(month, "MMMM yyyy", { locale: ptBR })}
            </span>
            <button onClick={() => setMonth(m => addMonths(m, 1))} className="rounded-lg p-1.5 text-white/40 hover:bg-white/10 hover:text-white transition-colors">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-7 px-2">
            {DIAS_SEMANA.map(d => (
              <div key={d} className="py-1 text-center text-[10px] font-medium text-white/25">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-y-0.5 px-2 pb-4">
            {dias.map((dia, idx) => {
              const isFrom   = value.from ? isSameDay(dia, value.from) : false;
              const isTo     = value.to   ? isSameDay(dia, value.to)   : false;
              const inRange  = emRange(dia);
              const mesAtual = dia.getMonth() === month.getMonth();
              const isEdge   = isFrom || isTo;
              return (
                <button
                  key={idx}
                  onClick={() => selectDia(dia)}
                  onMouseEnter={() => setHovered(dia)}
                  onMouseLeave={() => setHovered(null)}
                  className={[
                    "relative h-8 text-xs font-medium transition-colors select-none",
                    !mesAtual ? "text-white/15 pointer-events-none" : "cursor-pointer",
                    isEdge
                      ? "bg-primary text-white z-10 rounded-lg"
                      : inRange
                        ? "bg-primary/15 text-primary"
                        : mesAtual
                          ? "text-white/70 hover:bg-white/10 hover:text-white rounded-lg"
                          : "",
                  ].join(" ")}
                >
                  {format(dia, "d")}
                </button>
              );
            })}
          </div>
          {value.from && !value.to && (
            <p className="border-t border-white/8 px-4 py-2.5 text-center text-[10px] text-white/30">
              Clique em outra data para fechar o intervalo
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── FilterSelect ────────────────────────────────────────────────────────────────

function FilterSelect({
  label, value, onChange, options, placeholder,
}: {
  label: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[]; placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selected = options.find(o => o.value === value);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex h-9 items-center gap-2 rounded-lg border px-3 text-sm transition-all min-w-[140px] ${
          open || value
            ? "border-primary/60 bg-primary/10 text-white"
            : "border-white/10 bg-white/5 text-white/60 hover:border-white/20 hover:bg-white/8 hover:text-white"
        }`}
      >
        <span className="flex-1 text-left truncate">
          {selected ? selected.label : <span className="text-white/35">{placeholder ?? label}</span>}
        </span>
        {value ? (
          <span className="rounded-full p-0.5 hover:bg-white/15 transition-colors" onClick={e => { e.stopPropagation(); onChange(""); }}>
            <X className="h-3 w-3" />
          </span>
        ) : (
          <ChevronDown className="h-3 w-3 text-white/30 shrink-0" />
        )}
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 min-w-[180px] rounded-xl border border-white/10 bg-[#0f172a] shadow-2xl shadow-black/60 overflow-hidden">
          <div className="max-h-52 overflow-y-auto py-1">
            {options.length === 0 ? (
              <p className="px-4 py-3 text-xs text-white/30">Nenhuma opção</p>
            ) : (
              options.map(o => (
                <button
                  key={o.value}
                  onClick={() => { onChange(o.value); setOpen(false); }}
                  className={`flex w-full items-center gap-2 px-4 py-2.5 text-sm transition-colors text-left ${
                    o.value === value ? "bg-primary/10 text-primary" : "text-white/70 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  {o.value === value && <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />}
                  <span className="truncate">{o.label}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tooltip customizado ─────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-white/10 bg-[#0f172a] px-3 py-2 text-xs shadow-xl">
      <p className="mb-1.5 font-semibold text-white/60">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="flex items-center gap-2" style={{ color: p.color }}>
          <span className="h-2 w-2 rounded-full shrink-0" style={{ background: p.color }} />
          {p.name}: <span className="font-semibold text-white ml-1">{typeof p.value === "number" && p.name.includes("SLA") ? formatMs(p.value) : p.value}</span>
        </p>
      ))}
    </div>
  );
}

// ── Página Uso ──────────────────────────────────────────────────────────────────

type Tab = "visao-geral" | "qualidade";

export function Uso() {
  const [dateRange, setDateRange]     = useState<DateRange>({ from: null, to: null });
  const [filterAgente, setFilterAgente] = useState("");
  const [activeTab, setActiveTab]     = useState<Tab>("visao-geral");

  const params = buildParams(dateRange, filterAgente);
  const qOpts  = { staleTime: 60_000 };

  const metricasQ  = useQuery<Metricas>({
    queryKey: ["uso-metricas", params],
    queryFn:  () => api.get<ApiResp<Metricas>>("/uso/metricas", { params }).then(r => r.data.data),
    ...qOpts,
  });
  const porDiaQ    = useQuery<DiaDados[]>({
    queryKey: ["uso-por-dia", params],
    queryFn:  () => api.get<ApiResp<DiaDados[]>>("/uso/por-dia", { params }).then(r => r.data.data),
    ...qOpts,
  });
  const qualidadeQ = useQuery<QualidadeAgente[]>({
    queryKey: ["uso-qualidade", params],
    queryFn:  () => api.get<ApiResp<QualidadeAgente[]>>("/uso/qualidade", { params }).then(r => r.data.data),
    ...qOpts,
  });
  const agentesQ   = useQuery<AgenteInfo[]>({
    queryKey: ["agentes-lista-uso"],
    queryFn:  () => api.get<ApiResp<AgenteInfo[]>>("/agentes").then(r => r.data.data),
    staleTime: 300_000,
  });

  const m = metricasQ.data;
  const agentesOpcoes = (agentesQ.data ?? []).map(a => ({ value: a.id, label: a.nome }));
  const hasFilters = !!dateRange.from || !!filterAgente;

  // Merge porDia para garantir que dias sem execuções apareçam apenas se data foi filtrada
  const diasData = porDiaQ.data ?? [];

  // Dados de mensagens para gráfico de barras
  const msgBreakdown = m ? [
    { label: "Cliente",  total: m.mensagensCliente,  fill: "#6366f1" },
    { label: "IA",       total: m.mensagensIA,        fill: "#00C896" },
    { label: "Vendedor", total: m.mensagensVendedor,  fill: "#f59e0b" },
  ] : [];

  // Atendimentos por status para gráfico
  const statusData = (m?.atendPorStatus ?? []).map(s => ({
    label: STATUS_LABEL[s.status] ?? s.status,
    total: s.total,
  }));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Uso"
        subtitle="Métricas operacionais e de qualidade da IA"
      />

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <DateRangePicker value={dateRange} onChange={setDateRange} />
        <FilterSelect
          label="Agente"
          value={filterAgente}
          onChange={setFilterAgente}
          options={agentesOpcoes}
          placeholder="Todos os agentes"
        />
        {hasFilters && (
          <button
            onClick={() => { setDateRange({ from: null, to: null }); setFilterAgente(""); }}
            className="flex h-9 items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 text-xs text-white/50 hover:bg-white/8 hover:text-white/80 transition-colors"
          >
            <X className="h-3 w-3" />
            Limpar filtros
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-500/15">
            <Zap className="h-4 w-4 text-indigo-400" />
          </div>
          <div>
            <p className="text-xs text-white/50">Execuções</p>
            <p className="text-2xl font-heading font-bold text-white">
              {m?.totalExecucoes.toLocaleString("pt-BR") ?? "—"}
            </p>
            {m && (
              <p className="mt-0.5 text-[10px] text-white/40">
                {m.execucoesOk} ok · <span className="text-red-400">{m.execucoesErro} erros</span>
              </p>
            )}
          </div>
        </Card>

        <Card className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15">
            <Clock className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-xs text-white/50">SLA Médio</p>
            <p className="text-2xl font-heading font-bold text-white">
              {m ? formatMs(m.slaMediaMs) : "—"}
            </p>
            {m && (
              <p className="mt-0.5 text-[10px] text-white/40">
                min {formatMs(m.slaMinMs)} · max {formatMs(m.slaMaxMs)}
              </p>
            )}
          </div>
        </Card>

        <Card className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/15">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
          </div>
          <div>
            <p className="text-xs text-white/50">Taxa de Erros</p>
            <p className={`text-2xl font-heading font-bold ${
              m && m.taxaErrosPct > 5 ? "text-red-400" : m && m.taxaErrosPct > 1 ? "text-amber-400" : "text-white"
            }`}>
              {m ? `${m.taxaErrosPct.toFixed(1)}%` : "—"}
            </p>
            {m && (
              <p className="mt-0.5 text-[10px] text-white/40">
                {m.execucoesErro} execuções com erro
              </p>
            )}
          </div>
        </Card>

        <Card className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15">
            <MessageCircle className="h-4 w-4 text-emerald-400" />
          </div>
          <div>
            <p className="text-xs text-white/50">Atendimentos</p>
            <p className="text-2xl font-heading font-bold text-white">
              {m?.totalAtendimentos.toLocaleString("pt-BR") ?? "—"}
            </p>
            {m && (
              <p className="mt-0.5 text-[10px] text-white/40">
                duração média {formatMs(m.duracaoMediaAtendMs)} · {m.mediaMsgsPorAtend} msgs/atend.
              </p>
            )}
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-white/8 bg-white/3 p-1 w-fit">
        {([
          ["visao-geral", "Visão Geral"],
          ["qualidade",   "Qualidade por Agente"],
        ] as [Tab, string][]).map(([tab, label]) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              activeTab === tab
                ? "bg-primary/20 text-primary shadow-sm"
                : "text-white/50 hover:text-white/80"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab: Visão Geral */}
      {activeTab === "visao-geral" && (
        <div className="space-y-4">

          {/* Gráfico: Execuções por dia */}
          <Card>
            <p className="mb-4 text-sm font-semibold text-white/70">Execuções por dia</p>
            {diasData.length === 0 ? (
              <div className="flex h-52 items-center justify-center text-sm text-white/30">
                Sem dados no período
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={diasData}>
                  <defs>
                    <linearGradient id="grad-exec" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.6} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}   />
                    </linearGradient>
                    <linearGradient id="grad-erros" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.5} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}   />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="dia" tickFormatter={formatDia} stroke="#475569" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#475569" tick={{ fontSize: 11 }} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="execucoes" name="Execuções" stroke="#6366f1" fill="url(#grad-exec)" strokeWidth={2} dot={false} />
                  <Area type="monotone" dataKey="erros"     name="Erros"     stroke="#ef4444" fill="url(#grad-erros)" strokeWidth={1.5} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </Card>

          {/* Gráfico: SLA médio por dia */}
          <Card>
            <p className="mb-1 text-sm font-semibold text-white/70">SLA médio de resposta (ms)</p>
            <p className="mb-4 text-[11px] text-white/35">Tempo médio entre receber a mensagem e gerar a resposta</p>
            {diasData.length === 0 ? (
              <div className="flex h-52 items-center justify-center text-sm text-white/30">
                Sem dados no período
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={diasData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="dia" tickFormatter={formatDia} stroke="#475569" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#475569" tick={{ fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(1)}s`} />
                  <Tooltip content={<ChartTooltip />} />
                  <Line type="monotone" dataKey="slaMedia" name="SLA Médio" stroke="#00C896" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </Card>

          {/* Grid: mensagens + status */}
          <div className="grid gap-4 md:grid-cols-2">

            {/* Breakdown de mensagens */}
            <Card>
              <p className="mb-4 text-sm font-semibold text-white/70">Mensagens por origem</p>
              {m && m.totalMensagens > 0 ? (
                <div className="space-y-3">
                  {msgBreakdown.map(item => (
                    <div key={item.label}>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="text-white/60">{item.label}</span>
                        <span className="font-semibold text-white">{item.total.toLocaleString("pt-BR")}</span>
                      </div>
                      <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${m.totalMensagens > 0 ? (item.total / m.totalMensagens) * 100 : 0}%`,
                            background: item.fill,
                          }}
                        />
                      </div>
                      <p className="mt-0.5 text-right text-[10px] text-white/30">
                        {m.totalMensagens > 0 ? ((item.total / m.totalMensagens) * 100).toFixed(1) : 0}%
                      </p>
                    </div>
                  ))}
                  <div className="mt-2 flex items-center justify-between border-t border-white/8 pt-2 text-xs">
                    <span className="text-white/40">Total de mensagens</span>
                    <span className="font-bold text-white">{m.totalMensagens.toLocaleString("pt-BR")}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/40">Média por atendimento</span>
                    <span className="font-semibold text-white">{m.mediaMsgsPorAtend}</span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-white/30">Sem mensagens no período</p>
              )}
            </Card>

            {/* Atendimentos por status */}
            <Card>
              <p className="mb-4 text-sm font-semibold text-white/70">Atendimentos por status</p>
              {statusData.length > 0 ? (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={statusData} layout="vertical" margin={{ left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                    <XAxis type="number" stroke="#475569" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="label" stroke="#475569" tick={{ fontSize: 11 }} width={90} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="total" name="Atendimentos" fill="#6366f1" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-white/30">Sem atendimentos no período</p>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* Tab: Qualidade */}
      {activeTab === "qualidade" && (
        <Card className="p-0 overflow-hidden">
          <div className="border-b border-white/8 px-5 py-4">
            <p className="text-sm font-semibold text-white/80">Pontuação de Qualidade por Agente</p>
            <p className="mt-0.5 text-[11px] text-white/35">
              Score 0–100 · 50% confiabilidade (sem erros) + 30% velocidade (SLA) + 20% engajamento (interações por contato)
            </p>
          </div>

          {qualidadeQ.isLoading ? (
            <p className="px-5 py-8 text-center text-sm text-white/30">Carregando...</p>
          ) : !qualidadeQ.data?.length ? (
            <p className="px-5 py-8 text-center text-sm text-white/30">Nenhum dado de qualidade disponível</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/8 text-left text-xs text-white/40">
                    <th className="px-5 py-3 font-medium">Agente</th>
                    <th className="px-4 py-3 font-medium">Atuação</th>
                    <th className="px-4 py-3 font-medium text-right">Execuções</th>
                    <th className="px-4 py-3 font-medium text-right">Contatos</th>
                    <th className="px-4 py-3 font-medium text-right">Média/Contato</th>
                    <th className="px-4 py-3 font-medium text-right">Erros</th>
                    <th className="px-4 py-3 font-medium text-right">SLA Médio</th>
                    <th className="px-4 py-3 font-medium text-right">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {qualidadeQ.data.map(a => {
                    const badge = qualBadge(a.qualidade);
                    return (
                      <tr key={a.agenteId} className="border-b border-white/5 transition-colors hover:bg-white/3">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                              <Bot className="h-3.5 w-3.5 text-primary" />
                            </div>
                            <span className="font-medium text-white/90">{a.nomeAgente}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-white/50 text-xs">{a.atuacao ?? "—"}</td>
                        <td className="px-4 py-3 text-right text-white/70">{a.totalExecucoes.toLocaleString("pt-BR")}</td>
                        <td className="px-4 py-3 text-right text-white/70">
                          <div className="flex items-center justify-end gap-1">
                            <Users className="h-3 w-3 text-white/30" />
                            {a.contatosUnicos}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right text-white/70">{a.mediaInteracoesPorContato}x</td>
                        <td className="px-4 py-3 text-right">
                          {a.execucoesErro > 0 ? (
                            <span className="text-red-400">{a.execucoesErro} ({a.taxaErrosPct}%)</span>
                          ) : (
                            <span className="flex items-center justify-end gap-1 text-emerald-400">
                              <ShieldCheck className="h-3 w-3" /> 0
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-white/70">{formatMs(a.slaMediaMs)}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex flex-col items-end gap-1">
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${badge.bg} ${badge.text}`}>
                              {a.qualidade} · {badge.label}
                            </span>
                            <div className="w-20 h-1.5 rounded-full bg-white/8 overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-700"
                                style={{ width: `${a.qualidade}%`, background: badge.bar }}
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
