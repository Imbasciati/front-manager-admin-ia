import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import {
  Bar, BarChart, CartesianGrid, Cell,
  Line, LineChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts";
import { Bot, DollarSign, Layers, MessageCircle, Zap } from "lucide-react";
import { PageHeader } from "../components/shared/PageHeader";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
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

// ── serviço ───────────────────────────────────────────────────────────────────

function buildParams(di: string, df: string) {
  const p: Record<string, string> = {};
  if (di) p.dataInicio = di;
  if (df) p.dataFim    = df;
  return p;
}

const svc = {
  resumo:       (p: Record<string, string>) => api.get<Resumo>("/custos/resumo", { params: p }).then(r => r.data.data),
  porProvedor:  (p: Record<string, string>) => api.get<PorProvedor[]>("/custos/por-provedor", { params: p }).then(r => r.data.data),
  porModelo:    (p: Record<string, string>) => api.get<PorModelo[]>("/custos/por-modelo", { params: p }).then(r => r.data.data),
  porAgente:    (p: Record<string, string>) => api.get<PorAgente[]>("/custos/por-agente", { params: p }).then(r => r.data.data),
  porCanal:     (p: Record<string, string>) => api.get<PorCanal[]>("/custos/por-canal", { params: p }).then(r => r.data.data),
  tendencia:    (p: Record<string, string>) => api.get<DiaTendencia[]>("/custos/tendencia", { params: p }).then(r => r.data.data),
};

// ── componentes ───────────────────────────────────────────────────────────────

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

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p className="mt-2 text-sm font-semibold text-white/70 uppercase tracking-wider">{children}</p>;
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
      <div className="h-full rounded-full" style={{ width: `${Math.min(100, p)}%`, background: cor }} />
    </div>
  );
}

// ── página principal ──────────────────────────────────────────────────────────

type Aba = "visao-geral" | "por-agente" | "por-modelo" | "log";

