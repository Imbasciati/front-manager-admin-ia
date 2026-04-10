import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  Bot,
  Brain,
  Briefcase,
  ChevronDown,
  ChevronUp,
  Copy,
  Info,
  Loader2,
  MessageCircle,
  MessageSquare,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Zap,
} from "lucide-react";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Button } from "../components/ui/button";
import { agentesService } from "../services/agentes.service";
import { ProviderModelSelect } from "../components/shared/ProviderModelSelect";
import { conexaoUnnichatService } from "../services/conexao-unnichat.service";
import { firepayService } from "../services/firepay.service";

// ── tipos ─────────────────────────────────────────────────────────────────────

type Canal = "NENHUM" | "UNNICHAT" | "MANYCHAT" | "AMBOS";

interface ProdutoVariado {
  nome: string;
  descricao: string;
  linkVendas: string;
  valorProduto: string;
  valorParcelado: string;
  formasPagamento: string;
  checkoutIdFirepay: string;
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

const ATUACOES = ["Vendas", "Recuperação", "Outros"] as const;

const schema = z.object({
  nome: z.string().min(3, "Nome obrigatório"),
  promptSistema: z.string().min(20, "Prompt obrigatório"),
  contextoProdutos: z.string().optional(),
  tom: z.enum(["PROFISSIONAL", "CASUAL", "FORMAL", "AMIGAVEL"]),
  modelo: z.string().min(2, "Modelo obrigatório"),
  temperatura: z.coerce.number().min(0).max(2),
  tokensMaximos: z.coerce.number().int().min(50),
  canalIntegracao: z.enum(["NENHUM", "UNNICHAT", "MANYCHAT", "AMBOS"]).default("NENHUM"),
  unnichatAtivo: z.boolean().optional(),
  conexaoUnnichatId: z.string().optional().nullable(),
  produto: z.string().optional(),
  atuacao: z.string().optional(),
});
type Values = z.infer<typeof schema>;

// ── helpers temperatura ────────────────────────────────────────────────────────

function tempInfo(t: number) {
  if (t <= 0.3) return { label: "Muito Consistente", desc: "Respostas previsíveis e precisas. Ideal para FAQs e atendimento padronizado.", cor: "text-blue-400" };
  if (t <= 0.6) return { label: "Consistente",       desc: "Bom equilíbrio entre precisão e leveza. Recomendado para vendas.",           cor: "text-cyan-400" };
  if (t <= 1.0) return { label: "Balanceado",         desc: "Respostas variadas mantendo coerência. Bom para conversas naturais.",        cor: "text-green-400" };
  if (t <= 1.4) return { label: "Criativo",           desc: "Respostas mais diversas e exploratórias. Pode variar entre conversas.",      cor: "text-yellow-400" };
  return { label: "Muito Criativo", desc: "Alta variação nas respostas. Use com cuidado em atendimento profissional.", cor: "text-orange-400" };
}

// ── seção expandida Unnichat ──────────────────────────────────────────────────

function UnnichatExpandido({
  register,
  watch,
  setValue,
  webhookUrl,
  webhookCopied,
  copiarWebhook,
  guia,
  setGuia,
}: {
  register: ReturnType<typeof useForm<Values>>["register"];
  watch: ReturnType<typeof useForm<Values>>["watch"];
  setValue: ReturnType<typeof useForm<Values>>["setValue"];
  webhookUrl: string;
  webhookCopied: boolean;
  copiarWebhook: () => void;
  guia: boolean;
  setGuia: (v: boolean) => void;
}) {
  const { data: conexoes = [] } = useQuery({
    queryKey: ["conexoes-unnichat"],
    queryFn: conexaoUnnichatService.list,
  });

  const conexaoSelecionada = watch("conexaoUnnichatId");

  return (
    <div className="space-y-3 border-t border-green-500/20 px-4 pb-4 pt-3">
      <div className="flex items-center gap-2">
        <input type="checkbox" id="unnichat-ativo" {...register("unnichatAtivo")} className="h-4 w-4 accent-primary" />
        <label htmlFor="unnichat-ativo" className="text-sm">Ativar recebimento de mensagens</label>
      </div>

      <div>
        <label className="mb-1 block text-xs text-white/50">Conexão Unnichat</label>
        {conexoes.length === 0 ? (
          <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-400">
            Nenhuma conexão disponível. Configure em{" "}
            <strong>Configurações → Unnichat</strong>.
          </div>
        ) : (
          <select
            className="h-10 w-full rounded-md border border-white/20 bg-surface px-3 text-sm"
            value={conexaoSelecionada ?? ""}
            onChange={(e) => setValue("conexaoUnnichatId", e.target.value || null)}
          >
            <option value="">Selecione a conexão...</option>
            {conexoes.map((c) => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>
        )}
      </div>

      <div>
        <label className="mb-1 block text-xs text-white/50">URL do Webhook (configure no Unnichat)</label>
        <div className="flex gap-2">
          <input readOnly value={webhookUrl} className="h-10 flex-1 rounded-md border border-white/20 bg-white/5 px-3 font-mono text-xs text-white/70" />
          <button type="button" onClick={copiarWebhook} className="flex h-10 items-center gap-1.5 rounded-md border border-white/20 bg-white/5 px-3 text-xs text-white/60 hover:text-white">
            <Copy className="h-3.5 w-3.5" />
            {webhookCopied ? "Copiado!" : "Copiar"}
          </button>
        </div>
      </div>

      <button type="button" onClick={() => setGuia(!guia)} className="flex items-center gap-1.5 text-xs text-green-400/70 hover:text-green-400">
        {guia ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        Como configurar no Unnichat?
      </button>
      {guia && (
        <div className="rounded-lg bg-white/5 p-3 text-xs text-white/60 space-y-1">
          <ol className="list-inside list-decimal space-y-1">
            <li>Crie ou selecione uma conexão em <strong className="text-white">Configurações → Unnichat</strong></li>
            <li>Selecione a conexão no campo acima</li>
            <li>Copie a <strong className="text-white">URL do Webhook</strong> e configure no painel do Unnichat</li>
            <li>Ative o recebimento e salve o agente</li>
          </ol>
        </div>
      )}
    </div>
  );
}

// ── página ────────────────────────────────────────────────────────────────────

export function EditarAgente() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [webhookCopied, setWebhookCopied] = useState(false);
  const [guiaUnnichat, setGuiaUnnichat] = useState(false);
  const [guiaManyChat, setGuiaManyChat] = useState(false);
  const [produtoOpcao, setProdutoOpcao] = useState("");
  const [atuacaoOpcao, setAtuacaoOpcao] = useState("");
  const [produtosVariados, setProdutosVariados] = useState<ProdutoVariado[]>([
    { nome: "", descricao: "", linkVendas: "", valorProduto: "", valorParcelado: "", formasPagamento: "", checkoutIdFirepay: "" },
  ]);
  const [fetchingFirepay, setFetchingFirepay] = useState<Record<number, boolean>>({});

  const { data: agente } = useQuery({
    queryKey: ["agente", id],
    queryFn: () => agentesService.get(id as string),
    enabled: Boolean(id),
  });

  const { register, reset, handleSubmit, watch, setValue, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(schema),
  });

  const isProdutosVariados = agente?.produto === "PRODUTOS_VARIADOS";

  useEffect(() => {
    if (agente) {
      reset(agente as Values);
      // Pré-popula dropdowns de produto e atuação
      if (agente.produto && agente.produto !== "PRODUTOS_VARIADOS") {
        const isPredefinedProduto = (PRODUTOS as readonly string[]).slice(0, -1).includes(agente.produto);
        setProdutoOpcao(isPredefinedProduto ? agente.produto : "Outros");
      }
      if (agente.atuacao) {
        const isPredefinedAtuacao = (ATUACOES as readonly string[]).slice(0, -1).includes(agente.atuacao);
        setAtuacaoOpcao(isPredefinedAtuacao ? agente.atuacao : "Outros");
      }
      // Pré-popula lista de produtos variados
      if (agente.produto === "PRODUTOS_VARIADOS" && agente.contextoProdutos) {
        try {
          const parsed = JSON.parse(agente.contextoProdutos) as ProdutoVariado[];
          if (Array.isArray(parsed) && parsed.length > 0) {
            setProdutosVariados(parsed.map((p) => ({
              nome: p.nome ?? "",
              descricao: p.descricao ?? "",
              linkVendas: p.linkVendas ?? "",
              valorProduto: p.valorProduto ?? "",
              valorParcelado: p.valorParcelado ?? "",
              formasPagamento: p.formasPagamento ?? "",
              checkoutIdFirepay: p.checkoutIdFirepay ?? "",
            })));
          }
        } catch {
          // contextoProdutos malformado — mantém estado inicial
        }
      }
    }
  }, [agente, reset]);

  const mutation = useMutation({
    mutationFn: (values: Values) => agentesService.update(id as string, values),
    onSuccess: () => toast.success("Agente atualizado com sucesso!"),
    onError: (error: unknown) => {
      const msg =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Erro ao salvar. Verifique os dados e tente novamente.";
      toast.error(msg);
    },
  });

  function updateProduto(index: number, field: keyof ProdutoVariado, value: string) {
    setProdutosVariados((prev) => prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)));
  }

