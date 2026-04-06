import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import {
  addMonths, eachDayOfInterval, endOfMonth, endOfWeek,
  format, isBefore, isSameDay, isWithinInterval,
  startOfMonth, startOfWeek, subDays, subMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Bar, BarChart, CartesianGrid, Cell,
  Line, LineChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts";
import {
  Bot, Calendar, ChevronDown, ChevronLeft, ChevronRight,
  DollarSign, Layers, MessageCircle, X, Zap,
} from "lucide-react";
import { PageHeader } from "../components/shared/PageHeader";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { api } from "../services/api";

// ── tipos ─────────────────────────────────────────────────────────────────────

interface Resumo {
  hoje:  { execucoes: number; custoUsd: number; inputTokens: number; outputTokens: number };
  mes:   { execucoes: number; custoUsd: number; inputTokens: number; outputTokens: number };
  total: { execucoes: number; custoUsd: number; inputTokens: number; outputTokens: number };
}
interface PorProvedor {
  provider: string; execucoes: number;
  custoUsd: number; inputTokens: number; outputTokens: number;
}
interface PorModelo {
  modelo: string; provider: string; execucoes: number;
  custoUsd: number; inputTokens: number; outputTokens: number;
}
interface PorAgente {
  agenteId: string; nomeAgente: string; produto: string | null;
  atuacao: string | null; modelo: string; execucoes: number;
  custoUsd: number; inputTokens: number; outputTokens: number;
}
interface PorCanal {
  canal: string; execucoes: number;
  custoUsd: number; inputTokens: number; outputTokens: number;
}
interface DiaTendencia {
  dia: string; custoUsd: number; inputTokens: number; outputTokens: number; execucoes: number;
}
interface ExecucaoLog {
  id: string; contactId: string; nomeAgente: string;
  modelo: string; provider: string; canal: string;
  classificacao: string; inputTokens: number; outputTokens: number;
  custoUsd: number; duracao: number; erro?: string; criadoEm: string;
}
interface DateRange { from: Date | null; to: Date | null }
interface AgenteInfo {
  id: string; nome: string; produto: string | null;
  atuacao: string | null; modelo: string; ativo: boolean;
}

// ── helpers ───────────────────────────────────────────────────────────────────

const CORES = ["#6366f1","#f59e0b","#10b981","#ec4899","#3b82f6","#f97316","#a855f7","#14b8a6"];
const PROVIDER_LABEL: Record<string, string> = {
  openai: "OpenAI", anthropic: "Anthropic", google: "Google Gemini",
};
const CANAL_LABEL: Record<string, string> = {
  unnichat: "Unnichat (WhatsApp)", manychat: "ManyChat", chat_teste: "Chat Teste",
};

function usd(v: number)  { return `$${v.toFixed(4)}`; }
function usdK(v: number) { return v < 0.01 ? `$${v.toFixed(4)}` : `$${v.toFixed(2)}`; }
function tk(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}
function pct(v: number, total: number) {
  return total > 0 ? `${((v / total) * 100).toFixed(1)}%` : "—";
}

// ── API ───────────────────────────────────────────────────────────────────────

type ApiResp<T> = { success: boolean; data: T };
type ApiPage<T> = { success: boolean; data: T; total: number; page: number; limit: number };

function buildParams(range: DateRange, agenteId = "", modelo = "") {
  const p: Record<string, string> = {};
  if (range.from) p.dataInicio = format(range.from, "yyyy-MM-dd");
  if (range.to)   p.dataFim    = format(range.to,   "yyyy-MM-dd");
  if (agenteId)   p.agenteId   = agenteId;
  if (modelo)     p.modelo     = modelo;
  return p;
}

const svc = {
  resumo:      (p: Record<string, string>) => api.get<ApiResp<Resumo>>("/custos/resumo", { params: p }).then(r => r.data.data),
  porProvedor: (p: Record<string, string>) => api.get<ApiResp<PorProvedor[]>>("/custos/por-provedor", { params: p }).then(r => r.data.data),
  porModelo:   (p: Record<string, string>) => api.get<ApiResp<PorModelo[]>>("/custos/por-modelo", { params: p }).then(r => r.data.data),
  porAgente:   (p: Record<string, string>) => api.get<ApiResp<PorAgente[]>>("/custos/por-agente", { params: p }).then(r => r.data.data),
  porCanal:    (p: Record<string, string>) => api.get<ApiResp<PorCanal[]>>("/custos/por-canal", { params: p }).then(r => r.data.data),
  tendencia:   (p: Record<string, string>) => api.get<ApiResp<DiaTendencia[]>>("/custos/tendencia", { params: p }).then(r => r.data.data),
};

// ── DateRangePicker ───────────────────────────────────────────────────────────

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
    if (value.from && fim) {
      return isWithinInterval(dia, { start: value.from, end: fim });
    }
    return false;
  }

  const label = value.from
    ? value.to
      ? `${format(value.from, "dd/MM/yy")} → ${format(value.to, "dd/MM/yy")}`
      : `${format(value.from, "dd/MM/yy")} → ...`
    : "Selecionar período";

  const atalhos = [
    { label: "Hoje",      from: new Date(),              to: new Date() },
    { label: "7 dias",    from: subDays(new Date(), 6),  to: new Date() },
    { label: "30 dias",   from: subDays(new Date(), 29), to: new Date() },
    { label: "Este mês",  from: startOfMonth(new Date()), to: new Date() },
    { label: "Mês ant.",  from: startOfMonth(subMonths(new Date(), 1)), to: endOfMonth(subMonths(new Date(), 1)) },
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
          {/* Atalhos rápidos */}
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

          {/* Navegação do mês */}
          <div className="flex items-center justify-between px-4 pt-3 pb-2">
            <button
              onClick={() => setMonth(m => subMonths(m, 1))}
              className="rounded-lg p-1.5 text-white/40 hover:bg-white/10 hover:text-white transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-semibold capitalize text-white">
              {format(month, "MMMM yyyy", { locale: ptBR })}
            </span>
            <button
              onClick={() => setMonth(m => addMonths(m, 1))}
              className="rounded-lg p-1.5 text-white/40 hover:bg-white/10 hover:text-white transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Cabeçalho dos dias */}
          <div className="grid grid-cols-7 px-2">
            {DIAS_SEMANA.map(d => (
              <div key={d} className="py-1 text-center text-[10px] font-medium text-white/25">{d}</div>
            ))}
          </div>

          {/* Grade de dias */}
          <div className="grid grid-cols-7 gap-y-0.5 px-2 pb-4">
            {dias.map((dia, idx) => {
              const isFrom     = value.from ? isSameDay(dia, value.from) : false;
              const isTo       = value.to   ? isSameDay(dia, value.to)   : false;
              const inRange    = emRange(dia);
              const mesAtual   = dia.getMonth() === month.getMonth();
              const isEdge     = isFrom || isTo;

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
                    inRange && !isFrom && !isTo && !isEdge ? "" : "",
                  ].join(" ")}
                >
                  {format(dia, "d")}
                </button>
              );
            })}
          </div>

          {/* Dica */}
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