export function Custos() {
  const [aba, setAba] = useState<Aba>("visao-geral");
  const [di, setDi]   = useState("");
  const [df, setDf]   = useState("");

  const params = buildParams(di, df);
  const qk     = [di, df];

  const resumo     = useQuery({ queryKey: ["custos-resumo",    ...qk], queryFn: () => svc.resumo(params),      staleTime: 60_000 });
  const provedor   = useQuery({ queryKey: ["custos-provedor",  ...qk], queryFn: () => svc.porProvedor(params),  staleTime: 60_000 });
  const modelo     = useQuery({ queryKey: ["custos-modelo",    ...qk], queryFn: () => svc.porModelo(params),    staleTime: 60_000 });
  const agente     = useQuery({ queryKey: ["custos-agente",    ...qk], queryFn: () => svc.porAgente(params),    staleTime: 60_000 });
  const canal      = useQuery({ queryKey: ["custos-canal",     ...qk], queryFn: () => svc.porCanal(params),     staleTime: 60_000 });
  const tendencia  = useQuery({ queryKey: ["custos-tendencia", ...qk], queryFn: () => svc.tendencia(params),    staleTime: 60_000 });

  const { data: brl } = useQuery<number | undefined>({
    queryKey: ["exchange-brl"],
    queryFn: async () => {
      const r = await axios.get("https://open.er-api.com/v6/latest/USD");
      return r.data?.rates?.BRL as number | undefined;
    },
    staleTime: 3_600_000,
    retry: false,
  });

  const r      = resumo.data;
  const load   = resumo.isLoading;
  const total  = r?.total.custoUsd ?? 0;
  const totalTk = (r?.total.inputTokens ?? 0) + (r?.total.outputTokens ?? 0);

  const abas: { id: Aba; label: string }[] = [
    { id: "visao-geral", label: "Visão Geral" },
    { id: "por-agente",  label: "Por Agente"  },
    { id: "por-modelo",  label: "Por Modelo"  },
    { id: "log",         label: "Log"         },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Custos de IA" subtitle="Gastos reais por agente, modelo, provedor e canal — baseado em tokens consumidos" />

      {/* ── filtro ── */}
      <Card className="flex flex-wrap items-end gap-4 py-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-white/50">Data início</label>
          <Input type="date" value={di} onChange={e => setDi(e.target.value)} className="w-44" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-white/50">Data fim</label>
          <Input type="date" value={df} onChange={e => setDf(e.target.value)} className="w-44" />
        </div>
        {(di || df) && (
          <Button variant="outline" size="sm" onClick={() => { setDi(""); setDf(""); }}>
            Limpar filtro
          </Button>
        )}
        {di && !df && <span className="text-xs text-amber-400">Selecione também a data fim</span>}
      </Card>

      {/* ── cards resumo ── */}
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

      {/* ── abas ── */}
      <div className="flex gap-1 border-b border-white/10">
        {abas.map(a => (
          <button key={a.id} onClick={() => setAba(a.id)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${aba === a.id ? "border-b-2 border-primary text-primary" : "text-white/50 hover:text-white/80"}`}>
            {a.label}
          </button>
        ))}
      </div>

      {/* ──────────────────────────────────────────────────────────────────────── */}
      {aba === "visao-geral" && (
        <div className="space-y-6">

          {/* Tendência diária */}
          <Card className="overflow-hidden p-0">
            <div className="border-b border-white/10 px-5 py-4">
              <p className="font-semibold">Custo diário</p>
              <p className="mt-0.5 text-xs text-white/40">{di && df ? "Período filtrado" : "Últimos 30 dias"}</p>
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

          {/* Por provedor + Por canal */}
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

      {/* ──────────────────────────────────────────────────────────────────────── */}
      {aba === "por-agente" && (
        <Card className="overflow-hidden p-0">
          <div className="border-b border-white/10 px-5 py-4">
            <p className="font-semibold">Custo por agente</p>
            <p className="mt-0.5 text-xs text-white/40">Cada agente configurado e seus gastos reais com IA</p>
          </div>

          {agente.isLoading ? (
            <div className="p-5 space-y-3"><Skeleton /><Skeleton /></div>
          ) : !agente.data?.length ? (
            <p className="p-5 text-sm text-white/40">Nenhuma execução registrada ainda.</p>
          ) : (
            <>
              {/* Gráfico de barras */}
              <div className="p-4">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={agente.data.slice(0, 8)} margin={{ top: 4, right: 8, left: -10, bottom: 0 }} barSize={28}>
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
                      {agente.data.slice(0, 8).map((_, i) => <Cell key={i} fill={CORES[i % CORES.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Tabela */}
              <div className="overflow-x-auto border-t border-white/10">
                <table className="w-full text-sm">
                  <thead className="text-xs text-white/50 border-b border-white/10">
                    <tr>
                      <th className="px-4 py-3 text-left">Agente</th>
                      <th className="px-4 py-3 text-left">Tipo</th>
                      <th className="px-4 py-3 text-left">Modelo</th>
                      <th className="px-4 py-3 text-right">Execuções</th>
                      <th className="px-4 py-3 text-right">Tokens entrada</th>
                      <th className="px-4 py-3 text-right">Tokens saída</th>
                      <th className="px-4 py-3 text-right">Custo USD</th>
                      <th className="px-4 py-3 text-right">% do total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agente.data.map((a, i) => (
                      <tr key={a.agenteId} className="border-b border-white/5 hover:bg-white/5">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full" style={{ background: CORES[i % CORES.length] }} />
                            <span className="font-medium">{a.nomeAgente}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-white/50 text-xs">{a.atuacao ?? a.produto ?? "—"}</td>
                        <td className="px-4 py-3 text-white/60 font-mono text-xs">{a.modelo}</td>
                        <td className="px-4 py-3 text-right text-white/70">{a.execucoes.toLocaleString("pt-BR")}</td>
                        <td className="px-4 py-3 text-right text-blue-400">{tk(a.inputTokens)}</td>
                        <td className="px-4 py-3 text-right text-purple-400">{tk(a.outputTokens)}</td>
                        <td className="px-4 py-3 text-right font-semibold text-primary">{usd(a.custoUsd)}</td>
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

      {/* ──────────────────────────────────────────────────────────────────────── */}
      {aba === "por-modelo" && (
        <Card className="overflow-hidden p-0">
          <div className="border-b border-white/10 px-5 py-4">
            <p className="font-semibold">Custo por modelo de IA</p>
            <p className="mt-0.5 text-xs text-white/40">Cada modelo utilizado e seus tokens/custos reais</p>
          </div>

          {modelo.isLoading ? (
            <div className="p-5"><Skeleton /></div>
          ) : !modelo.data?.length ? (
            <p className="p-5 text-sm text-white/40">Nenhuma execução registrada ainda.</p>
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
                  {(modelo.data ?? []).map((m, i) => (
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

      {/* ──────────────────────────────────────────────────────────────────────── */}
      {aba === "log" && <LogExecucoes params={params} totalTokens={totalTk} />}

      {/* rodapé */}
      <div className="flex items-center gap-2 text-xs text-white/30">
        <MessageCircle className="h-3 w-3" />
        Custos calculados a partir de tokens reais retornados pela API de cada provedor ·
        Preços consultados na tabela <span className="text-white/50">ModeloIA</span> com fallback para tabela interna
      </div>
    </div>
  );
}

// ── Log de execuções (aba separada) ──────────────────────────────────────────

interface ExecucaoLog {
  id: string; contactId: string; nomeAgente: string;
  modelo: string; provider: string; canal: string;
  classificacao: string; inputTokens: number; outputTokens: number;
  custoUsd: number; duracao: number; erro?: string;
  criadoEm: string;
}

interface LogRes {
  data: { data: ExecucaoLog[]; total: number; page: number; limit: number };
}

function LogExecucoes({ params, totalTokens }: { params: Record<string, string>; totalTokens: number }) {
  const [page, setPage] = useState(1);

  const q = useQuery({
    queryKey: ["custos-log", params, page],
    queryFn: () =>
      api.get<LogRes["data"]>("/custos/log", { params: { ...params, page, limit: 20 } }).then(r => r.data.data),
    staleTime: 30_000,
  });

  const rows  = q.data?.data  ?? [];
  const total = q.data?.total ?? 0;
  const pages = Math.ceil(total / 20);

  return (
    <Card className="overflow-hidden p-0">
      <div className="border-b border-white/10 px-5 py-4 flex items-center justify-between">
        <div>
          <p className="font-semibold">Log de execuções</p>
          <p className="mt-0.5 text-xs text-white/40">{total.toLocaleString("pt-BR")} execuções registradas</p>
        </div>
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
                <tr><td colSpan={9} className="py-10 text-center text-white/40">Nenhuma execução registrada ainda.</td></tr>
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
