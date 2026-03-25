import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Bot, DollarSign, MessageCircle, X, Zap } from "lucide-react";
import { PageHeader } from "../components/shared/PageHeader";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { custosService } from "../services/custos.service";
import type { CustoProfissao } from "../types/custos";

// ── helpers ───────────────────────────────────────────────────────────────────

const PROFISSAO_LABEL: Record<string, string> = {
  administrador: "Administrador",
  advogado: "Advogado",
  arquiteto: "Arquiteto",
  assistente_social: "Assist. Social",
  contador: "Contador",
  corretor: "Corretor",
  dentista: "Dentista",
  engenheiro_civil: "Eng. Civil",
  farmaceutico: "Farmacêutico",
  fisioterapeuta: "Fisioterapeuta",
  pedagogo: "Pedagogo",
  professor: "Professor",
  psicologo: "Psicólogo",
  veterinario: "Veterinário",
};

const CORES = [
  "#00C896", "#6366f1", "#f59e0b", "#ec4899",
  "#14b8a6", "#f97316", "#06b6d4", "#a855f7",
  "#84cc16", "#ef4444", "#3b82f6", "#10b981",
  "#eab308", "#8b5cf6",
];

/** Formata valor USD com 2 casas decimais: $2.68 */
function usd(valor: number) {
  return `$${valor.toFixed(2)}`;
}

function formatTokens(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

// ── stat card ─────────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  loading,
  cor,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  loading?: boolean;
  cor: string;
}) {
  return (
    <Card className="flex items-start gap-4">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${cor}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-white/60">{label}</p>
        {loading ? (
          <div className="mt-1 h-7 w-24 animate-pulse rounded bg-white/10" />
        ) : (
          <p className="mt-0.5 text-2xl font-heading">{value}</p>
        )}
        {sub && <p className="mt-0.5 text-xs text-white/40">{sub}</p>}
      </div>
    </Card>
  );
}

// ── tooltips ──────────────────────────────────────────────────────────────────

