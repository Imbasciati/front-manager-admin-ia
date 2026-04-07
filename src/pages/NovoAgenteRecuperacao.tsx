import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  Bot,
  Brain,
  Briefcase,
  ChevronDown,
  ChevronUp,
  FileText,
  Info,
  MessageCircle,
  MessageSquare,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  Users,
  Zap,
} from "lucide-react";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Button } from "../components/ui/button";
import { FileUpload } from "../components/shared/FileUpload";
import { agentesService } from "../services/agentes.service";
import { ProviderModelSelect } from "../components/shared/ProviderModelSelect";
import { conexaoUnnichatService } from "../services/conexao-unnichat.service";
import { useQuery } from "@tanstack/react-query";

// ── tipos ─────────────────────────────────────────────────────────────────────

type Canal = "NENHUM" | "UNNICHAT" | "MANYCHAT" | "AMBOS";
type TipoAtuacao = "" | "Produto Único" | "Produtos Variados";

interface ProdutoVariado {
  nome: string;
  descricao: string;
  linkVendas: string;
}

const PRODUTOS = [
  "Curso Perito para: Administrador",
  "Curso Perito para: Advogado",
  "Curso Perito para: Arquiteto",
  "Curso Perito para: Assistente Social",
  "Curso Perito para: Contador",
  "Curso Perito para: Corretor",
  "Curso Perito para: Dentista",
  "Curso Perito para: Engenheiro Civil",
  "Curso Perito para: Farmacêutico",
  "Curso Perito para: Fisioterapeuta",
  "Curso Perito para: Pedagogo",
  "Curso Perito para: Professor",
  "Curso Perito para: Psicólogo",
  "Curso Perito para: Veterinário",
  "Outros",
] as const;

const schema = z.object({
  nome: z.string().min(3, "Nome obrigatório"),
  promptSistema: z.string().min(20, "Prompt deve ter ao menos 20 caracteres"),
  contextoProdutos: z.string().optional(),
  tom: z.enum(["PROFISSIONAL", "CASUAL", "FORMAL", "AMIGAVEL"]),
  modelo: z.string().min(2, "Modelo obrigatório"),
  temperatura: z.coerce.number().min(0).max(2),
  tokensMaximos: z.coerce.number().int().min(50),
  todosVendedores: z.boolean().default(true),
  canalIntegracao: z.enum(["NENHUM", "UNNICHAT", "MANYCHAT", "AMBOS"]).default("NENHUM"),
  unnichatAtivo: z.boolean().optional(),
  conexaoUnnichatId: z.string().optional(),
  produto: z.string().optional(),
  atuacao: z.string().optional(),
});
type Values = z.infer<typeof schema>;

// ── helpers temperatura ────────────────────────────────────────────────────────

function tempInfo(t: number): { label: string; desc: string; cor: string } {
  if (t <= 0.3) return { label: "Muito Consistente", desc: "Respostas previsíveis e precisas. Ideal para FAQs e atendimento padronizado.", cor: "text-blue-400" };
  if (t <= 0.6) return { label: "Consistente", desc: "Bom equilíbrio entre precisão e leveza. Recomendado para vendas.", cor: "text-cyan-400" };
  if (t <= 1.0) return { label: "Balanceado", desc: "Respostas variadas mantendo coerência. Bom para conversas naturais.", cor: "text-green-400" };
  if (t <= 1.4) return { label: "Criativo", desc: "Respostas mais diversas e exploratórias. Pode variar mais entre conversas.", cor: "text-yellow-400" };
  return { label: "Muito Criativo", desc: "Alta variação nas respostas. Use com cuidado em atendimento profissional.", cor: "text-orange-400" };
}

function tempGradient(t: number) {
  return (t / 2) * 100;
}

// ── canais ────────────────────────────────────────────────────────────────────

interface CanalCardProps {
  canal: Canal;
  selected: Canal;
  onSelect: (c: Canal) => void;
  register: ReturnType<typeof useForm<Values>>["register"];
  setValue: ReturnType<typeof useForm<Values>>["setValue"];
  conexaoUnnichatId?: string;
}