  function addProduto() {
    setProdutosVariados((prev) => [...prev, { nome: "", descricao: "", linkVendas: "", valorProduto: "", valorParcelado: "", formasPagamento: "", checkoutIdFirepay: "" }]);
  }

  function removeProduto(index: number) {
    setProdutosVariados((prev) => prev.filter((_, i) => i !== index));
  }

  async function buscarDadosFirepay(index: number) {
    const id = produtosVariados[index].checkoutIdFirepay.trim();
    if (!id) { toast.error("Informe o ID de Checkout FirePay primeiro"); return; }
    setFetchingFirepay((prev) => ({ ...prev, [index]: true }));
    try {
      const dados = await firepayService.getCheckout(id);
      const link = dados.link ?? "";
      const valor = dados.formatted_product_price ?? dados.formatted_price ?? (dados.product_price ? `R$ ${dados.product_price}` : "");
      setProdutosVariados((prev) =>
        prev.map((p, i) =>
          i === index
            ? { ...p, ...(link ? { linkVendas: link } : {}), ...(valor ? { valorProduto: valor } : {}) }
            : p,
        ),
      );
      toast.success("Dados importados da FirePay!");
    } catch {
      toast.error("Não foi possível buscar os dados. Verifique o ID e a API Key configurada.");
    } finally {
      setFetchingFirepay((prev) => ({ ...prev, [index]: false }));
    }
  }

