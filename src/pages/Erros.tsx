import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  AlertTriangle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Copy,
  Info,
  RefreshCw,
  Shield,
  XCircle,
} from "lucide-react";
import { PageHeader } from "../components/shared/PageHeader";
import { errosService } from "../services/erros.service";
import toast from "react-hot-toast";

// ── helpers ───────────────────────────────────────────────────────────────────

function formatDatetime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

const SEVERIDADE_CONFIG: Record<string, {
  label: string;
  icon: React.ReactNode;
  bg: string;
  border: string;
  text: string;
  badge: string;
  dot: string;
}> = {
  CRITICAL: {
    label: "Crítico",
    icon: <XCircle className="h-4 w-4" />,
    bg: "bg-red-500/10",
    border: "border-red-500/30",
    text: "text-red-400",
    badge: "bg-red-500/20 text-red-300 border-red-500/30",
    dot: "bg-red-400",
  },
  ERROR: {
    label: "Erro",
    icon: <AlertCircle className="h-4 w-4" />,
    bg: "bg-orange-500/10",
    border: "border-orange-500/30",
    text: "text-orange-400",
    badge: "bg-orange-500/20 text-orange-300 border-orange-500/30",
    dot: "bg-orange-400",
  },
  WARNING: {
    label: "Aviso",
    icon: <AlertTriangle className="h-4 w-4" />,
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/30",
    text: "text-yellow-400",
    badge: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
    dot: "bg-yellow-400",
  },
  INFO: {
    label: "Info",
    icon: <Info className="h-4 w-4" />,
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
    text: "text-blue-400",
    badge: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    dot: "bg-blue-400",
  },
};

