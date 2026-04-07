import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Bot,
  Briefcase,
  Building2,
  CalendarDays,
  ChevronRight,
  Filter,
  GraduationCap,
  HeartPulse,
  Home,
  MessageCircle,
  Microscope,
  Phone,
  Scale,
  Search,
  Stethoscope,
  User,
  Users,
  X,
  Zap,
} from "lucide-react";
import { PageHeader } from "../components/shared/PageHeader";
import { conversasService, atendimentosService, type FiltrosAtendimento } from "../services/atendimentos.service";
import { agentesService } from "../services/agentes.service";
import { getAccessToken } from "../services/token-store";
import type { MensagemConversa, ProfissaoResumo, Sessao } from "../types/atendimento";

// ── mapeamentos ───────────────────────────────────────────────────────────────

const PROFISSAO_LABEL: Record<string, string> = {
  administrador: "Administrador",
  advogado: "Advogado",
  arquiteto: "Arquiteto",
  assistente_social: "Assistente Social",
  contador: "Contador",
  corretor: "Corretor",
  dentista: "Dentista",
  engenheiro_civil: "Engenheiro Civil",
  farmaceutico: "Farmacêutico",
  fisioterapeuta: "Fisioterapeuta",
  pedagogo: "Pedagogo",
  professor: "Professor",
  psicologo: "Psicólogo",
  veterinario: "Veterinário",
};

const PROFISSAO_ICON: Record<string, React.ElementType> = {
  administrador: Briefcase,
  advogado: Scale,
  arquiteto: Building2,
  assistente_social: Users,
  contador: Briefcase,
  corretor: Home,
  dentista: Stethoscope,
  engenheiro_civil: Building2,
  farmaceutico: Microscope,
  fisioterapeuta: HeartPulse,
  pedagogo: GraduationCap,
  professor: GraduationCap,
  psicologo: HeartPulse,
  veterinario: Stethoscope,
};

const PROFISSAO_COR: Record<string, string> = {
  administrador: "from-blue-500/20 to-blue-600/10 border-blue-500/30",
  advogado: "from-purple-500/20 to-purple-600/10 border-purple-500/30",
  arquiteto: "from-amber-500/20 to-amber-600/10 border-amber-500/30",
  assistente_social: "from-pink-500/20 to-pink-600/10 border-pink-500/30",
  contador: "from-green-500/20 to-green-600/10 border-green-500/30",
  corretor: "from-orange-500/20 to-orange-600/10 border-orange-500/30",
  dentista: "from-cyan-500/20 to-cyan-600/10 border-cyan-500/30",
  engenheiro_civil: "from-yellow-500/20 to-yellow-600/10 border-yellow-500/30",
  farmaceutico: "from-teal-500/20 to-teal-600/10 border-teal-500/30",
  fisioterapeuta: "from-red-500/20 to-red-600/10 border-red-500/30",
  pedagogo: "from-indigo-500/20 to-indigo-600/10 border-indigo-500/30",
  professor: "from-violet-500/20 to-violet-600/10 border-violet-500/30",
  psicologo: "from-rose-500/20 to-rose-600/10 border-rose-500/30",
  veterinario: "from-emerald-500/20 to-emerald-600/10 border-emerald-500/30",
};

const PROFISSAO_ICON_COR: Record<string, string> = {
  administrador: "text-blue-400",
  advogado: "text-purple-400",
  arquiteto: "text-amber-400",
  assistente_social: "text-pink-400",
  contador: "text-green-400",
  corretor: "text-orange-400",
  dentista: "text-cyan-400",
  engenheiro_civil: "text-yellow-400",
  farmaceutico: "text-teal-400",
  fisioterapeuta: "text-red-400",
  pedagogo: "text-indigo-400",
  professor: "text-violet-400",
  psicologo: "text-rose-400",
  veterinario: "text-emerald-400",
};

// ── helpers ───────────────────────────────────────────────────────────────────

function abreviarSessionId(id: string): string {
  if (id.length <= 20) return id;
  return `${id.slice(0, 8)}…${id.slice(-8)}`;
}