  const temperatura = Number(watch("temperatura") ?? 0.7);
  const modelo = watch("modelo");
  const canal = (watch("canalIntegracao") ?? "NENHUM") as Canal;
  const info = tempInfo(temperatura);

  function handleProdutoChange(val: string) {
    setProdutoOpcao(val);
    if (val !== "Outros") setValue("produto", val);
    else setValue("produto", "");
  }

  function handleAtuacaoChange(val: string) {
    setAtuacaoOpcao(val);
    if (val !== "Outros") setValue("atuacao", val);
    else setValue("atuacao", "");
  }

  const webhookUrl = `${import.meta.env.VITE_API_URL ?? "http://localhost:3001/api"}/webhook/unnichat/${id}`;

  const mostrarUnnichat = canal === "UNNICHAT" || canal === "AMBOS";
  const mostrarManyChat = canal === "MANYCHAT" || canal === "AMBOS";

  function copiarWebhook() {
    navigator.clipboard.writeText(webhookUrl).then(() => {
      setWebhookCopied(true);
      setTimeout(() => setWebhookCopied(false), 2000);
    });
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
          <h1 className="text-xl font-bold text-white">Editar Agente</h1>
          <p className="text-sm text-white/50">Atualize parâmetros, modelo e integrações</p>
        </div>
      </div>

      <form
        className="space-y-4"
        onSubmit={handleSubmit((values) => {
          if (isProdutosVariados) {
            const validos = produtosVariados.filter((p) => p.nome.trim());
            if (validos.length === 0) {
              toast.error("Adicione pelo menos um produto com nome");
              return;
            }
            values.contextoProdutos = JSON.stringify(produtosVariados);
          }
          mutation.mutate(values);
        })}
      >

        {/* ── Seção 1: Identidade ── */}
        <SectionCard icon={<Bot className="h-4 w-4 text-primary" />} title="Identidade do Agente">
          <div className="space-y-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-white/60">Nome do Agente</label>
              <Input placeholder="Ex: Agente de Vendas Premium" {...register("nome")} />
              {errors.nome && <p className="mt-1 text-xs text-red-400">{errors.nome.message}</p>}
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-white/60">Prompt do Sistema / Instruções</label>
              <Textarea rows={5} placeholder="Descreva o comportamento e personalidade do agente..." {...register("promptSistema")} />
              <p className="mt-1 text-[11px] text-white/30">Instruções gerais de como o agente deve se comportar.</p>
              {errors.promptSistema && <p className="mt-1 text-xs text-red-400">{errors.promptSistema.message}</p>}
            </div>
            {isProdutosVariados ? (
              <div>
                <label className="mb-3 block text-xs font-medium text-white/60">Produtos / Serviços</label>
                <div className="space-y-3">
                  {produtosVariados.map((produto, index) => (
                    <div key={index} className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
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

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-xs text-white/50">Valor do Produto</label>
                          <Input
                            placeholder="Ex: R$ 997,00"
                            value={produto.valorProduto}
                            onChange={(e) => updateProduto(index, "valorProduto", e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs text-white/50">Valor Parcelado</label>
                          <Input
                            placeholder="Ex: 12x de R$ 97,00"
                            value={produto.valorParcelado}
                            onChange={(e) => updateProduto(index, "valorParcelado", e.target.value)}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="mb-1 block text-xs text-white/50">Formas de Pagamento</label>
                        <Input
                          placeholder="Ex: Cartão de crédito, PIX, boleto..."
                          value={produto.formasPagamento}
                          onChange={(e) => updateProduto(index, "formasPagamento", e.target.value)}
                        />
                      </div>

                      <div>
                        <label className="mb-1 flex items-center gap-1.5 text-xs text-white/50">
                          ID de Checkout FirePay
                          <span className="group relative">
                            <Info className="h-3.5 w-3.5 cursor-help text-white/30 hover:text-white/60" />
                            <span className="pointer-events-none absolute bottom-full left-1/2 mb-2 hidden w-64 -translate-x-1/2 rounded-lg bg-black/90 px-3 py-2 text-[11px] text-white/80 shadow-xl group-hover:block">
                              ID do checkout da FirePay. Clique em "Buscar dados" para importar o link e valor automaticamente.
                            </span>
                          </span>
                        </label>
                        <div className="flex gap-2">
                          <Input
                            placeholder="Ex: 1816"
                            value={produto.checkoutIdFirepay}
                            onChange={(e) => updateProduto(index, "checkoutIdFirepay", e.target.value)}
                          />
                          <button
                            type="button"
                            onClick={() => buscarDadosFirepay(index)}
                            disabled={fetchingFirepay[index]}
                            className="flex shrink-0 items-center gap-1.5 rounded-md border border-orange-500/30 bg-orange-500/10 px-3 text-xs font-medium text-orange-400 transition hover:border-orange-500/50 hover:bg-orange-500/20 disabled:opacity-50"
                          >
                            {fetchingFirepay[index] ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Search className="h-3.5 w-3.5" />
                            )}
                            Buscar dados
                          </button>
                        </div>
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
            ) : (
              <div>
                <label className="mb-1.5 block text-xs font-medium text-white/60">Contexto de Produtos/Serviços</label>
                <Textarea rows={4} placeholder="Descreva seus produtos, preços, condições..." {...register("contextoProdutos")} />
                <p className="mt-1 text-[11px] text-white/30">Informações sobre produtos e serviços que o agente usará nas respostas.</p>
              </div>
            )}
          </div>
        </SectionCard>

        {/* ── Seção 2: Modelo de IA ── */}
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

          {/* Temperatura */}
          <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <label className="text-xs font-medium text-white/60">Temperatura</label>
                <p className={`text-sm font-bold ${info.cor}`}>{info.label}</p>
              </div>
              <span className={`rounded-lg px-3 py-1 font-mono text-lg font-bold ${info.cor} bg-white/5 ring-1 ring-current/20`}>
                {temperatura.toFixed(1)}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              {...register("temperatura")}
              className="h-2 w-full cursor-pointer accent-primary"
              style={{
                background: `linear-gradient(to right, #3b82f6 0%, #22c55e ${(temperatura / 2) * 50}%, #f59e0b ${(temperatura / 2) * 100}%, #374151 ${(temperatura / 2) * 100}%, #374151 100%)`
              }}
            />
            <div className="mt-1 flex justify-between text-[10px] text-white/30">
              <span>0.0 — Preciso</span>
              <span>1.0 — Balanceado</span>
              <span>2.0 — Criativo</span>
            </div>
            <p className="mt-3 text-xs text-white/50">{info.desc}</p>
          </div>
        </SectionCard>

        {/* ── Seção 3: Produto & Atuação ── */}
        <SectionCard icon={<Briefcase className="h-4 w-4 text-amber-400" />} title="Produto & Atuação">
          <p className="mb-4 text-xs text-white/50">Defina qual produto este agente representa e qual o tipo de atuação no atendimento.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Produto */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-white/60">Produto</label>
              {isProdutosVariados ? (
                <div className="flex h-10 items-center rounded-md border border-orange-500/30 bg-orange-500/10 px-3 text-sm text-orange-300">
                  Produtos Variados
                </div>
              ) : (
                <>
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
                    <Input
                      className="mt-2"
                      placeholder="Descreva o produto personalizado..."
                      {...register("produto")}
                    />
                  )}
                </>
              )}
            </div>
            {/* Atuação */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-white/60">Atuação</label>
              {isProdutosVariados ? (
                <div className="flex h-10 items-center rounded-md border border-orange-500/30 bg-orange-500/10 px-3 text-sm text-orange-300">
                  Recuperação
                </div>
              ) : (
                <>
                  <select
                    className="h-10 w-full rounded-md border border-white/20 bg-surface px-3 text-sm"
                    value={atuacaoOpcao}
                    onChange={(e) => handleAtuacaoChange(e.target.value)}
                  >
                    <option value="">Selecione a atuação...</option>
                    {ATUACOES.map((a) => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                  {atuacaoOpcao === "Outros" && (
                    <Input
                      className="mt-2"
                      placeholder="Descreva a atuação personalizada..."
                      {...register("atuacao")}
                    />
                  )}
                </>
              )}
            </div>
          </div>
        </SectionCard>

        {/* ── Seção 4: Canal de Integração ── */}
        <SectionCard icon={<MessageSquare className="h-4 w-4 text-cyan-400" />} title="Canal de Integração">
          <p className="mb-3 text-xs text-white/50">Selecione por qual plataforma este agente vai atender. Você pode ativar um ou ambos.</p>

          <div className="space-y-3">
            {/* Unnichat */}
            <div className={`rounded-xl border-2 transition-all duration-200 ${mostrarUnnichat ? "border-green-500/60 bg-green-500/10" : "border-white/10 bg-white/5 hover:border-white/20"}`}>
              <button
                type="button"
                className="flex w-full items-center gap-4 p-4 text-left"
                onClick={() => {
                  if (canal === "NENHUM") setValue("canalIntegracao", "UNNICHAT");
                  else if (canal === "UNNICHAT") setValue("canalIntegracao", "NENHUM");
                  else if (canal === "MANYCHAT") setValue("canalIntegracao", "AMBOS");
                  else setValue("canalIntegracao", "MANYCHAT");
                }}
              >
                <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl ${mostrarUnnichat ? "bg-green-500/20" : "bg-white/5"}`}>
                  <Zap className={`h-6 w-6 ${mostrarUnnichat ? "text-green-400" : "text-white/40"}`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className={`font-semibold ${mostrarUnnichat ? "text-green-400" : "text-white/70"}`}>Unnichat</p>
                    <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${mostrarUnnichat ? "bg-green-500/20 text-green-400" : "bg-white/10 text-white/40"}`}>WhatsApp</span>
                  </div>
                  <p className="mt-0.5 text-xs text-white/50">Conecte ao WhatsApp via Unnichat e responda clientes automaticamente</p>
                </div>
                <div className={`h-5 w-5 flex-shrink-0 rounded-full border-2 ${mostrarUnnichat ? "border-green-400 bg-green-400" : "border-white/30"}`} />
              </button>

              {mostrarUnnichat && (
                <UnnichatExpandido
                  register={register}
                  watch={watch}
                  setValue={setValue}
                  webhookUrl={webhookUrl}
                  webhookCopied={webhookCopied}
                  copiarWebhook={copiarWebhook}
                  guia={guiaUnnichat}
                  setGuia={setGuiaUnnichat}
                />
              )}
            </div>

            {/* ManyChat */}
            <div className={`rounded-xl border-2 transition-all duration-200 ${mostrarManyChat ? "border-blue-500/60 bg-blue-500/10" : "border-white/10 bg-white/5 hover:border-white/20"}`}>
              <button
                type="button"
                className="flex w-full items-center gap-4 p-4 text-left"
                onClick={() => {
                  if (canal === "NENHUM") setValue("canalIntegracao", "MANYCHAT");
                  else if (canal === "MANYCHAT") setValue("canalIntegracao", "NENHUM");
                  else if (canal === "UNNICHAT") setValue("canalIntegracao", "AMBOS");
                  else setValue("canalIntegracao", "UNNICHAT");
                }}
              >
                <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl ${mostrarManyChat ? "bg-blue-500/20" : "bg-white/5"}`}>
                  <MessageCircle className={`h-6 w-6 ${mostrarManyChat ? "text-blue-400" : "text-white/40"}`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className={`font-semibold ${mostrarManyChat ? "text-blue-400" : "text-white/70"}`}>ManyChat</p>
                    <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${mostrarManyChat ? "bg-blue-500/20 text-blue-400" : "bg-white/10 text-white/40"}`}>Instagram / Messenger</span>
                  </div>
                  <p className="mt-0.5 text-xs text-white/50">Integre com fluxos do ManyChat para responder automaticamente</p>
                </div>
                <div className={`h-5 w-5 flex-shrink-0 rounded-full border-2 ${mostrarManyChat ? "border-blue-400 bg-blue-400" : "border-white/30"}`} />
              </button>

              {mostrarManyChat && (
                <div className="space-y-3 border-t border-blue-500/20 px-4 pb-4 pt-3">
                  <div className="rounded-lg bg-blue-500/5 p-3 text-xs text-white/60">
                    <p className="mb-1 font-semibold text-white/80">Configuração via painel global</p>
                    <p>Configure Token e IDs em <strong className="text-blue-400">Configurações → Agente IA</strong></p>
                  </div>
                  <button type="button" onClick={() => setGuiaManyChat(!guiaManyChat)} className="flex items-center gap-1.5 text-xs text-blue-400/70 hover:text-blue-400">
                    {guiaManyChat ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    Como configurar o ManyChat?
                  </button>
                  {guiaManyChat && (
                    <div className="rounded-lg bg-white/5 p-3 text-xs text-white/60 space-y-1">
                      <ol className="list-inside list-decimal space-y-1">
                        <li>Acesse <strong className="text-white">Configurações → Agente IA</strong> no painel</li>
                        <li>Configure o <strong className="text-white">Token do ManyChat</strong></li>
                        <li>Preencha os <strong className="text-white">IDs dos campos customizados</strong></li>
                        <li>No ManyChat, configure o fluxo para enviar ao webhook</li>
                      </ol>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {canal === "AMBOS" && (
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-purple-500/30 bg-purple-500/10 px-3 py-2 text-xs text-purple-400">
              <Sparkles className="h-3.5 w-3.5 flex-shrink-0" />
              Ambos os canais ativados — o agente responderá no Unnichat e no ManyChat simultaneamente.
            </div>
          )}
        </SectionCard>

        {/* Botões */}
        <div className="flex items-center justify-end gap-3 pb-6">
          <Button type="button" variant="outline" onClick={() => navigate("/agentes")}>
            Cancelar
          </Button>
          <Button disabled={mutation.isPending} className="px-8">
            {mutation.isPending ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </div>
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