function TooltipProfissao({ active, payload }: { active?: boolean; payload?: { payload: CustoProfissao }[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border border-white/20 bg-[#1a2332] px-3 py-2 text-xs shadow-xl">
      <p className="font-semibold text-white">{PROFISSAO_LABEL[d.profissao] ?? d.profissao}</p>
      <p className="mt-1 text-white/70">Custo: <span className="font-medium text-primary">{usd(d.custoUsd)}</span></p>
      <p className="text-white/70">Input: <span className="text-white">{formatTokens(d.inputTokens)} tokens</span></p>
      <p className="text-white/70">Output: <span className="text-white">{formatTokens(d.outputTokens)} tokens</span></p>
      <p className="text-white/70">Conversas: <span className="text-white">{d.totalConversas}</span></p>
    </div>
  );
}

function TooltipDia({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-white/20 bg-[#1a2332] px-3 py-2 text-xs shadow-xl">
      <p className="font-semibold text-white">{label}</p>
      <p className="mt-1 font-medium text-primary">{usd(payload[0].value)}</p>
    </div>
  );
}

// ── página ────────────────────────────────────────────────────────────────────

export function Custos() {
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

  // Parâmetros ativos — só envia quando ambos preenchidos (ou nenhum)
  const params =
    dataInicio && dataFim ? { dataInicio, dataFim } : undefined;

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["custos-atendimentos", dataInicio, dataFim],
    queryFn: () => custosService.custosAtendimentos(params),
    staleTime: 120_000,
  });

  const { data: cotacaoBrl } = useQuery<number | undefined>({
    queryKey: ["exchange-rate-usd-brl"],
    queryFn: async () => {
      const res = await axios.get("https://open.er-api.com/v6/latest/USD");
      return res.data?.rates?.BRL as number | undefined;
    },
    staleTime: 3_600_000, // 1h — cotação não muda a cada minuto
    retry: false,
  });

  const top7    = (data?.porProfissao ?? []).slice(0, 7);
  const trend30 = (data?.porDia ?? []).slice(-30);

  const carregando = isLoading || isFetching;

  function limparFiltro() {
    setDataInicio("");
    setDataFim("");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Custos"
        subtitle={
          data
            ? `${data.modelo} · Input $${data.precoInputPorMilhao}/1M · Output $${data.precoOutputPorMilhao}/1M`
            : "Calculando custos com base nas conversas do Supabase..."
        }
      />

      {/* ── filtro de data ── */}
      <Card className="flex flex-wrap items-end gap-4 py-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-white/50">Data início</label>
          <Input
            type="date"
            value={dataInicio}
            onChange={(e) => setDataInicio(e.target.value)}
            className="w-44"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-white/50">Data fim</label>
          <Input
            type="date"
            value={dataFim}
            onChange={(e) => setDataFim(e.target.value)}
            className="w-44"
          />
        </div>
        {(dataInicio || dataFim) && (
          <Button variant="outline" size="sm" onClick={limparFiltro} className="mb-0.5">
            <X className="mr-1.5 h-3.5 w-3.5" />
            Limpar filtro
          </Button>
        )}
        {dataInicio && dataFim && (
          <span className="mb-0.5 rounded-full bg-primary/20 px-3 py-1 text-xs text-primary">
            {new Date(dataInicio + "T12:00:00").toLocaleDateString("pt-BR")} →{" "}
            {new Date(dataFim + "T12:00:00").toLocaleDateString("pt-BR")}
          </span>
        )}
        {dataInicio && !dataFim && (
          <span className="mb-0.5 text-xs text-amber-400">Selecione também a data fim</span>
        )}
      </Card>

      {/* ── cards ── */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={DollarSign}
          label="Custo total (USD)"
          value={carregando ? "..." : usd(data?.totalCustoUsd ?? 0)}
          sub={
            !carregando && cotacaoBrl && data
              ? `≈ R$ ${(data.totalCustoUsd * cotacaoBrl).toFixed(2).replace(".", ",")} · 1 USD = R$ ${cotacaoBrl.toFixed(2).replace(".", ",")}`
              : "Todas as profissões"
          }
          loading={carregando}
          cor="bg-primary/20 text-primary"
        />
        <StatCard
          icon={DollarSign}
          label="Custo médio / conversa"
          value={carregando ? "..." : usd(data?.mediaCustoPorConversa ?? 0)}
          sub={`${(data?.totalConversas ?? 0).toLocaleString("pt-BR")} conversas totais`}
          loading={carregando}
          cor="bg-amber-500/20 text-amber-400"
        />
        <StatCard
          icon={Zap}
          label="Tokens de entrada"
          value={carregando ? "..." : formatTokens(data?.totalInputTokens ?? 0)}
          sub={usd((data?.totalInputTokens ?? 0) * 0.40 / 1_000_000)}
          loading={carregando}
          cor="bg-blue-500/20 text-blue-400"
        />
        <StatCard
          icon={Bot}
          label="Tokens de saída"
          value={carregando ? "..." : formatTokens(data?.totalOutputTokens ?? 0)}
          sub={usd((data?.totalOutputTokens ?? 0) * 1.60 / 1_000_000)}
          loading={carregando}
          cor="bg-purple-500/20 text-purple-400"
        />
      </div>

      {/* ── gráficos ── */}
      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="overflow-hidden p-0">
          <div className="border-b border-white/10 px-5 py-4">
            <p className="font-semibold">Custo por profissão (top 7)</p>
            <p className="mt-0.5 text-xs text-white/40">Ordenado pelo maior gasto</p>
          </div>
          <div className="p-4">
            {carregando ? (
              <div className="flex h-56 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={top7} margin={{ top: 4, right: 8, left: -10, bottom: 0 }} barSize={24}>
                  <XAxis
                    dataKey="profissao"
                    tickFormatter={(v: string) => PROFISSAO_LABEL[v]?.split(" ")[0] ?? v}
                    tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={(v: number) => usd(v)}
                    tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    width={58}
                  />
                  <Tooltip content={<TooltipProfissao />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                  <Bar dataKey="custoUsd" radius={[6, 6, 0, 0]}>
                    {top7.map((_, i) => <Cell key={i} fill={CORES[i % CORES.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card className="overflow-hidden p-0">
          <div className="border-b border-white/10 px-5 py-4">
            <p className="font-semibold">Custo diário</p>
            <p className="mt-0.5 text-xs text-white/40">
              {params ? "Período filtrado" : "Últimos 30 dias"}
            </p>
          </div>
          <div className="p-4">
            {carregando ? (
              <div className="flex h-56 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={trend30} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="dia"
                    tickFormatter={(v: string) => v.slice(5)}
                    tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tickFormatter={(v: number) => usd(v)}
                    tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    width={58}
                  />
                  <Tooltip content={<TooltipDia />} />
                  <Line
                    type="monotone"
                    dataKey="custoUsd"
                    stroke="#00C896"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      {/* ── tabela ── */}
      <Card className="overflow-hidden p-0">
        <div className="border-b border-white/10 px-5 py-4">
          <p className="font-semibold">Detalhamento por profissão</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-white/10 text-xs text-white/50">
              <tr>
                <th className="px-4 py-3 text-left">Profissão</th>
                <th className="px-4 py-3 text-right">Conversas</th>
                <th className="px-4 py-3 text-right">Mensagens</th>
                <th className="px-4 py-3 text-right">Tokens entrada</th>
                <th className="px-4 py-3 text-right">Tokens saída</th>
                <th className="px-4 py-3 text-right">Custo USD</th>
              </tr>
            </thead>
            <tbody>
              {carregando && (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-white/40">Calculando...</td>
                </tr>
              )}
              {!carregando && (data?.porProfissao ?? []).map((p: CustoProfissao, i) => (
                <tr key={p.profissao} className="border-b border-white/5 hover:bg-white/5">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full" style={{ background: CORES[i % CORES.length] }} />
                      {PROFISSAO_LABEL[p.profissao] ?? p.profissao}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-white/70">{p.totalConversas.toLocaleString("pt-BR")}</td>
                  <td className="px-4 py-3 text-right text-white/70">{p.totalMensagens.toLocaleString("pt-BR")}</td>
                  <td className="px-4 py-3 text-right text-blue-400">{formatTokens(p.inputTokens)}</td>
                  <td className="px-4 py-3 text-right text-purple-400">{formatTokens(p.outputTokens)}</td>
                  <td className="px-4 py-3 text-right font-medium text-primary">{usd(p.custoUsd)}</td>
                </tr>
              ))}
              {!carregando && data && (
                <tr className="border-t border-white/20 bg-white/5 font-semibold">
                  <td className="px-4 py-3">Total</td>
                  <td className="px-4 py-3 text-right">{data.totalConversas.toLocaleString("pt-BR")}</td>
                  <td className="px-4 py-3 text-right">{data.totalMensagens.toLocaleString("pt-BR")}</td>
                  <td className="px-4 py-3 text-right text-blue-400">{formatTokens(data.totalInputTokens)}</td>
                  <td className="px-4 py-3 text-right text-purple-400">{formatTokens(data.totalOutputTokens)}</td>
                  <td className="px-4 py-3 text-right text-primary">{usd(data.totalCustoUsd)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {data && (
          <div className="border-t border-white/10 px-5 py-3 text-xs text-white/40">
            <MessageCircle className="mr-1 inline h-3 w-3" />
            Tokens contados via <span className="text-white/60">tiktoken o200k_base</span> (tokenizador oficial OpenAI) ·
            <span className="text-blue-400"> Input $0,40/1M</span> ·
            <span className="text-purple-400"> Output $1,60/1M</span> ·
            Modelo: <span className="text-white/60">{data.modelo}</span>
          </div>
        )}
      </Card>
    </div>
  );
}