function formatarDataCurta(iso: string): string {
  const d = new Date(iso);
  const hoje = new Date();
  const ontem = new Date(hoje);
  ontem.setDate(hoje.getDate() - 1);

  const mesmoDia = (a: Date, b: Date) =>
    a.getDate() === b.getDate() &&
    a.getMonth() === b.getMonth() &&
    a.getFullYear() === b.getFullYear();

  if (mesmoDia(d, hoje)) {
    return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  }
  if (mesmoDia(d, ontem)) return "Ontem";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function formatarHora(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function formatarTelefone(t: string): string {
  const d = t.replace(/\D/g, "");
  // +55 (XX) XXXXX-XXXX
  if (d.startsWith("55") && d.length >= 12) {
    const sem55 = d.slice(2);
    const ddd = sem55.slice(0, 2);
    const num = sem55.slice(2);
    const p1 = num.slice(0, num.length - 4);
    const p2 = num.slice(-4);
    return `+55 (${ddd}) ${p1}-${p2}`;
  }
  return t;
}

function iniciaisNome(nome: string | null | undefined): string {
  if (!nome) return "?";
  const parts = nome.trim().split(" ");
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? "?";
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Converte sequências literais \n (backslash-n) em quebras reais de linha */
function normalizeContent(text: string): string {
  return text.replace(/\\n/g, "\n");
}

/** Texto limpo para preview de uma linha (sem quebras) */
function previewText(text: string): string {
  return normalizeContent(text).replace(/\n+/g, " ").trim();
}

// ═══════════════════════════════════════════════════════════
// ABA SUPABASE (inalterada)
// ═══════════════════════════════════════════════════════════

function GradeProfissoes({
  profissoes,
  isLoading,
  onSelect,
}: {
  profissoes: ProfissaoResumo[] | undefined;
  isLoading: boolean;
  onSelect: (p: string) => void;
}) {
  return (
    <div className="space-y-4">
      {isLoading && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 14 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl border border-white/10 bg-white/5" />
          ))}
        </div>
      )}

      {!isLoading && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {(profissoes ?? []).map((p) => {
            const Icon = PROFISSAO_ICON[p.profissao] ?? Briefcase;
            const cor = PROFISSAO_COR[p.profissao] ?? "from-white/10 to-white/5 border-white/20";
            const iconCor = PROFISSAO_ICON_COR[p.profissao] ?? "text-white/70";

            return (
              <button
                key={p.profissao}
                onClick={() => onSelect(p.profissao)}
                className={`flex flex-col items-start gap-3 rounded-xl border bg-gradient-to-br p-4 text-left transition hover:scale-[1.02] hover:brightness-110 ${cor}`}
              >
                <div className={`rounded-lg bg-black/20 p-2 ${iconCor}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold leading-tight">
                    {PROFISSAO_LABEL[p.profissao] ?? p.profissao}
                  </p>
                  <p className="mt-0.5 text-xs text-white/50">
                    {p.totalSessoes} {p.totalSessoes === 1 ? "sessão" : "sessões"}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ListaSessoes({
  sessao: sessionSelecionada,
  sessoes,
  isLoading,
  onSelect,
}: {
  sessao: string | null;
  sessoes: Sessao[] | undefined;
  isLoading: boolean;
  onSelect: (s: string) => void;
}) {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/40">
        Sessões {isLoading ? "…" : `(${sessoes?.length ?? 0})`}
      </p>

      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-lg bg-white/5" />
            ))}
          </div>
        )}

        {!isLoading && sessoes?.length === 0 && (
          <p className="py-8 text-center text-sm text-white/40">Nenhuma sessão encontrada.</p>
        )}

        <div className="space-y-1">
          {(sessoes ?? []).map((s) => {
            const ativo = s.sessionId === sessionSelecionada;
            return (
              <button
                key={s.sessionId}
                onClick={() => onSelect(s.sessionId)}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left transition ${
                  ativo ? "bg-primary/20 text-white" : "hover:bg-white/5 text-white/80"
                }`}
              >
                <MessageCircle className={`h-4 w-4 shrink-0 ${ativo ? "text-primary" : "text-white/30"}`} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-xs">{abreviarSessionId(s.sessionId)}</p>
                  <div className="flex items-center gap-1.5">
                    {s.ultimaAtividade && (
                      <p className="text-[10px] text-white/30">{formatarDataCurta(s.ultimaAtividade)}</p>
                    )}
                    {s.primeiraMensagem && (
                      <p className="truncate text-[11px] text-white/40">{s.primeiraMensagem}</p>
                    )}
                  </div>
                </div>
                <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-white/50 shrink-0">
                  {s.totalMensagens}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function agruparPorDia(mensagens: MensagemConversa[]) {
  const grupos: { dia: string; msgs: MensagemConversa[] }[] = [];
  let diaAtual = "";

  for (const msg of mensagens) {
    const dia = msg.criadoEm
      ? new Date(msg.criadoEm).toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        })
      : "Sem data";

    if (dia !== diaAtual) {
      diaAtual = dia;
      grupos.push({ dia, msgs: [msg] });
    } else {
      grupos[grupos.length - 1].msgs.push(msg);
    }
  }

  return grupos;
}

function ChatConversa({ profissao, sessionId }: { profissao: string; sessionId: string }) {
  const { data: mensagens, isLoading } = useQuery({
    queryKey: ["mensagens", profissao, sessionId],
    queryFn: () => conversasService.getMensagens(profissao, sessionId),
    enabled: Boolean(profissao && sessionId),
  });

  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [mensagens]);

  const grupos = agruparPorDia(mensagens ?? []);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10">
            <User className="h-4 w-4 text-white/60" />
          </div>
          <div>
            <p className="text-sm font-medium">{PROFISSAO_LABEL[profissao] ?? profissao}</p>
            <p className="font-mono text-[11px] text-white/40">{abreviarSessionId(sessionId)}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto px-4 py-4">
        {isLoading && (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className={`flex ${i % 2 === 0 ? "justify-start" : "justify-end"}`}>
                <div className={`h-10 animate-pulse rounded-2xl bg-white/5 ${i % 2 === 0 ? "w-2/3" : "w-1/2"}`} />
              </div>
            ))}
          </div>
        )}

        {!isLoading && mensagens?.length === 0 && (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-white/40">Nenhuma mensagem nesta sessão.</p>
          </div>
        )}

        {grupos.map((grupo) => (
          <div key={grupo.dia}>
            <div className="my-4 flex items-center gap-3">
              <div className="h-px flex-1 bg-white/10" />
              <span className="rounded-full bg-white/10 px-3 py-0.5 text-[11px] text-white/40">{grupo.dia}</span>
              <div className="h-px flex-1 bg-white/10" />
            </div>

            <div className="space-y-2">
              {grupo.msgs.map((msg: MensagemConversa) => {
                const isHuman = msg.tipo === "human";
                const hora = msg.criadoEm
                  ? new Date(msg.criadoEm).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
                  : null;

                return (
                  <div key={msg.id} className={`flex items-end gap-2 ${isHuman ? "justify-end" : "justify-start"}`}>
                    {!isHuman && (
                      <div className="mb-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary/20">
                        <Bot className="h-3.5 w-3.5 text-secondary/80" />
                      </div>
                    )}
                    <div
                      className={`max-w-[72%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm ${
                        isHuman
                          ? "rounded-br-sm bg-primary/25 text-white"
                          : "rounded-bl-sm bg-white/8 text-white/90"
                      }`}
                    >
                      <span className="whitespace-pre-line">{normalizeContent(msg.conteudo)}</span>
                      <div className={`mt-1 flex items-center gap-1.5 justify-end text-[10px] ${isHuman ? "text-white/50" : "text-white/30"}`}>
                        <span>{isHuman ? "Humano" : "IA"}</span>
                        {hora && <span>· {hora}</span>}
                      </div>
                    </div>
                    {isHuman && (
                      <div className="mb-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/20">
                        <User className="h-3.5 w-3.5 text-primary/80" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

function AbaSupabase() {
  const [profissaoSelecionada, setProfissaoSelecionada] = useState<string | null>(null);
  const [sessionSelecionada, setSessionSelecionada] = useState<string | null>(null);

  const { data: profissoes, isLoading: loadingProfissoes } = useQuery({
    queryKey: ["conversas-profissoes"],
    queryFn: () => conversasService.listProfissoes(),
    staleTime: 60_000,
  });

  const { data: sessoes, isLoading: loadingSessoes } = useQuery({
    queryKey: ["conversas-sessoes", profissaoSelecionada],
    queryFn: () => conversasService.listSessoes(profissaoSelecionada!),
    enabled: Boolean(profissaoSelecionada),
    staleTime: 30_000,
  });

  if (!profissaoSelecionada) {
    return (
      <GradeProfissoes
        profissoes={profissoes}
        isLoading={loadingProfissoes}
        onSelect={(p) => {
          setProfissaoSelecionada(p);
          setSessionSelecionada(null);
        }}
      />
    );
  }

  return (
    <div className="flex h-full flex-col gap-0">
      <div className="mb-3 flex items-center gap-2 text-sm text-white/60">
        <button
          onClick={() => { setProfissaoSelecionada(null); setSessionSelecionada(null); }}
          className="flex items-center gap-1 rounded-lg px-2 py-1 hover:bg-white/10 hover:text-white transition"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Profissões
        </button>
        <ChevronRight className="h-3.5 w-3.5 text-white/30" />
        <span className="font-medium text-white">{PROFISSAO_LABEL[profissaoSelecionada] ?? profissaoSelecionada}</span>
        {sessionSelecionada && (
          <>
            <ChevronRight className="h-3.5 w-3.5 text-white/30" />
            <span className="font-mono text-xs text-white/60">{abreviarSessionId(sessionSelecionada)}</span>
          </>
        )}
      </div>

      <div className="flex min-h-0 flex-1 gap-3 overflow-hidden">
        <div className="flex w-72 shrink-0 flex-col overflow-hidden rounded-xl border border-white/10 bg-surface p-3">
          <ListaSessoes
            sessao={sessionSelecionada}
            sessoes={sessoes}
            isLoading={loadingSessoes}
            onSelect={setSessionSelecionada}
          />
        </div>
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-white/10 bg-[#0a1014]">
          {sessionSelecionada ? (
            <ChatConversa profissao={profissaoSelecionada} sessionId={sessionSelecionada} />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-white/30">
              <MessageCircle className="h-12 w-12" />
              <p className="text-sm">Selecione uma sessão para ver a conversa</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// ABA UNNICHAT — tempo real + WhatsApp-like
// ═══════════════════════════════════════════════════════════

interface AtendimentoItem {
  id: string;
  telefone: string;
  nome?: string | null;
  nomeAgente?: string | null;
  atualizadoEm: string;
  criadoEm: string;
  _count?: { mensagens: number };
  mensagens?: Array<{ conteudo: string; criadoEm: string; origem: string }>;
}

interface MensagemItem {
  id: string;
  conteudo: string;
  origem: "CLIENTE" | "AGENTE_IA" | "VENDEDOR";
  criadoEm: string;
}

// Hook SSE para receber eventos do backend em tempo real
function useSseAtendimentos(
  onNovoAtendimento: (a: AtendimentoItem) => void,
  onNovaMensagem: (payload: { atendimentoId: string; mensagem: MensagemItem }) => void,
) {
  // Refs garantem que os callbacks sempre usam a versão mais recente,
  // mesmo com o useEffect rodando apenas uma vez (evita stale closure)
  const onNovoRef = useRef(onNovoAtendimento);
  const onMsgRef = useRef(onNovaMensagem);
  useEffect(() => { onNovoRef.current = onNovoAtendimento; }, [onNovoAtendimento]);
  useEffect(() => { onMsgRef.current = onNovaMensagem; }, [onNovaMensagem]);

  useEffect(() => {
    const baseURL = import.meta.env.VITE_API_URL ?? "";
    const token = getAccessToken();
    const url = `${baseURL}/atendimentos/live${token ? `?token=${token}` : ""}`;

    const es = new EventSource(url);

    es.addEventListener("novo_atendimento", (e) => {
      try { onNovoRef.current(JSON.parse(e.data)); } catch { /* ignore */ }
    });

    es.addEventListener("nova_mensagem", (e) => {
      try { onMsgRef.current(JSON.parse(e.data)); } catch { /* ignore */ }
    });

    es.onerror = () => {
      // EventSource reconecta automaticamente
    };

    return () => es.close();
  }, []);
}

function FiltrosBar({
  filtros,
  onChange,
  agentes,
}: {
  filtros: FiltrosAtendimento;
  onChange: (f: FiltrosAtendimento) => void;
  agentes: Array<{ id: string; nome: string }>;
}) {
  const temFiltro = !!(filtros.agenteId || filtros.dataInicio || filtros.dataFim || filtros.search);

  return (
    <div className="space-y-2 border-b border-white/10 px-3 py-2">
      {/* Busca */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/30" />
        <input
          type="text"
          placeholder="Buscar nome, telefone ou agente..."
          value={filtros.search ?? ""}
          onChange={(e) => onChange({ ...filtros, search: e.target.value || undefined })}
          className="h-8 w-full rounded-md border border-white/10 bg-white/5 pl-8 pr-3 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-primary/50"
        />
      </div>

      {/* Linha de filtros adicionais */}
      <div className="flex gap-2">
        {/* Agente */}
        <div className="relative flex-1">
          <Bot className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-white/30" />
          <select
            value={filtros.agenteId ?? ""}
            onChange={(e) => onChange({ ...filtros, agenteId: e.target.value || undefined })}
            className="h-7 w-full rounded-md border border-white/10 bg-white/5 pl-6 pr-2 text-[11px] text-white focus:outline-none focus:border-primary/50 appearance-none"
          >
            <option value="">Todos os agentes</option>
            {agentes.map((a) => (
              <option key={a.id} value={a.id}>{a.nome}</option>
            ))}
          </select>
        </div>

        {/* Data início */}
        <div className="relative">
          <CalendarDays className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-white/30" />
          <input
            type="date"
            value={filtros.dataInicio ?? ""}
            onChange={(e) => onChange({ ...filtros, dataInicio: e.target.value || undefined })}
            className="h-7 rounded-md border border-white/10 bg-white/5 pl-6 pr-1 text-[11px] text-white focus:outline-none focus:border-primary/50 w-32"
          />
        </div>

        {/* Data fim */}
        <div className="relative">
          <input
            type="date"
            value={filtros.dataFim ?? ""}
            onChange={(e) => onChange({ ...filtros, dataFim: e.target.value || undefined })}
            className="h-7 rounded-md border border-white/10 bg-white/5 px-2 text-[11px] text-white focus:outline-none focus:border-primary/50 w-28"
          />
        </div>
      </div>

      {/* Limpar filtros */}
      {temFiltro && (
        <button
          onClick={() => onChange({})}
          className="flex items-center gap-1 text-[10px] text-white/40 hover:text-white transition"
        >
          <X className="h-3 w-3" />
          Limpar filtros
        </button>
      )}
    </div>
  );
}

function AbaUnnichat() {
  const [atendimentoId, setAtendimentoId] = useState<string | null>(null);
  const [atendimentos, setAtendimentos] = useState<AtendimentoItem[]>([]);
  const [mensagens, setMensagens] = useState<MensagemItem[]>([]);
  const [loadingMensagens, setLoadingMensagens] = useState(false);
  const [filtros, setFiltros] = useState<FiltrosAtendimento>({});
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: agentes = [] } = useQuery({
    queryKey: ["agentes-lista"],
    queryFn: () => agentesService.list({ limit: 200 }).then((r) => r.data as Array<{ id: string; nome: string }>),
    staleTime: 60_000,
  });

  // Carga inicial de atendimentos — reexecuta quando filtros mudam
  const { data: atendimentosInicial, isLoading } = useQuery({
    queryKey: ["atendimentos", filtros],
    queryFn: () => atendimentosService.list(filtros),
    staleTime: 30_000,
  });

  useEffect(() => {
    if (atendimentosInicial) setAtendimentos(atendimentosInicial as AtendimentoItem[]);
  }, [atendimentosInicial]);

  // Carga de mensagens ao selecionar atendimento
  useEffect(() => {
    if (!atendimentoId) { setMensagens([]); return; }
    setLoadingMensagens(true);
    atendimentosService.getMensagens(atendimentoId)
      .then((msgs) => setMensagens(msgs as MensagemItem[]))
      .finally(() => setLoadingMensagens(false));
  }, [atendimentoId]);

  // Polling de fallback: atualiza mensagens a cada 5s caso o SSE não dispare
  useEffect(() => {
    if (!atendimentoId) return;
    const timer = setInterval(() => {
      atendimentosService.getMensagens(atendimentoId).then((msgs) => {
        setMensagens((prev) => {
          // Só atualiza se chegou algo novo (evita re-render desnecessário)
          if ((msgs as MensagemItem[]).length !== prev.length) return msgs as MensagemItem[];
          return prev;
        });
      });
    }, 5_000);
    return () => clearInterval(timer);
  }, [atendimentoId]);

  // Auto-scroll ao receber novas mensagens
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagens]);

  // SSE em tempo real
  useSseAtendimentos(
    (novoAten) => {
      setAtendimentos((prev) => {
        // Evita duplicatas
        if (prev.some((a) => a.id === novoAten.id)) return prev;
        return [novoAten, ...prev];
      });
    },
    ({ atendimentoId: aid, mensagem }) => {
      // Atualiza preview na lista
      setAtendimentos((prev) =>
        prev.map((a) =>
          a.id === aid
            ? {
                ...a,
                atualizadoEm: mensagem.criadoEm,
                mensagens: [{ conteudo: mensagem.conteudo, criadoEm: mensagem.criadoEm, origem: mensagem.origem }],
                _count: { mensagens: (a._count?.mensagens ?? 0) + 1 },
              }
            : a,
        ).sort((a, b) => new Date(b.atualizadoEm).getTime() - new Date(a.atualizadoEm).getTime()),
      );
      // Adiciona mensagem ao chat aberto
      if (aid === atendimentoId) {
        setMensagens((prev) => {
          if (prev.some((m) => m.id === mensagem.id)) return prev;
          return [...prev, mensagem];
        });
      }
    },
  );

  const atendimentoAtual = atendimentos.find((a) => a.id === atendimentoId);

  // Agrupa mensagens por dia
  const gruposMensagens: { dia: string; msgs: MensagemItem[] }[] = [];
  let diaAtual = "";
  for (const msg of mensagens) {
    const dia = new Date(msg.criadoEm).toLocaleDateString("pt-BR", {
      day: "2-digit", month: "long", year: "numeric",
    });
    if (dia !== diaAtual) {
      diaAtual = dia;
      gruposMensagens.push({ dia, msgs: [msg] });
    } else {
      gruposMensagens[gruposMensagens.length - 1].msgs.push(msg);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 gap-0 overflow-hidden rounded-xl border border-white/10">
      {/* ── Sidebar de contatos (estilo WhatsApp) ── */}
      <div className="flex w-80 shrink-0 flex-col border-r border-white/10 bg-surface">
        {/* Cabeçalho sidebar */}
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-white">Conversas</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-primary/20 px-2 py-0.5 text-xs font-bold text-primary">
              {atendimentos.length}
            </span>
            <button
              onClick={() => setFiltrosAbertos((v) => !v)}
              title="Filtros"
              className={`flex h-6 w-6 items-center justify-center rounded-md transition ${
                filtrosAbertos || Object.values(filtros).some(Boolean)
                  ? "bg-primary/20 text-primary"
                  : "text-white/40 hover:text-white hover:bg-white/10"
              }`}
            >
              <Filter className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Filtros (expansível) */}
        {filtrosAbertos && (
          <FiltrosBar filtros={filtros} onChange={setFiltros} agentes={agentes} />
        )}

        {/* Lista de contatos */}
        <div className="flex-1 overflow-y-auto">
          {isLoading && (
            <div className="space-y-0">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 border-b border-white/5 px-4 py-3">
                  <div className="h-11 w-11 animate-pulse rounded-full bg-white/10 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-24 animate-pulse rounded bg-white/10" />
                    <div className="h-3 w-36 animate-pulse rounded bg-white/5" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!isLoading && atendimentos.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-white/30">
              <MessageCircle className="h-8 w-8" />
              <p className="text-sm">Nenhuma conversa ainda</p>
            </div>
          )}

          {atendimentos.map((a) => {
            const ativo = a.id === atendimentoId;
            const iniciais = iniciaisNome(a.nome);
            const ultimaMensagem = a.mensagens?.[0];

            return (
              <button
                key={a.id}
                onClick={() => setAtendimentoId(a.id)}
                className={`flex w-full items-center gap-3 border-b border-white/5 px-4 py-3 text-left transition ${
                  ativo ? "bg-primary/10" : "hover:bg-white/5"
                }`}
              >
                {/* Avatar com iniciais */}
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                    ativo ? "bg-primary/30 text-primary" : "bg-white/10 text-white/60"
                  }`}
                >
                  {iniciais}
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`truncate text-sm font-semibold ${ativo ? "text-white" : "text-white/80"}`}>
                      {a.nome ?? "Lead"}
                    </p>
                    <span className="shrink-0 text-[10px] text-white/30">
                      {formatarDataCurta(a.atualizadoEm ?? a.criadoEm)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Phone className="h-3 w-3 shrink-0 text-white/25" />
                    <p className="truncate text-xs text-white/40">{formatarTelefone(a.telefone)}</p>
                  </div>
                  {/* Badge do agente */}
                  {a.nomeAgente && (
                    <div className="mt-0.5 flex items-center gap-1">
                      <Bot className="h-3 w-3 shrink-0 text-secondary/60" />
                      <p className={`truncate text-[11px] ${ativo ? "text-secondary/70" : "text-white/30"}`}>
                        {a.nomeAgente}
                      </p>
                    </div>
                  )}
                  {ultimaMensagem && (
                    <p className={`mt-0.5 truncate text-[11px] ${ativo ? "text-white/50" : "text-white/30"}`}>
                      {ultimaMensagem.origem === "AGENTE_IA" ? "IA: " : ""}
                      {previewText(ultimaMensagem.conteudo)}
                    </p>
                  )}
                </div>

                {/* Badge de contagem */}
                {(a._count?.mensagens ?? 0) > 0 && (
                  <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                    ativo ? "bg-primary/30 text-primary" : "bg-white/10 text-white/40"
                  }`}>
                    {a._count?.mensagens}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Área do chat ── */}
      <div className="flex min-w-0 flex-1 flex-col bg-[#0a1014]">
        {!atendimentoAtual ? (
          /* Estado vazio */
          <div className="flex h-full flex-col items-center justify-center gap-4 text-white/20">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/5">
              <MessageCircle className="h-8 w-8" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-white/30">Selecione uma conversa</p>
              <p className="mt-1 text-xs text-white/20">As mensagens aparecem em tempo real</p>
            </div>
          </div>
        ) : (
          <>
            {/* Header do chat */}
            <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/20 text-sm font-bold text-primary">
                {iniciaisNome(atendimentoAtual.nome)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-white">
                  {atendimentoAtual.nome ?? "Lead"}
                </p>
                <div className="flex items-center gap-2">
                  <Phone className="h-3 w-3 text-white/30" />
                  <p className="text-xs text-white/50">{formatarTelefone(atendimentoAtual.telefone)}</p>
                  {atendimentoAtual.nomeAgente && (
                    <>
                      <span className="text-white/20">·</span>
                      <p className="truncate text-xs text-white/30">{atendimentoAtual.nomeAgente}</p>
                    </>
                  )}
                </div>
              </div>
              {/* Indicador em tempo real */}
              <div className="flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                <span className="text-[10px] font-medium text-primary">Ao vivo</span>
              </div>
            </div>

            {/* Mensagens */}
            <div className="flex-1 overflow-y-auto px-4 py-4">
              {loadingMensagens ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className={`flex ${i % 2 === 0 ? "justify-start" : "justify-end"}`}>
                      <div className={`h-10 animate-pulse rounded-2xl bg-white/5 ${i % 2 === 0 ? "w-2/3" : "w-1/2"}`} />
                    </div>
                  ))}
                </div>
              ) : mensagens.length === 0 ? (
                <div className="flex h-full items-center justify-center">
                  <p className="text-sm text-white/30">Nenhuma mensagem ainda.</p>
                </div>
              ) : (
                gruposMensagens.map((grupo) => (
                  <div key={grupo.dia} className="mb-2">
                    {/* Separador de dia */}
                    <div className="my-4 flex items-center gap-3">
                      <div className="h-px flex-1 bg-white/8" />
                      <span className="rounded-full bg-white/10 px-3 py-0.5 text-[11px] text-white/40">
                        {grupo.dia}
                      </span>
                      <div className="h-px flex-1 bg-white/8" />
                    </div>

                    <div className="space-y-1.5">
                      {grupo.msgs.map((msg) => {
                        const isCliente = msg.origem === "CLIENTE";

                        return (
                          <div
                            key={msg.id}
                            className={`flex items-end gap-2 ${isCliente ? "justify-end" : "justify-start"}`}
                          >
                            {/* Avatar IA */}
                            {!isCliente && (
                              <div className="mb-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary/20">
                                <Bot className="h-3.5 w-3.5 text-secondary/70" />
                              </div>
                            )}

                            {/* Balão */}
                            <div
                              className={`max-w-[70%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm ${
                                isCliente
                                  ? "rounded-br-none bg-primary/20 text-white"
                                  : "rounded-bl-none bg-white/8 text-white/90"
                              }`}
                            >
                              <span className="whitespace-pre-line">{normalizeContent(msg.conteudo)}</span>
                              <div className={`mt-1 flex items-center gap-1 justify-end text-[10px] ${isCliente ? "text-white/45" : "text-white/30"}`}>
                                {!isCliente && (
                                  <span>{msg.origem === "AGENTE_IA" ? "IA" : "Vendedor"}</span>
                                )}
                                {!isCliente && <span>·</span>}
                                <span>{formatarHora(msg.criadoEm)}</span>
                              </div>
                            </div>

                            {/* Avatar cliente */}
                            {isCliente && (
                              <div className="mb-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/20">
                                <User className="h-3.5 w-3.5 text-primary/70" />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
              <div ref={bottomRef} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── página principal ──────────────────────────────────────────────────────────

type Aba = "unnichat" | "supabase";

export function Atendimentos() {
  const [aba, setAba] = useState<Aba>("unnichat");

  return (
    <div className="flex h-full flex-col space-y-4">
      <PageHeader
        title="Atendimentos"
        subtitle="Visualize conversas dos atendimentos realizados"
      />

      {/* tabs */}
      <div className="flex gap-1 rounded-lg border border-white/10 bg-white/5 p-1 w-fit">
        <button
          onClick={() => setAba("unnichat")}
          className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition ${
            aba === "unnichat" ? "bg-primary text-white shadow" : "text-white/60 hover:text-white"
          }`}
        >
          <Zap className="h-4 w-4" />
          Unnichat
        </button>
        <button
          onClick={() => setAba("supabase")}
          className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition ${
            aba === "supabase" ? "bg-primary text-white shadow" : "text-white/60 hover:text-white"
          }`}
        >
          <MessageCircle className="h-4 w-4" />
          Supabase
        </button>
      </div>

      {/* conteúdo */}
      <div className="flex min-h-0 flex-1">
        {aba === "unnichat" ? <AbaUnnichat /> : <AbaSupabase />}
      </div>
    </div>
  );
}