// ── FilterSelect ──────────────────────────────────────────────────────────────

function FilterSelect({
  label, value, onChange, options, placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
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
          <span
            className="rounded-full p-0.5 hover:bg-white/15 transition-colors"
            onClick={e => { e.stopPropagation(); onChange(""); }}
          >
            <X className="h-3 w-3" />
          </span>
        ) : (
          <ChevronDown className="h-3 w-3 text-white/30 shrink-0" />
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-56 rounded-xl border border-white/10 bg-[#0f172a] shadow-2xl shadow-black/60 overflow-hidden">
          <div className="px-3 py-2 border-b border-white/8">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-white/30">{label}</p>
          </div>
          <div className="max-h-52 overflow-y-auto py-1">
            {options.length === 0 && (
              <p className="px-3 py-2 text-xs text-white/30">Sem dados disponíveis</p>
            )}
            {options.map(o => (
              <button
                key={o.value}
                onClick={() => { onChange(o.value === value ? "" : o.value); setOpen(false); }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-white/5 ${
                  o.value === value ? "text-primary" : "text-white/70"
                }`}
              >
                {o.value === value && <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />}
                <span className={`truncate ${o.value !== value ? "pl-3.5" : ""}`}>{o.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Componentes visuais ───────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, sub, loading, cor }: {
  icon: React.ElementType; label: string; value: string;
  sub?: string; loading?: boolean; cor: string;
}) {
  return (
    <Card className="flex items-start gap-4">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${cor}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-white/60">{label}</p>
        {loading
          ? <div className="mt-1 h-7 w-28 animate-pulse rounded bg-white/10" />
          : <p className="mt-0.5 text-2xl font-heading">{value}</p>}
        {sub && <p className="mt-0.5 text-xs text-white/40">{sub}</p>}
      </div>
    </Card>
  );
}

function Skeleton({ h = "h-40" }: { h?: string }) {
  return <div className={`${h} animate-pulse rounded-xl bg-white/5`} />;
}

function TooltipDia({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-white/20 bg-[#1a2332] px-3 py-2 text-xs shadow-xl space-y-1">
      <p className="font-semibold text-white">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-white/70">
          {p.name === "custoUsd" ? "Custo" : p.name}:{" "}
          <span className="text-primary font-medium">{p.name === "custoUsd" ? usdK(p.value) : tk(p.value)}</span>
        </p>
      ))}
    </div>
  );
}

function BarraProgresso({ pct: p, cor }: { pct: number; cor: string }) {
  return (
    <div className="h-1.5 w-full rounded-full bg-white/10">
      <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, p)}%`, background: cor }} />
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

type Aba = "visao-geral" | "por-agente" | "por-modelo" | "log";

export function Custos() {
  const [aba,           setAba]           = useState<Aba>("visao-geral");
  const [dateRange,     setDateRange]     = useState<DateRange>({ from: null, to: null });
  const [filterAgente,  setFilterAgente]  = useState("");
  const [filterModelo,  setFilterModelo]  = useState("");
  const [filterAtuacao, setFilterAtuacao] = useState("");

  const params = buildParams(dateRange, filterAgente, filterModelo);
  const qk     = [
    dateRange.from?.toISOString() ?? "",
    dateRange.to?.toISOString()   ?? "",
    filterAgente, filterModelo,
  ];

  // Busca todos os agentes do sistema (independente de execuções)
  const { data: agentesAll } = useQuery<AgenteInfo[]>({
    queryKey: ["agentes-lista"],
    queryFn: () => api.get<ApiResp<AgenteInfo[]>>("/agentes").then(r => r.data.data),
    staleTime: 300_000,
  });

  const resumo    = useQuery({ queryKey: ["custos-resumo",    ...qk], queryFn: () => svc.resumo(params),      staleTime: 60_000 });
  const provedor  = useQuery({ queryKey: ["custos-provedor",  ...qk], queryFn: () => svc.porProvedor(params),  staleTime: 60_000 });
  const modeloQ   = useQuery({ queryKey: ["custos-modelo",    ...qk], queryFn: () => svc.porModelo(params),    staleTime: 60_000 });
  const agenteQ   = useQuery({ queryKey: ["custos-agente",    ...qk], queryFn: () => svc.porAgente(params),    staleTime: 60_000 });
  const canal     = useQuery({ queryKey: ["custos-canal",     ...qk], queryFn: () => svc.porCanal(params),     staleTime: 60_000 });
  const tendencia = useQuery({ queryKey: ["custos-tendencia", ...qk], queryFn: () => svc.tendencia(params),    staleTime: 60_000 });

  const { data: brl } = useQuery<number | undefined>({
    queryKey: ["exchange-brl"],
    queryFn: async () => {
      const r = await axios.get("https://open.er-api.com/v6/latest/USD");
      return r.data?.rates?.BRL as number | undefined;
    },
    staleTime: 3_600_000,
    retry: false,
  });

  // Opções para filtros — derivadas dos AGENTES REAIS cadastrados no sistema
  const agentesOpcoes = (agentesAll ?? []).map(a => ({ value: a.id, label: a.nome }));
  const modelosOpcoes = [...new Set((agentesAll ?? []).map(a => a.modelo).filter(Boolean))]
    .map(m => ({ value: m, label: m }));
  const atuacoesOpcoes = [...new Set((agentesAll ?? []).map(a => a.atuacao).filter(Boolean))]
    .map(v => ({ value: v as string, label: v as string }));

  // Merge: todos os agentes cadastrados + seus custos (zero se sem execuções)
  const custosPorAgenteMap = new Map((agenteQ.data ?? []).map(a => [a.agenteId, a]));
  const agenteData = (agentesAll ?? [])
    .filter(a => !filterAtuacao  || a.atuacao === filterAtuacao)
    .filter(a => !filterAgente   || a.id === filterAgente)
    .map(a => {
      const c = custosPorAgenteMap.get(a.id);
      return {
        agenteId:     a.id,
        nomeAgente:   a.nome,
        produto:      a.produto,
        atuacao:      a.atuacao,
        modelo:       a.modelo,
        execucoes:    c?.execucoes    ?? 0,
        custoUsd:     c?.custoUsd     ?? 0,
        inputTokens:  c?.inputTokens  ?? 0,
        outputTokens: c?.outputTokens ?? 0,
      };
    })
    .sort((a, b) => b.custoUsd - a.custoUsd);

  const modeloData = modeloQ.data ?? [];

  const r     = resumo.data;
  const load  = resumo.isLoading;
  const total = r?.total.custoUsd ?? 0;

  const temFiltro = !!(dateRange.from || filterAgente || filterModelo || filterAtuacao);

  const abas: { id: Aba; label: string }[] = [
    { id: "visao-geral", label: "Visão Geral" },
    { id: "por-agente",  label: "Por Agente"  },
    { id: "por-modelo",  label: "Por Modelo"  },
    { id: "log",         label: "Log"         },
  ];

  function limparFiltros() {
    setDateRange({ from: null, to: null });
    setFilterAgente("");
    setFilterModelo("");
    setFilterAtuacao("");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Custos de IA"
        subtitle="Gastos reais por agente, modelo, provedor e canal — baseado em tokens consumidos"
      />

      {/* ── Barra de filtros ── */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <DateRangePicker value={dateRange} onChange={setDateRange} />

          <div className="h-5 w-px bg-white/10" />

          <FilterSelect
            label="Agente"
            placeholder="Todos os agentes"
            value={filterAgente}
            onChange={setFilterAgente}
            options={agentesOpcoes}
          />
          <FilterSelect
            label="Modelo"
            placeholder="Todos os modelos"
            value={filterModelo}
            onChange={setFilterModelo}
            options={modelosOpcoes}
          />
          <FilterSelect
            label="Atuação"
            placeholder="Todas as atuações"
            value={filterAtuacao}
            onChange={setFilterAtuacao}
            options={atuacoesOpcoes}
          />

          {temFiltro && (
            <>
              <div className="h-5 w-px bg-white/10" />
              <button
                onClick={limparFiltros}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-white/40 hover:bg-white/5 hover:text-white/70 transition-colors"
              >
                <X className="h-3 w-3" />
                Limpar filtros
              </button>
            </>
          )}
        </div>

        {/* Badge de filtros ativos */}
        {temFiltro && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {dateRange.from && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-0.5 text-[10px] font-medium text-primary">
                <Calendar className="h-2.5 w-2.5" />
                {dateRange.to
                  ? `${format(dateRange.from, "dd/MM/yy")} → ${format(dateRange.to, "dd/MM/yy")}`
                  : format(dateRange.from, "dd/MM/yy")}
              </span>
            )}
            {filterAgente && agentesOpcoes.find(a => a.value === filterAgente) && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[10px] font-medium text-amber-400">
                Agente: {agentesOpcoes.find(a => a.value === filterAgente)?.label}
              </span>
            )}
            {filterModelo && (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/15 px-2.5 py-0.5 text-[10px] font-medium text-blue-400">
                Modelo: {filterModelo}
              </span>
            )}
            {filterAtuacao && (
              <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/15 px-2.5 py-0.5 text-[10px] font-medium text-purple-400">
                Atuação: {filterAtuacao}
              </span>
            )}
          </div>
        )}
      </Card>

      {/* ── Cards de resumo ── */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={DollarSign} label="Custo total" loading={load}
          value={usd(total)}
          sub={brl ? `≈ R$ ${(total * brl).toFixed(2).replace(".", ",")}` : "Todas as execuções"}
          cor="bg-primary/20 text-primary" />
        <StatCard icon={Layers} label="Execuções totais" loading={load}
          value={(r?.total.execucoes ?? 0).toLocaleString("pt-BR")}
          sub={`Hoje: ${(r?.hoje.execucoes ?? 0).toLocaleString("pt-BR")} · Mês: ${(r?.mes.execucoes ?? 0).toLocaleString("pt-BR")}`}
          cor="bg-amber-500/20 text-amber-400" />
        <StatCard icon={Zap} label="Tokens de entrada" loading={load}
          value={tk(r?.total.inputTokens ?? 0)}
          sub={usd((r?.total.inputTokens ?? 0) * 0.40 / 1_000_000) + " estimado"}
          cor="bg-blue-500/20 text-blue-400" />
        <StatCard icon={Bot} label="Tokens de saída" loading={load}
          value={tk(r?.total.outputTokens ?? 0)}
          sub={usd((r?.total.outputTokens ?? 0) * 1.60 / 1_000_000) + " estimado"}
          cor="bg-purple-500/20 text-purple-400" />
      </div>

      {/* ── Abas ── */}
      <div className="flex gap-1 border-b border-white/10">
        {abas.map(a => (
          <button key={a.id} onClick={() => setAba(a.id)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              aba === a.id ? "border-b-2 border-primary text-primary" : "text-white/50 hover:text-white/80"
            }`}>
            {a.label}
          </button>
        ))}
      </div>

      {/* ── Visão Geral ── */}
      {aba === "visao-geral" && (
        <div className="space-y-6">
          <Card className="overflow-hidden p-0">
            <div className="border-b border-white/10 px-5 py-4">
              <p className="font-semibold">Custo diário</p>
              <p className="mt-0.5 text-xs text-white/40">
                {dateRange.from && dateRange.to ? "Período filtrado" : "Últimos 30 dias"}
              </p>
            </div>
            <div className="p-4">
              {tendencia.isLoading ? <Skeleton h="h-52" /> : (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={tendencia.data ?? []} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                    <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
                    <XAxis dataKey="dia" tickFormatter={v => String(v).slice(5)}
                      tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                    <YAxis tickFormatter={v => usdK(Number(v))}
                      tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }} axisLine={false} tickLine={false} width={60} />
                    <Tooltip content={<TooltipDia />} />
                    <Line type="monotone" dataKey="custoUsd" stroke="#6366f1" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>

          <div className="grid gap-4 xl:grid-cols-2">
            <Card className="overflow-hidden p-0">
              <div className="border-b border-white/10 px-5 py-4">
                <p className="font-semibold">Por provedor de IA</p>
              </div>
              <div className="divide-y divide-white/5">
                {provedor.isLoading && <div className="p-4"><Skeleton h="h-24" /></div>}
                {(provedor.data ?? []).map((p, i) => (
                  <div key={p.provider} className="px-5 py-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className="h-2.5 w-2.5 rounded-full" style={{ background: CORES[i] }} />
                        <span className="text-sm font-medium">{PROVIDER_LABEL[p.provider] ?? p.provider}</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs">
                        <span className="text-white/50">{p.execucoes.toLocaleString("pt-BR")} exec.</span>
                        <span className="text-blue-400">{tk(p.inputTokens + p.outputTokens)} tokens</span>
                        <span className="font-semibold text-primary">{usd(p.custoUsd)}</span>
                      </div>
                    </div>
                    <BarraProgresso pct={total > 0 ? (p.custoUsd / total) * 100 : 0} cor={CORES[i]} />
                    <p className="mt-1 text-right text-xs text-white/30">{pct(p.custoUsd, total)} do total</p>
                  </div>
                ))}
                {!provedor.isLoading && !provedor.data?.length && (
                  <p className="p-5 text-sm text-white/40">Nenhuma execução registrada ainda.</p>
                )}
              </div>
            </Card>

            <Card className="overflow-hidden p-0">
              <div className="border-b border-white/10 px-5 py-4">
                <p className="font-semibold">Por canal</p>
              </div>
              <div className="divide-y divide-white/5">
                {canal.isLoading && <div className="p-4"><Skeleton h="h-24" /></div>}
                {(canal.data ?? []).map((c, i) => (
                  <div key={c.canal} className="px-5 py-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className="h-2.5 w-2.5 rounded-full" style={{ background: CORES[i + 3] }} />
                        <span className="text-sm font-medium">{CANAL_LABEL[c.canal] ?? c.canal}</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs">
                        <span className="text-white/50">{c.execucoes.toLocaleString("pt-BR")} exec.</span>
                        <span className="font-semibold text-primary">{usd(c.custoUsd)}</span>
                      </div>
                    </div>
                    <BarraProgresso pct={total > 0 ? (c.custoUsd / total) * 100 : 0} cor={CORES[i + 3]} />
                    <p className="mt-1 text-right text-xs text-white/30">{pct(c.custoUsd, total)} do total</p>
                  </div>
                ))}
                {!canal.isLoading && !canal.data?.length && (
                  <p className="p-5 text-sm text-white/40">Nenhuma execução registrada ainda.</p>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ── Por Agente ── */}
      {aba === "por-agente" && (
        <Card className="overflow-hidden p-0">
          <div className="border-b border-white/10 px-5 py-4">
            <p className="font-semibold">Custo por agente</p>
            <p className="mt-0.5 text-xs text-white/40">
              {agenteData.length} agente{agenteData.length !== 1 ? "s" : ""} cadastrado{agenteData.length !== 1 ? "s" : ""} ·{" "}
              {agenteData.filter(a => a.execucoes > 0).length} com interações registradas
            </p>
          </div>

          {(agenteQ.isLoading || !agentesAll) ? (
            <div className="p-5 space-y-3"><Skeleton /><Skeleton /></div>
          ) : !agenteData.length ? (
            <p className="p-5 text-sm text-white/40">Nenhum agente encontrado para os filtros selecionados.</p>
          ) : (
            <>
              <div className="p-4">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={agenteData.slice(0, 8)} margin={{ top: 4, right: 8, left: -10, bottom: 0 }} barSize={28}>
                    <XAxis dataKey="nomeAgente" tickFormatter={v => String(v).split(" ")[0]}
                      tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={v => usdK(Number(v))}
                      tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }} axisLine={false} tickLine={false} width={60} />
                    <Tooltip content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload as PorAgente;
                      return (
                        <div className="rounded-lg border border-white/20 bg-[#1a2332] px-3 py-2 text-xs shadow-xl space-y-1">
                          <p className="font-semibold text-white">{d.nomeAgente}</p>
                          <p className="text-white/60">Modelo: <span className="text-white">{d.modelo}</span></p>
                          <p className="text-white/60">Execuções: <span className="text-white">{d.execucoes.toLocaleString("pt-BR")}</span></p>
                          <p className="text-white/60">Tokens: <span className="text-blue-400">{tk(d.inputTokens)} in</span> / <span className="text-purple-400">{tk(d.outputTokens)} out</span></p>
                          <p className="text-white/60">Custo: <span className="font-semibold text-primary">{usd(d.custoUsd)}</span></p>
                        </div>
                      );
                    }} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                    <Bar dataKey="custoUsd" radius={[6, 6, 0, 0]}>
                      {agenteData.slice(0, 8).map((_, i) => <Cell key={i} fill={CORES[i % CORES.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="overflow-x-auto border-t border-white/10">
                <table className="w-full text-sm">
                  <thead className="text-xs text-white/50 border-b border-white/10">
                    <tr>
                      <th className="px-4 py-3 text-left">Agente</th>
                      <th className="px-4 py-3 text-left">Atuação</th>
                      <th className="px-4 py-3 text-left">Modelo</th>
                      <th className="px-4 py-3 text-right">Execuções</th>
                      <th className="px-4 py-3 text-right">Tokens entrada</th>
                      <th className="px-4 py-3 text-right">Tokens saída</th>
                      <th className="px-4 py-3 text-right">Custo USD</th>
                      <th className="px-4 py-3 text-right">% do total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agenteData.map((a, i) => (
                      <tr key={a.agenteId} className={`border-b border-white/5 hover:bg-white/5 ${a.execucoes === 0 ? "opacity-50" : ""}`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full" style={{ background: a.execucoes > 0 ? CORES[i % CORES.length] : "rgba(255,255,255,0.15)" }} />
                            <span className="font-medium">{a.nomeAgente}</span>
                            {a.execucoes === 0 && (
                              <span className="rounded-full bg-white/8 px-1.5 py-0.5 text-[9px] text-white/30">sem interações</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-white/50 text-xs">{a.atuacao ?? a.produto ?? "—"}</td>
                        <td className="px-4 py-3 text-white/60 font-mono text-xs">{a.modelo}</td>
                        <td className="px-4 py-3 text-right text-white/70">{a.execucoes.toLocaleString("pt-BR")}</td>
                        <td className="px-4 py-3 text-right text-blue-400">{a.inputTokens > 0 ? tk(a.inputTokens) : "—"}</td>
                        <td className="px-4 py-3 text-right text-purple-400">{a.outputTokens > 0 ? tk(a.outputTokens) : "—"}</td>
                        <td className="px-4 py-3 text-right font-semibold text-primary">{a.custoUsd > 0 ? usd(a.custoUsd) : "$0.0000"}</td>
                        <td className="px-4 py-3 text-right text-white/40">{pct(a.custoUsd, total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </Card>
      )}

      {/* ── Por Modelo ── */}
      {aba === "por-modelo" && (
        <Card className="overflow-hidden p-0">
          <div className="border-b border-white/10 px-5 py-4">
            <p className="font-semibold">Custo por modelo de IA</p>
            <p className="mt-0.5 text-xs text-white/40">Cada modelo utilizado e seus tokens/custos reais</p>
          </div>

          {modeloQ.isLoading ? (
            <div className="p-5"><Skeleton /></div>
          ) : !modeloData.length ? (
            <p className="p-5 text-sm text-white/40">Nenhuma execução encontrada para os filtros selecionados.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-white/50 border-b border-white/10">
                  <tr>
                    <th className="px-4 py-3 text-left">Modelo</th>
                    <th className="px-4 py-3 text-left">Provedor</th>
                    <th className="px-4 py-3 text-right">Execuções</th>
                    <th className="px-4 py-3 text-right">Tokens entrada</th>
                    <th className="px-4 py-3 text-right">Tokens saída</th>
                    <th className="px-4 py-3 text-right">Total tokens</th>
                    <th className="px-4 py-3 text-right">Custo USD</th>
                    <th className="px-4 py-3 text-right">% do total</th>
                  </tr>
                </thead>
                <tbody>
                  {modeloData.map((m, i) => (
                    <tr key={m.modelo} className="border-b border-white/5 hover:bg-white/5">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full" style={{ background: CORES[i % CORES.length] }} />
                          <span className="font-mono text-xs">{m.modelo}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs">
                          {PROVIDER_LABEL[m.provider] ?? m.provider}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-white/70">{m.execucoes.toLocaleString("pt-BR")}</td>
                      <td className="px-4 py-3 text-right text-blue-400">{tk(m.inputTokens)}</td>
                      <td className="px-4 py-3 text-right text-purple-400">{tk(m.outputTokens)}</td>
                      <td className="px-4 py-3 text-right text-white/60">{tk(m.inputTokens + m.outputTokens)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-primary">{usd(m.custoUsd)}</td>
                      <td className="px-4 py-3 text-right text-white/40">{pct(m.custoUsd, total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* ── Log ── */}
      {aba === "log" && <LogExecucoes params={params} />}

      {/* Rodapé */}
      <div className="flex items-center gap-2 text-xs text-white/30">
        <MessageCircle className="h-3 w-3" />
        Custos calculados a partir de tokens reais retornados pela API de cada provedor ·
        Preços consultados na tabela <span className="text-white/50">ModeloIA</span> com fallback para tabela interna
      </div>
    </div>
  );
}

// ── Log de execuções ──────────────────────────────────────────────────────────

interface ExecucaoLog {
  id: string; contactId: string; nomeAgente: string;
  modelo: string; provider: string; canal: string;
  classificacao: string; inputTokens: number; outputTokens: number;
  custoUsd: number; duracao: number; erro?: string; criadoEm: string;
}

function LogExecucoes({ params }: { params: Record<string, string> }) {
  const [page, setPage] = useState(1);

  const q = useQuery({
    queryKey: ["custos-log", params, page],
    queryFn: () =>
      api.get<ApiPage<ExecucaoLog[]>>("/custos/log", { params: { ...params, page, limit: 20 } }).then(r => r.data),
    staleTime: 30_000,
  });

  const rows  = q.data?.data  ?? [];
  const total = q.data?.total ?? 0;
  const pages = Math.ceil(total / 20);

  return (
    <Card className="overflow-hidden p-0">
      <div className="border-b border-white/10 px-5 py-4">
        <p className="font-semibold">Log de execuções</p>
        <p className="mt-0.5 text-xs text-white/40">{total.toLocaleString("pt-BR")} execuções registradas</p>
      </div>

      {q.isLoading ? (
        <div className="p-5 space-y-2"><Skeleton h="h-8" /><Skeleton h="h-8" /><Skeleton h="h-8" /></div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-white/50 border-b border-white/10">
              <tr>
                <th className="px-4 py-3 text-left">Data/Hora</th>
                <th className="px-4 py-3 text-left">Agente</th>
                <th className="px-4 py-3 text-left">Modelo</th>
                <th className="px-4 py-3 text-left">Canal</th>
                <th className="px-4 py-3 text-left">Classificação</th>
                <th className="px-4 py-3 text-right">Tokens in</th>
                <th className="px-4 py-3 text-right">Tokens out</th>
                <th className="px-4 py-3 text-right">Custo</th>
                <th className="px-4 py-3 text-right">Duração</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} className={`border-b border-white/5 hover:bg-white/5 ${r.erro ? "opacity-60" : ""}`}>
                  <td className="px-4 py-2.5 text-white/50">{new Date(r.criadoEm).toLocaleString("pt-BR")}</td>
                  <td className="px-4 py-2.5 font-medium">{r.nomeAgente}</td>
                  <td className="px-4 py-2.5 font-mono text-white/60">{r.modelo}</td>
                  <td className="px-4 py-2.5">
                    <span className="rounded-full bg-white/10 px-2 py-0.5">{CANAL_LABEL[r.canal] ?? r.canal}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`rounded-full px-2 py-0.5 ${r.classificacao === "LEAD_REAL" ? "bg-primary/20 text-primary" : "bg-white/10 text-white/50"}`}>
                      {r.classificacao === "LEAD_REAL" ? "Lead real" : "Automático"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right text-blue-400">{r.inputTokens.toLocaleString("pt-BR")}</td>
                  <td className="px-4 py-2.5 text-right text-purple-400">{r.outputTokens.toLocaleString("pt-BR")}</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-primary">{usd(r.custoUsd)}</td>
                  <td className="px-4 py-2.5 text-right text-white/40">{(r.duracao / 1000).toFixed(1)}s</td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-white/40">Nenhuma execução registrada ainda.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <div className="border-t border-white/10 px-5 py-3 flex items-center justify-between text-xs text-white/50">
          <span>Página {page} de {pages}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Anterior</Button>
            <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>Próxima</Button>
          </div>
        </div>
      )}
    </Card>
  );
}