function SevBadge({ sev }: { sev: string }) {
  const cfg = SEVERIDADE_CONFIG[sev] ?? SEVERIDADE_CONFIG.INFO;
  return (
    <span className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${cfg.badge}`}>
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

// ── linha de erro com expand ──────────────────────────────────────────────────

function ErroRow({ erro }: { erro: any }) {
  const [expandido, setExpandido] = useState(false);
  const cfg = SEVERIDADE_CONFIG[erro.severidade] ?? SEVERIDADE_CONFIG.INFO;

  function copiarMensagem() {
    const texto = [
      `ID: ${erro.id}`,
      `Severidade: ${erro.severidade}`,
      `Categoria: ${erro.categoria}`,
      `Origem: ${erro.origem ?? "—"}`,
      `Data: ${formatDatetime(erro.criadoEm)}`,
      `Resolvido: ${erro.resolvido ? "Sim" : "Não"}`,
      erro.usuarioId ? `Usuário: ${erro.usuarioId}` : null,
      ``,
      `Mensagem:`,
      erro.mensagem,
    ].filter(Boolean).join("\n");
    void navigator.clipboard.writeText(texto);
    toast.success("Copiado para a área de transferência");
  }

  return (
    <div
      className={`transition-colors ${
        erro.severidade === "CRITICAL" ? "border-l-2 border-l-red-500" : ""
      }`}
    >
      {/* ── linha compacta ── */}
      <div className="flex flex-col gap-2 p-4 hover:bg-white/3 sm:flex-row sm:items-start sm:gap-4">
        {/* Indicador de severidade */}
        <div className={`mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg ${cfg.bg} ${cfg.text}`}>
          {cfg.icon}
        </div>

        {/* Conteúdo */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <SevBadge sev={erro.severidade} />
            <span className="rounded bg-white/10 px-2 py-0.5 text-[10px] font-medium text-white/60">
              {erro.categoria}
            </span>
            {erro.origem && (
              <span className="rounded bg-white/5 px-2 py-0.5 text-[10px] text-white/40">
                {erro.origem}
              </span>
            )}
            {erro.resolvido && (
              <span className="rounded bg-green-500/20 px-2 py-0.5 text-[10px] text-green-400">
                Resolvido
              </span>
            )}
          </div>
          <p className="text-sm text-white/80 break-words line-clamp-2">{erro.mensagem}</p>
          <p className="mt-1 text-xs text-white/35">{formatDatetime(erro.criadoEm)}</p>
        </div>

        {/* Botão expandir */}
        <button
          type="button"
          onClick={() => setExpandido((v) => !v)}
          className="flex shrink-0 items-center gap-1 self-start rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/50 transition hover:border-white/20 hover:bg-white/10 hover:text-white/80"
        >
          {expandido ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          {expandido ? "Recolher" : "Detalhes"}
        </button>
      </div>

      {/* ── painel expandido ── */}
      {expandido && (
        <div className="mx-4 mb-4 overflow-hidden rounded-xl border border-white/10 bg-black/30">
          {/* cabeçalho */}
          <div className="flex items-center justify-between border-b border-white/10 bg-white/5 px-4 py-2.5">
            <span className="text-xs font-semibold text-white/50">Informações completas do erro</span>
            <button
              type="button"
              onClick={copiarMensagem}
              className="flex items-center gap-1.5 rounded px-2 py-1 text-xs text-white/40 transition hover:bg-white/10 hover:text-white/70"
            >
              <Copy className="h-3.5 w-3.5" />
              Copiar
            </button>
          </div>

          {/* metadados */}
          <div className="grid grid-cols-2 gap-px border-b border-white/5 bg-white/5 sm:grid-cols-4">
            {[
              { label: "ID", value: erro.id },
              { label: "Severidade", value: erro.severidade },
              { label: "Categoria", value: erro.categoria },
              { label: "Origem", value: erro.origem ?? "—" },
              { label: "Data", value: formatDatetime(erro.criadoEm) },
              { label: "Resolvido", value: erro.resolvido ? "Sim" : "Não" },
              ...(erro.usuarioId ? [{ label: "Usuário ID", value: erro.usuarioId }] : []),
            ].map(({ label, value }) => (
              <div key={label} className="bg-black/20 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-white/30">{label}</p>
                <p className="mt-0.5 break-all text-xs text-white/70">{value}</p>
              </div>
            ))}
          </div>

          {/* mensagem completa */}
          <div className="p-4">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-white/30">Mensagem completa</p>
            <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-black/40 p-3 font-mono text-xs leading-relaxed text-white/75">
              {erro.mensagem}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

// ── página ────────────────────────────────────────────────────────────────────

export function Erros() {
  const [page, setPage] = useState(1);
  const [categoria, setCategoria] = useState("");
  const [severidade, setSeveridade] = useState("");
  const LIMIT = 20;

  const resumo = useQuery({
    queryKey: ["erros-resumo"],
    queryFn: errosService.resumo,
    refetchInterval: 30_000,
  });

  const lista = useQuery({
    queryKey: ["erros", page, categoria, severidade],
    queryFn: () => errosService.list({ page, limit: LIMIT, categoria, severidade }),
    refetchInterval: 30_000,
  });

  const erros = (lista.data as any)?.data ?? [];
  const total: number = (lista.data as any)?.meta?.total ?? 0;
  const totalPages = Math.ceil(total / LIMIT);

  const stats = [
    { label: "Críticos",           value: resumo.data?.criticos ?? 0,   sev: "CRITICAL" },
    { label: "Erros hoje",         value: resumo.data?.errosHoje ?? 0,  sev: "ERROR" },
    { label: "Categoria frequente", value: resumo.data?.maisFrequente ?? "—", sev: "WARNING" },
    {
      label: "Último erro",
      value: resumo.data?.ultimo?.mensagem
        ? String(resumo.data.ultimo.mensagem).slice(0, 40) + (String(resumo.data.ultimo.mensagem).length > 40 ? "…" : "")
        : "—",
      sev: "INFO",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          title="Monitor de Erros"
          subtitle="Todos os erros e falhas do sistema em tempo real"
        />
        <div className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/40">
          <RefreshCw className="h-3.5 w-3.5" />
          Atualiza a cada 30s
        </div>
      </div>

      {/* Cards de resumo */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => {
          const cfg = SEVERIDADE_CONFIG[s.sev];
          return (
            <div key={s.label} className={`rounded-xl border p-4 ${cfg.bg} ${cfg.border}`}>
              <div className={`mb-1 flex items-center gap-2 text-xs font-semibold ${cfg.text}`}>
                {cfg.icon}
                {s.label}
              </div>
              <p className="text-lg font-bold text-white leading-tight">{s.value}</p>
            </div>
          );
        })}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        <input
          className="h-9 flex-1 min-w-[160px] rounded-lg border border-white/15 bg-white/5 px-3 text-sm placeholder:text-white/30 focus:border-white/30 focus:outline-none"
          placeholder="Filtrar por categoria..."
          value={categoria}
          onChange={(e) => { setCategoria(e.target.value); setPage(1); }}
        />
        <select
          className="h-9 rounded-lg border border-white/15 bg-surface px-3 text-sm text-white/70 focus:border-white/30 focus:outline-none"
          value={severidade}
          onChange={(e) => { setSeveridade(e.target.value); setPage(1); }}
        >
          <option value="">Todas severidades</option>
          <option value="CRITICAL">Crítico</option>
          <option value="ERROR">Erro</option>
          <option value="WARNING">Aviso</option>
          <option value="INFO">Info</option>
        </select>
      </div>

      {/* Lista de erros */}
      <div className="overflow-hidden rounded-xl border border-white/10">
        {lista.isLoading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-white/30">
            <Shield className="h-5 w-5 animate-pulse" />
            Carregando...
          </div>
        ) : erros.length === 0 ? (
          <div className="py-16 text-center text-sm text-white/30">
            Nenhum erro encontrado para os filtros selecionados.
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {erros.map((erro: any) => (
              <ErroRow key={erro.id} erro={erro} />
            ))}
          </div>
        )}
      </div>

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-white/40">{total} registros encontrados</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex h-8 w-8 items-center justify-center rounded border border-white/10 text-white/50 hover:text-white disabled:opacity-30 transition"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-xs text-white/50">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="flex h-8 w-8 items-center justify-center rounded border border-white/10 text-white/50 hover:text-white disabled:opacity-30 transition"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
