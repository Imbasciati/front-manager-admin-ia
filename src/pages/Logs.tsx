import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  Clock,
  LogIn,
  LogOut,
  Shield,
  User,
  Wifi,
  X,
} from "lucide-react";
import { PageHeader } from "../components/shared/PageHeader";
import { logsService } from "../services/logs.service";

// ── helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatDatetime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

function formatDuracao(s: number | null | undefined) {
  if (!s) return "—";
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s`;
  return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
}

function perfilLabel(perfil: string) {
  const map: Record<string, string> = { ADMIN: "Admin", SUPERVISOR: "Supervisor", VENDEDOR: "Vendedor" };
  return map[perfil] ?? perfil;
}

function perfilColor(perfil: string) {
  const map: Record<string, string> = {
    ADMIN: "bg-purple-500/20 text-purple-300",
    SUPERVISOR: "bg-blue-500/20 text-blue-300",
    VENDEDOR: "bg-emerald-500/20 text-emerald-300",
  };
  return map[perfil] ?? "bg-white/10 text-white/50";
}

function eventoIcon(evento: string) {
  if (evento === "CONECTOU") return <LogIn className="h-3.5 w-3.5 text-emerald-400" />;
  if (evento === "DESCONECTOU") return <LogOut className="h-3.5 w-3.5 text-red-400" />;
  if (evento === "ERRO") return <Shield className="h-3.5 w-3.5 text-orange-400" />;
  return <Activity className="h-3.5 w-3.5 text-blue-400" />;
}

function eventoLabel(evento: string, acao: string | null) {
  if (evento === "CONECTOU") return "Login";
  if (evento === "DESCONECTOU") return "Logout";
  if (evento === "ERRO") return "Erro";
  const map: Record<string, string> = {
    CRIAR_AGENTE: "Criou agente",
    EDITAR_AGENTE: "Editou agente",
    EXCLUIR_AGENTE: "Excluiu agente",
  };
  if (acao && map[acao]) return map[acao];
  return acao ?? "Ação";
}

function eventoColor(evento: string) {
  if (evento === "CONECTOU") return "bg-emerald-500/10 text-emerald-300 border-emerald-500/20";
  if (evento === "DESCONECTOU") return "bg-red-500/10 text-red-300 border-red-500/20";
  if (evento === "ERRO") return "bg-orange-500/10 text-orange-300 border-orange-500/20";
  return "bg-blue-500/10 text-blue-300 border-blue-500/20";
}

// ── painel de detalhes ────────────────────────────────────────────────────────

function DetalheUsuario({
  usuario,
  onClose,
}: {
  usuario: { id: string; nome: string; email: string; perfil: string };
  onClose: () => void;
}) {
  const [page, setPage] = useState(1);
  const LIMIT = 15;

  const { data, isLoading } = useQuery({
    queryKey: ["log-detalhe", usuario.id, page],
    queryFn: () => logsService.detalheUsuario(usuario.id, { page, limit: LIMIT }),
  });

  const logs = (data as any)?.data ?? [];
  const total: number = (data as any)?.meta?.total ?? 0;
  const totalPages = Math.ceil(total / LIMIT);

  // agrupa por data
  const porData: Record<string, typeof logs> = {};
  for (const log of logs) {
    const dia = formatDate(log.criadoEm);
    if (!porData[dia]) porData[dia] = [];
    porData[dia].push(log);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end bg-black/60 backdrop-blur-sm">
      <div className="flex h-full w-full max-w-2xl flex-col bg-[#0e1117] shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-4 border-b border-white/10 px-6 py-4">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-white/10">
            <User className="h-5 w-5 text-white/60" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-white truncate">{usuario.nome}</p>
            <p className="text-xs text-white/50 truncate">{usuario.email}</p>
          </div>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${perfilColor(usuario.perfil)}`}>
            {perfilLabel(usuario.perfil)}
          </span>
          <button
            onClick={onClose}
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-white/10 text-white/40 hover:border-white/30 hover:text-white transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Logs agrupados por data */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {isLoading ? (
            <p className="text-sm text-white/40 text-center py-8">Carregando...</p>
          ) : logs.length === 0 ? (
            <p className="text-sm text-white/40 text-center py-8">Nenhuma atividade registrada.</p>
          ) : (
            Object.entries(porData).map(([dia, entradas]) => (
              <div key={dia}>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-white/30">{dia}</p>
                <div className="space-y-2">
                  {entradas.map((log: any) => (
                    <div
                      key={log.id}
                      className="flex items-start gap-3 rounded-lg border border-white/5 bg-white/3 p-3"
                    >
                      <div className={`mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md border ${eventoColor(log.evento)}`}>
                        {eventoIcon(log.evento)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-white">
                            {eventoLabel(log.evento, log.acao)}
                          </span>
                          {log.entidade && (
                            <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-white/50">
                              {log.entidade}
                            </span>
                          )}
                        </div>
                        {log.descricao && (
                          <p className="mt-0.5 text-xs text-white/50 truncate">{log.descricao}</p>
                        )}
                        <div className="mt-1 flex items-center gap-3 text-[10px] text-white/30">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDatetime(log.criadoEm)}
                          </span>
                          {log.ip && (
                            <span className="flex items-center gap-1">
                              <Wifi className="h-3 w-3" />
                              {log.ip}
                            </span>
                          )}
                          {log.duracaoSessao != null && (
                            <span>Duração: {formatDuracao(log.duracaoSessao)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-white/10 px-6 py-3">
            <span className="text-xs text-white/40">{total} registros</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex h-7 w-7 items-center justify-center rounded border border-white/10 text-white/50 hover:text-white disabled:opacity-30 transition"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <span className="text-xs text-white/50">{page} / {totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="flex h-7 w-7 items-center justify-center rounded border border-white/10 text-white/50 hover:text-white disabled:opacity-30 transition"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── página principal ──────────────────────────────────────────────────────────

export function Logs() {
  const [usuarioSelecionado, setUsuarioSelecionado] = useState<{
    id: string; nome: string; email: string; perfil: string;
  } | null>(null);

  const ativos = useQuery({ queryKey: ["logs-ativos"], queryFn: logsService.ativos });
  const porUsuario = useQuery({ queryKey: ["logs-por-usuario"], queryFn: logsService.porUsuario });

  const usuariosAtivosIds = new Set(
    (ativos.data ?? []).map((a: any) => a.usuarioId)
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Logs" subtitle="Atividades dos usuários agrupadas por pessoa e data" />

      {/* Usuários online agora */}
      {(ativos.data ?? []).length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-white/40">Online agora:</span>
          {(ativos.data ?? []).map((a: any) => (
            <span
              key={a.usuarioId}
              className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {a.usuario?.nome}
            </span>
          ))}
        </div>
      )}

      {/* Grid de usuários */}
      {porUsuario.isLoading ? (
        <div className="flex items-center justify-center py-16 text-white/30">
          <Activity className="mr-2 h-5 w-5 animate-spin" />
          Carregando logs...
        </div>
      ) : (porUsuario.data ?? []).length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/3 py-16 text-center text-sm text-white/30">
          Nenhuma atividade registrada ainda.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {(porUsuario.data ?? []).map((item: any) => {
            const online = usuariosAtivosIds.has(item.usuario.id);
            return (
              <button
                key={item.usuario.id}
                onClick={() => setUsuarioSelecionado(item.usuario)}
                className="flex flex-col gap-3 rounded-xl border border-white/10 bg-surface p-4 text-left transition hover:border-white/25 hover:shadow-lg hover:shadow-black/20"
              >
                {/* Cabeçalho */}
                <div className="flex items-start gap-3">
                  <div className="relative flex-shrink-0">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
                      <User className="h-5 w-5 text-white/50" />
                    </div>
                    {online && (
                      <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-surface bg-emerald-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white truncate">{item.usuario.nome}</p>
                    <p className="text-xs text-white/40 truncate">{item.usuario.email}</p>
                  </div>
                  <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${perfilColor(item.usuario.perfil)}`}>
                    {perfilLabel(item.usuario.perfil)}
                  </span>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-white/5 px-3 py-2">
                    <p className="text-[10px] text-white/40">Total de ações</p>
                    <p className="text-lg font-bold text-white">{item.totalAcoes}</p>
                  </div>
                  <div className="rounded-lg bg-white/5 px-3 py-2">
                    <p className="text-[10px] text-white/40">Conexões</p>
                    <p className="text-lg font-bold text-white">{item.totalConexoes}</p>
                  </div>
                </div>

                {/* Última atividade */}
                {item.ultimaAtividade && (
                  <div className="flex items-center gap-1.5 text-xs text-white/40">
                    <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>Último acesso: {formatDatetime(item.ultimaAtividade)}</span>
                  </div>
                )}

                {/* Última sessão */}
                {item.ultimaSessao?.duracaoSessao != null && (
                  <div className="flex items-center gap-1.5 text-xs text-white/40">
                    <Activity className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>Última sessão: {formatDuracao(item.ultimaSessao.duracaoSessao)}</span>
                  </div>
                )}

                <div className="flex items-center justify-end">
                  <span className="text-xs font-medium text-primary/70">Ver detalhes →</span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Painel de detalhes */}
      {usuarioSelecionado && (
        <DetalheUsuario
          usuario={usuarioSelecionado}
          onClose={() => setUsuarioSelecionado(null)}
        />
      )}
    </div>
  );
}