function UnnichatCard({ selected, onSelect, setValue, conexaoUnnichatId }: Omit<CanalCardProps, "canal" | "register">) {
  const ativo = selected === "UNNICHAT" || selected === "AMBOS";

  const { data: conexoes = [] } = useQuery({
    queryKey: ["conexoes-unnichat"],
    queryFn: conexaoUnnichatService.list,
    enabled: ativo,
  });

  return (
    <div className={`rounded-xl border-2 transition-all duration-200 ${ativo ? "border-green-500/60 bg-green-500/10" : "border-white/10 bg-white/5 hover:border-white/20"}`}>
      <button
        type="button"
        className="flex w-full items-center gap-4 p-4 text-left"
        onClick={() => onSelect(ativo ? (selected === "AMBOS" ? "MANYCHAT" : "NENHUM") : (selected === "MANYCHAT" ? "AMBOS" : "UNNICHAT"))}
      >
        <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl ${ativo ? "bg-green-500/20" : "bg-white/5"}`}>
          <Zap className={`h-6 w-6 ${ativo ? "text-green-400" : "text-white/40"}`} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className={`font-semibold ${ativo ? "text-green-400" : "text-white/70"}`}>Unnichat</p>
            <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${ativo ? "bg-green-500/20 text-green-400" : "bg-white/10 text-white/40"}`}>WhatsApp</span>
          </div>
          <p className="mt-0.5 text-xs text-white/50">Conecte ao WhatsApp via Unnichat e responda clientes automaticamente</p>
        </div>
        <div className={`h-5 w-5 flex-shrink-0 rounded-full border-2 ${ativo ? "border-green-400 bg-green-400" : "border-white/30"}`} />
      </button>

      {ativo && (
        <div className="space-y-3 border-t border-green-500/20 px-4 pb-4 pt-3">
          <div>
            <label className="mb-1 block text-xs text-white/50">Conexão Unnichat</label>
            {conexoes.length === 0 ? (
              <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-400">
                Nenhuma conexão disponível.{" "}
                <strong>Configure em Configurações → Unnichat</strong> antes de continuar.
              </div>
            ) : (
              <select
                className="h-10 w-full rounded-md border border-white/20 bg-surface px-3 text-sm"
                value={conexaoUnnichatId ?? ""}
                onChange={(e) => setValue("conexaoUnnichatId", e.target.value || undefined)}
              >
                <option value="">Selecione a conexão...</option>
                {conexoes.map((c) => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            )}
          </div>
          <p className="text-xs text-white/40">
            A URL do Webhook ficará disponível após salvar o agente.
          </p>
        </div>
      )}
    </div>
  );
}

function ManyChatCard({ selected, onSelect }: { selected: Canal; onSelect: (c: Canal) => void }) {
  const ativo = selected === "MANYCHAT" || selected === "AMBOS";
  const [aberto, setAberto] = useState(false);

  return (
    <div className={`rounded-xl border-2 transition-all duration-200 ${ativo ? "border-blue-500/60 bg-blue-500/10" : "border-white/10 bg-white/5 hover:border-white/20"}`}>
      <button
        type="button"
        className="flex w-full items-center gap-4 p-4 text-left"
        onClick={() => onSelect(ativo ? (selected === "AMBOS" ? "UNNICHAT" : "NENHUM") : (selected === "UNNICHAT" ? "AMBOS" : "MANYCHAT"))}
      >
        <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl ${ativo ? "bg-blue-500/20" : "bg-white/5"}`}>
          <MessageCircle className={`h-6 w-6 ${ativo ? "text-blue-400" : "text-white/40"}`} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className={`font-semibold ${ativo ? "text-blue-400" : "text-white/70"}`}>ManyChat</p>
            <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${ativo ? "bg-blue-500/20 text-blue-400" : "bg-white/10 text-white/40"}`}>Instagram / Messenger</span>
          </div>
          <p className="mt-0.5 text-xs text-white/50">Integre com fluxos do ManyChat para responder automaticamente</p>
        </div>
        <div className={`h-5 w-5 flex-shrink-0 rounded-full border-2 ${ativo ? "border-blue-400 bg-blue-400" : "border-white/30"}`} />
      </button>

      {ativo && (
        <div className="space-y-3 border-t border-blue-500/20 px-4 pb-4 pt-3">
          <div className="rounded-lg bg-blue-500/5 p-3 text-xs text-white/60">
            <p className="mb-2 font-semibold text-white/80">Configuração via painel global</p>
            <p>A integração com ManyChat utiliza configurações globais (Token, IDs de campo). Acesse:</p>
            <p className="mt-1 font-semibold text-blue-400">Configurações → Agente IA</p>
          </div>
          <button type="button" onClick={() => setAberto(!aberto)}
            className="flex items-center gap-1.5 text-xs text-blue-400/70 hover:text-blue-400">
            {aberto ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            Como configurar o ManyChat?
          </button>
          {aberto && (
            <div className="rounded-lg bg-white/5 p-3 text-xs text-white/60 space-y-1.5">
              <ol className="list-inside list-decimal space-y-1">
                <li>Acesse <strong className="text-white">Configurações → Agente IA</strong> no painel</li>
                <li>Configure o <strong className="text-white">Token do ManyChat</strong></li>
                <li>Preencha os <strong className="text-white">IDs dos campos customizados</strong></li>
                <li>No ManyChat, configure um fluxo para enviar mensagens ao webhook</li>
                <li>O agente processará as mensagens automaticamente</li>
              </ol>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── página principal ──────────────────────────────────────────────────────────

export function NovoAgenteRecuperacao() {
  const navigate = useNavigate();
  const [files, setFiles] = useState<File[]>([]);
  const [progress, setProgress] = useState(0);
  const [tipoAtuacao, setTipoAtuacao] = useState<TipoAtuacao>("");
  const [produtoOpcao, setProdutoOpcao] = useState("");
  const [produtosVariados, setProdutosVariados] = useState<ProdutoVariado[]>([
    { nome: "", descricao: "", linkVendas: "" },
  ]);

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      tom: "PROFISSIONAL",
      modelo: "gpt-4o",
      temperatura: 0.7,
      tokensMaximos: 500,
      todosVendedores: true,
      canalIntegracao: "NENHUM",
      atuacao: "Recuperação",
    },
  });

  const temperatura = Number(watch("temperatura") ?? 0.7);
  const modelo = watch("modelo");
  const canal = watch("canalIntegracao") as Canal;
  const todosVendedores = watch("todosVendedores");
  const info = tempInfo(temperatura);

  function handleProdutoChange(val: string) {
    setProdutoOpcao(val);
    if (val !== "Outros") setValue("produto", val);
    else setValue("produto", "");
  }

  function updateProduto(index: number, field: keyof ProdutoVariado, value: string) {
    setProdutosVariados((prev) => prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)));
  }

  function addProduto() {
    setProdutosVariados((prev) => [...prev, { nome: "", descricao: "", linkVendas: "" }]);
  }

  function removeProduto(index: number) {
    setProdutosVariados((prev) => prev.filter((_, i) => i !== index));
  }

  const mutation = useMutation({
    mutationFn: (values: Values) => {
      const form = new FormData();
      Object.entries(values).forEach(([k, v]) => {
        if (v !== undefined && v !== null) form.append(k, String(v));
      });
      files.forEach((f) => form.append("documentos", f));
      return agentesService.create(form);
    },
    onSuccess: (agente) => {
      toast.success("Agente criado com sucesso!");
      navigate(`/agentes/${agente.id}/editar`);
    },
  });

  function onSubmit(values: Values) {
    if (tipoAtuacao === "") {
      toast.error("Selecione o tipo de atuação");
      return;
    }

    values.atuacao = "Recuperação";

    if (tipoAtuacao === "Produtos Variados") {
      const validos = produtosVariados.filter((p) => p.nome.trim());
      if (validos.length === 0) {
        toast.error("Adicione pelo menos um produto com nome");
        return;
      }
      values.contextoProdutos = JSON.stringify(produtosVariados);
      values.produto = "PRODUTOS_VARIADOS";
    }

    setProgress(25);
    mutation.mutate(values, { onSettled: () => setProgress(100) });
  }

  return (
    <div className="min-h-screen">
      {/* Cabeçalho */}
      <div className="mb-6 flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate("/agentes")}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/60 transition hover:border-white/30 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <div className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-orange-400" />
            <h1 className="text-xl font-bold text-white">Novo Agente de Recuperação</h1>
          </div>
          <p className="text-sm text-white/50">Configure o agente para reengajar clientes e recuperar vendas</p>
        </div>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>

        {/* ── Seção 1: Produto & Atuação ── */}
        <SectionCard icon={<Briefcase className="h-4 w-4 text-orange-400" />} title="Produto & Atuação">
          <p className="mb-4 text-xs text-white/50">Defina como este agente de recuperação vai atuar nos atendimentos.</p>
          <div className="space-y-4">
            {/* Atuação — primeiro campo */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-white/60">Atuação</label>
              <select
                className="h-10 w-full rounded-md border border-white/20 bg-surface px-3 text-sm"
                value={tipoAtuacao}
                onChange={(e) => {
                  setTipoAtuacao(e.target.value as TipoAtuacao);
                  setProdutoOpcao("");
                  setValue("produto", "");
                }}
              >
                <option value="">Selecione a atuação...</option>
                <option value="Produto Único">Produto Único</option>
                <option value="Produtos Variados">Produtos Variados</option>
              </select>
              {tipoAtuacao === "Produto Único" && (
                <p className="mt-1 text-[11px] text-white/30">O agente será especializado em um único produto ou serviço.</p>
              )}
              {tipoAtuacao === "Produtos Variados" && (
                <p className="mt-1 text-[11px] text-white/30">O sistema identificará o produto via tag do Unnichat e usará a descrição correta no atendimento.</p>
              )}
            </div>

            {/* Produto — apenas para Produto Único */}
            {tipoAtuacao === "Produto Único" && (
              <div>
                <label className="mb-1.5 block text-xs font-medium text-white/60">Produto</label>
                <select
                  className="h-10 w-full rounded-md border border-white/20 bg-surface px-3 text-sm"
                  value={produtoOpcao}
                  onChange={(e) => handleProdutoChange(e.target.value)}
                >
                  <option value="">Selecione o produto...</option>
                  {PRODUTOS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
                {produtoOpcao === "Outros" && (
                  <Input className="mt-2" placeholder="Descreva o produto personalizado..." {...register("produto")} />
                )}
              </div>
            )}
          </div>
        </SectionCard>

        {/* ── Seção 2: Identidade do Agente ── */}
        {tipoAtuacao !== "" && (
          <SectionCard icon={<Bot className="h-4 w-4 text-primary" />} title="Identidade do Agente">
            <div className="space-y-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-white/60">Nome do Agente</label>
                <Input placeholder="Ex: Agente de Recuperação Premium" {...register("nome")} />
                {errors.nome && <p className="mt-1 text-xs text-red-400">{errors.nome.message}</p>}
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-white/60">Prompt do Sistema / Instruções</label>
                <Textarea
                  rows={5}
                  placeholder="Descreva o comportamento e personalidade do agente..."
                  {...register("promptSistema")}
                />
                <p className="mt-1 text-[11px] text-white/30">Instruções gerais de como o agente deve se comportar na recuperação.</p>
                {errors.promptSistema && <p className="mt-1 text-xs text-red-400">{errors.promptSistema.message}</p>}
              </div>

              {/* Produto Único: contexto de produto normal */}
              {tipoAtuacao === "Produto Único" && (
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-white/60">Contexto de Produtos/Serviços</label>
                  <Textarea
                    rows={4}
                    placeholder="Descreva seus produtos, preços, condições..."
                    {...register("contextoProdutos")}
                  />
                  <p className="mt-1 text-[11px] text-white/30">Informações sobre o produto que o agente usará nas respostas de recuperação.</p>
                </div>
              )}

              {/* Produtos Variados: lista de produtos */}
              {tipoAtuacao === "Produtos Variados" && (
                <div>
                  <label className="mb-3 block text-xs font-medium text-white/60">Produtos / Serviços</label>
                  <div className="space-y-3">
                    {produtosVariados.map((produto, index) => (
                      <div
                        key={index}
                        className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-white/60">Produto {index + 1}</span>
                          {produtosVariados.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeProduto(index)}
                              className="flex items-center gap-1 rounded px-2 py-1 text-xs text-red-400/70 transition hover:bg-red-500/10 hover:text-red-400"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Remover
                            </button>
                          )}
                        </div>

                        <div>
                          <label className="mb-1 block text-xs text-white/50">Nome do Produto</label>
                          <Input
                            placeholder="Ex: Curso Perito para Psicólogo"
                            value={produto.nome}
                            onChange={(e) => updateProduto(index, "nome", e.target.value)}
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-xs text-white/50">Descrição do Produto</label>
                          <Textarea
                            rows={3}
                            placeholder="Descreva o produto, benefícios, diferenciais..."
                            value={produto.descricao}
                            onChange={(e) => updateProduto(index, "descricao", e.target.value)}
                          />
                        </div>

                        <div>
                          <label className="mb-1 flex items-center gap-1.5 text-xs text-white/50">
                            Link de Vendas
                            <span className="group relative">
                              <Info className="h-3.5 w-3.5 cursor-help text-white/30 hover:text-white/60" />
                              <span className="pointer-events-none absolute bottom-full left-1/2 mb-2 hidden w-64 -translate-x-1/2 rounded-lg bg-black/90 px-3 py-2 text-[11px] text-white/80 shadow-xl group-hover:block">
                                O link de vendas precisa ser o da IA de Recuperação configurada no Unnichat
                              </span>
                            </span>
                          </label>
                          <Input
                            placeholder="https://..."
                            value={produto.linkVendas}
                            onChange={(e) => updateProduto(index, "linkVendas", e.target.value)}
                          />
                          <p className="mt-1 text-[11px] text-orange-400/70">
                            O link de vendas precisa ser o da IA de Recuperação
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={addProduto}
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 bg-white/5 py-3 text-sm text-white/50 transition hover:border-white/30 hover:bg-white/10 hover:text-white/70"
                  >
                    <Plus className="h-4 w-4" />
                    Adicionar Produto
                  </button>
                </div>
              )}
            </div>
          </SectionCard>
        )}

        {/* ── Seção 3: Modelo de IA ── */}
        {tipoAtuacao !== "" && (
          <SectionCard icon={<Brain className="h-4 w-4 text-purple-400" />} title="Modelo de IA">
            <ProviderModelSelect value={modelo} onChange={(v) => setValue("modelo", v)} />

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-white/60">Tom / Estilo</label>
                <select className="h-10 w-full rounded-md border border-white/20 bg-surface px-3 text-sm" {...register("tom")}>
                  <option value="PROFISSIONAL">Profissional</option>
                  <option value="CASUAL">Casual</option>
                  <option value="FORMAL">Formal</option>
                  <option value="AMIGAVEL">Amigável</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-white/60">Tokens Máximos</label>
                <Input type="number" placeholder="500" {...register("tokensMaximos")} />
                <p className="mt-1 text-[11px] text-white/30">Tamanho máximo da resposta gerada.</p>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <label className="text-xs font-medium text-white/60">Temperatura</label>
                  <p className={`text-sm font-bold ${info.cor}`}>{info.label}</p>
                </div>
                <span className={`rounded-lg border px-3 py-1 font-mono text-lg font-bold ${info.cor} border-current/20 bg-current/5`}>
                  {temperatura.toFixed(1)}
                </span>
              </div>
              <div className="relative">
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  {...register("temperatura")}
                  className="h-2 w-full cursor-pointer accent-primary"
                  style={{
                    background: `linear-gradient(to right, #3b82f6 0%, #22c55e ${tempGradient(temperatura) * 0.5}%, #f59e0b ${tempGradient(temperatura)}%, #374151 ${tempGradient(temperatura)}%, #374151 100%)`
                  }}
                />
                <div className="mt-1 flex justify-between text-[10px] text-white/30">
                  <span>0.0 — Preciso</span>
                  <span>1.0 — Balanceado</span>
                  <span>2.0 — Criativo</span>
                </div>
              </div>
              <p className="mt-3 text-xs text-white/50">{info.desc}</p>
            </div>
          </SectionCard>
        )}

        {/* ── Seção 4: Canal de Integração ── */}
        {tipoAtuacao !== "" && (
          <SectionCard icon={<MessageSquare className="h-4 w-4 text-cyan-400" />} title="Canal de Integração">
            <p className="mb-3 text-xs text-white/50">Selecione por qual plataforma este agente vai atender. Você pode ativar um ou ambos.</p>
            <div className="space-y-3">
              <UnnichatCard
                selected={canal}
                onSelect={(c) => setValue("canalIntegracao", c)}
                setValue={setValue}
                conexaoUnnichatId={watch("conexaoUnnichatId")}
              />
              <ManyChatCard
                selected={canal}
                onSelect={(c) => setValue("canalIntegracao", c)}
              />
            </div>
            {canal === "AMBOS" && (
              <div className="mt-3 flex items-center gap-2 rounded-lg border border-purple-500/30 bg-purple-500/10 px-3 py-2 text-xs text-purple-400">
                <Sparkles className="h-3.5 w-3.5 flex-shrink-0" />
                Ambos os canais ativados — o agente responderá no Unnichat e no ManyChat simultaneamente.
              </div>
            )}
          </SectionCard>
        )}

        {/* ── Seção 5: Documentos ── */}
        {tipoAtuacao !== "" && (
          <SectionCard icon={<FileText className="h-4 w-4 text-yellow-400" />} title="Documentos de Treinamento">
            <FileUpload files={files} onChange={setFiles} progress={progress} />
          </SectionCard>
        )}

        {/* ── Seção 6: Vendedores ── */}
        {tipoAtuacao !== "" && (
          <SectionCard icon={<Users className="h-4 w-4 text-pink-400" />} title="Vendedores Atribuídos">
            <div className="flex gap-4">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="radio"
                  className="accent-primary"
                  checked={todosVendedores === true}
                  onChange={() => setValue("todosVendedores", true)}
                />
                <span>Todos os vendedores (incluindo futuros)</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-white/50">
                <input
                  type="radio"
                  className="accent-primary"
                  checked={todosVendedores === false}
                  onChange={() => setValue("todosVendedores", false)}
                />
                <span>Selecionar individualmente</span>
              </label>
            </div>
            {todosVendedores === false && (
              <p className="mt-2 text-xs text-white/40">Configure os vendedores após criar o agente na tela de edição.</p>
            )}
          </SectionCard>
        )}

        {/* Botão salvar */}
        {tipoAtuacao !== "" && (
          <div className="flex items-center justify-end gap-3 pb-6">
            <Button type="button" variant="outline" onClick={() => navigate("/agentes")}>
              Cancelar
            </Button>
            <Button disabled={isSubmitting || mutation.isPending} className="gap-2 px-8 bg-orange-600 hover:bg-orange-500">
              <RefreshCw className="h-4 w-4" />
              {mutation.isPending ? "Criando agente..." : "Criar Agente de Recuperação"}
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}

// ── componente de seção ───────────────────────────────────────────────────────

function SectionCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-surface">
      <div className="flex items-center gap-2.5 border-b border-white/10 bg-white/5 px-5 py-3">
        {icon}
        <h2 className="text-sm font-semibold text-white/80">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}
