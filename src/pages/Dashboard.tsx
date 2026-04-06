import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Bot, Clock, DollarSign, MessageCircle, MessageSquare, TrendingUp, Users, Zap } from "lucide-react";
import { PageHeader } from "../components/shared/PageHeader";
import { Card } from "../components/ui/card";
import { conversasService } from "../services/atendimentos.service";
import { usuariosService } from "../services/usuarios.service";
import { agentesService } from "../services/agentes.service";
import { custosService } from "../services/custos.service";
import { api } from "../services/api";
import type { ProfissaoResumo } from "../types/atendimento";

function formatMs(ms: number): string {
  if (!ms || ms <= 0) return "—";
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60_000)}m ${Math.round((ms % 60_000) / 1000)}s`;
}

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

// ── tooltip customizado ───────────────────────────────────────────────────────

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { value: number; payload: ProfissaoResumo }[];
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border border-white/20 bg-[#1a2332] px-3 py-2 text-xs shadow-xl">
      <p className="font-semibold text-white">{PROFISSAO_LABEL[d.profissao] ?? d.profissao}</p>
      <p className="mt-1 text-white/70">
        Conversas: <span className="font-medium text-primary">{d.totalSessoes}</span>
      </p>
      <p className="text-white/70">
        Mensagens: <span className="font-medium text-white">{d.totalMensagens}</span>
      </p>
    </div>
  );
}

// ── página ────────────────────────────────────────────────────────────────────

export function Dashboard() {
  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ["conversas-stats"],
    queryFn: () => conversasService.stats(),
    staleTime: 60_000,
  });

  const { data: usuarios } = useQuery({
    queryKey: ["dash-usuarios"],
    queryFn: () => usuariosService.list({ page: 1, limit: 1 }),
  });

  const { data: agentes } = useQuery({
    queryKey: ["dash-agentes"],
    queryFn: () => agentesService.list({ page: 1, limit: 1 }),
  });

  const { data: custos } = useQuery({
    queryKey: ["dash-custos"],
    queryFn: () => custosService.resumo(),
    staleTime: 60_000,
  });

  const { data: usoMetricas } = useQuery({
    queryKey: ["dash-uso-metricas"],
    queryFn: () => api.get<{ success: boolean; data: { totalExecucoes: number; totalAtendimentos: number; slaMediaMs: number; taxaErrosPct: number } }>("/uso/metricas").then(r => r.data.data),
    staleTime: 60_000,
  });

  const chartData = [...(stats?.porProfissao ?? [])].sort(
    (a, b) => b.totalSessoes - a.totalSessoes,
  );

  const maisAtivaLabel = stats?.maisAtiva
    ? (PROFISSAO_LABEL[stats.maisAtiva.profissao] ?? stats.maisAtiva.profissao)
    : "—";

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" subtitle="Visão geral da operação Beta Admin IA" />

      {/* ── atendimentos ── */}
      <section>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/40">
          Atendimentos
        </p>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={MessageCircle}
            label="Total de conversas"
            value={stats?.totalConversas?.toLocaleString("pt-BR") ?? 0}
            sub="Sessões únicas em todas as profissões"
            loading={loadingStats}
            cor="bg-primary/20 text-primary"
          />
          <StatCard
            icon={MessageSquare}
            label="Total de mensagens"
            value={stats?.totalMensagens?.toLocaleString("pt-BR") ?? 0}
            sub="Interações registradas no Supabase"
            loading={loadingStats}
            cor="bg-purple-500/20 text-purple-400"
          />
          <StatCard
            icon={TrendingUp}
            label="Média msgs / conversa"
            value={stats?.mediaMsgPorConversa ?? 0}
            sub="Profundidade média das sessões"
            loading={loadingStats}
            cor="bg-amber-500/20 text-amber-400"
          />
          <StatCard
            icon={MessageCircle}
            label="Profissão mais ativa"
            value={maisAtivaLabel}
            sub={
              stats?.maisAtiva ? `${stats.maisAtiva.totalSessoes} conversas` : undefined
            }
            loading={loadingStats}
            cor="bg-blue-500/20 text-blue-400"
          />
        </div>
      </section>

      {/* ── IA em operação (Unnichat) ── */}
      <section>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/40">
          IA em Operação · Unnichat
        </p>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={MessageCircle}
            label="Atendimentos Unnichat"
            value={usoMetricas?.totalAtendimentos?.toLocaleString("pt-BR") ?? 0}
            sub="Conversas via webhook Unnichat"
            cor="bg-primary/20 text-primary"
          />
          <StatCard
            icon={Zap}
            label="Execuções IA"
            value={usoMetricas?.totalExecucoes?.toLocaleString("pt-BR") ?? 0}
            sub={`Mês: ${(custos as { mes?: { execucoes: number } } | undefined)?.mes?.execucoes ?? 0} execuções`}
            cor="bg-indigo-500/20 text-indigo-400"
          />
          <StatCard
            icon={Clock}
            label="SLA Médio de Resposta"
            value={formatMs(usoMetricas?.slaMediaMs ?? 0)}
            sub="Tempo médio para gerar resposta"
            cor="bg-cyan-500/20 text-cyan-400"
          />
          <StatCard
            icon={DollarSign}
            label="Custo mês (USD)"
            value={`$${((custos as { mes?: { custoUsd: number } } | undefined)?.mes?.custoUsd ?? 0).toFixed(4)}`}
            sub={`Taxa de erros: ${usoMetricas?.taxaErrosPct ?? 0}%`}
            cor="bg-rose-500/20 text-rose-400"
          />
        </div>
      </section>

      {/* ── gráfico ── */}
      <Card className="overflow-hidden p-0">
        <div className="border-b border-white/10 px-5 py-4">
          <p className="font-semibold">Conversas por profissão</p>
          <p className="mt-0.5 text-xs text-white/40">
            Total de sessões únicas por área de atuação
          </p>
        </div>
        <div className="p-4">
          {loadingStats ? (
            <div className="flex h-64 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={chartData}
                margin={{ top: 4, right: 12, left: -10, bottom: 0 }}
                barSize={28}
              >
                <XAxis
                  dataKey="profissao"
                  tickFormatter={(v: string) =>
                    PROFISSAO_LABEL[v]?.split(" ")[0] ?? v
                  }
                  tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  content={<CustomTooltip />}
                  cursor={{ fill: "rgba(255,255,255,0.04)" }}
                />
                <Bar dataKey="totalSessoes" radius={[6, 6, 0, 0]}>
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={CORES[i % CORES.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      {/* ── sistema ── */}
      <section>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/40">
          Sistema
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard
            icon={Users}
            label="Usuários cadastrados"
            value={usuarios?.meta?.total ?? 0}
            cor="bg-green-500/20 text-green-400"
          />
          <StatCard
            icon={Bot}
            label="Agentes configurados"
            value={agentes?.meta?.total ?? 0}
            cor="bg-cyan-500/20 text-cyan-400"
          />
          <StatCard
            icon={TrendingUp}
            label="Custo total acumulado"
            value={`$${((custos as { total?: { custoUsd: number } } | undefined)?.total?.custoUsd ?? 0).toFixed(4)}`}
            sub="Soma de todos os períodos"
            cor="bg-rose-500/20 text-rose-400"
          />
        </div>
      </section>
    </div>
  );
}
