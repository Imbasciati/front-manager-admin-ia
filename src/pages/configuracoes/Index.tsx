import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Bot,
  Brain,
  Key,
  MessageCircle,
  Webhook,
  Zap,
  Link2,
} from "lucide-react";

// ── tipos ─────────────────────────────────────────────────────────────────────

interface ConfigCard {
  to: string;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  titulo: string;
  categoria: string;
  descricao: string;
  badge?: string;
  badgeColor?: string;
  emBreve?: boolean;
}

// ── cards ─────────────────────────────────────────────────────────────────────

const CARDS: ConfigCard[] = [
  // Inteligência Artificial
  {
    to: "/configuracoes/provedores",
    icon: Key,
    iconColor: "text-violet-400",
    iconBg: "bg-violet-500/20",
    titulo: "Provedores de IA",
    categoria: "Inteligência Artificial",
    descricao: "Configure as chaves de API da OpenAI, Anthropic e Google. Teste a conexão e ative os provedores utilizados pelos agentes.",
  },
  {
    to: "/configuracoes/modelos",
    icon: Brain,
    iconColor: "text-blue-400",
    iconBg: "bg-blue-500/20",
    titulo: "Modelos de IA",
    categoria: "Inteligência Artificial",
    descricao: "Gerencie o catálogo de modelos disponíveis. Controle preço por token, contexto máximo e status de ativação.",
  },

  // Integrações
  {
    to: "/configuracoes/unnichat",
    icon: Zap,
    iconColor: "text-green-400",
    iconBg: "bg-green-500/20",
    titulo: "Unnichat",
    categoria: "Integração",
    descricao: "Conecte agentes ao WhatsApp via Unnichat. Gerencie API Keys, URLs de webhook e monitore conexões ativas.",
    badge: "WhatsApp",
    badgeColor: "bg-green-500/20 text-green-400",
  },
  {
    to: "/configuracoes/webhooks",
    icon: Webhook,
    iconColor: "text-orange-400",
    iconBg: "bg-orange-500/20",
    titulo: "Webhooks",
    categoria: "Integração",
    descricao: "Crie tokens para receber eventos de sistemas externos como n8n, Make e outras automações.",
  },
  {
    to: "#",
    icon: MessageCircle,
    iconColor: "text-sky-400",
    iconBg: "bg-sky-500/20",
    titulo: "ManyChat",
    categoria: "Integração",
    descricao: "Integre agentes ao Instagram e Messenger via ManyChat. Configure tokens, campos customizados e fluxos.",
    badge: "Instagram",
    badgeColor: "bg-sky-500/20 text-sky-400",
    emBreve: true,
  },
  {
    to: "#",
    icon: Link2,
    iconColor: "text-cyan-400",
    iconBg: "bg-cyan-500/20",
    titulo: "Canais",
    categoria: "Integração",
    descricao: "Conecte Telegram, e-mail e outros canais. Centralize todas as conversas dos clientes em um só lugar.",
    emBreve: true,
  },

  // Avançado
  {
    to: "/configuracoes/agente",
    icon: Bot,
    iconColor: "text-pink-400",
    iconBg: "bg-pink-500/20",
    titulo: "Agente de Vendas IA",
    categoria: "Avançado",
    descricao: "Parâmetros avançados do agente autônomo: prompts globais, integrações ManyChat e variáveis de comportamento.",
  },
];

const GRUPOS: { label: string; categoria: string }[] = [
  { label: "Inteligência Artificial", categoria: "Inteligência Artificial" },
  { label: "Integrações",             categoria: "Integração"               },
  { label: "Avançado",                categoria: "Avançado"                 },
];

// ── card ──────────────────────────────────────────────────────────────────────

function Card({ card }: { card: ConfigCard }) {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => !card.emBreve && navigate(card.to)}
      className={`flex flex-col rounded-xl border transition-all duration-200 ${
        card.emBreve
          ? "cursor-default border-white/5 bg-white/3 opacity-50"
          : "cursor-pointer border-white/10 bg-surface hover:border-white/25 hover:shadow-lg hover:shadow-black/20"
      }`}
    >
      {/* ── corpo ── */}
      <div className="flex flex-1 flex-col gap-3 p-5">

        {/* ícone + título */}
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${card.iconBg}`}>
            <card.icon className={`h-5 w-5 ${card.iconColor}`} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-semibold text-white">{card.titulo}</span>
              {card.badge && !card.emBreve && (
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${card.badgeColor}`}>
                  {card.badge}
                </span>
              )}
              {card.emBreve && (
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-white/40">
                  Em breve
                </span>
              )}
            </div>
            <p className="text-xs text-white/40">{card.categoria}</p>
          </div>
        </div>

        {/* descrição */}
        <p className="flex-1 text-sm leading-relaxed text-white/55">{card.descricao}</p>
      </div>

      {/* ── rodapé ── */}
      {!card.emBreve && (
        <div className="flex items-center justify-end border-t border-white/5 px-5 py-3">
          <span className="flex items-center gap-1 text-xs font-medium text-primary/70 transition-colors hover:text-primary">
            Configurar
            <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </div>
      )}
    </div>
  );
}

// ── página ────────────────────────────────────────────────────────────────────

export function ConfiguracoesIndex() {
  return (
    <div className="space-y-8">

      {/* cabeçalho */}
      <div>
        <h1 className="text-2xl font-bold text-white">Configurações</h1>
        <p className="mt-1 text-sm text-white/50">
          Gerencie provedores, modelos, integrações e parâmetros do sistema
        </p>
      </div>

      {/* grupos */}
      {GRUPOS.map(({ label, categoria }) => {
        const itens = CARDS.filter((c) => c.categoria === categoria);
        if (itens.length === 0) return null;
        return (
          <section key={label} className="space-y-3">
            <h2 className="text-[11px] font-semibold uppercase tracking-widest text-white/30">
              {label}
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {itens.map((card) => (
                <Card key={card.titulo} card={card} />
              ))}
            </div>
          </section>
        );
      })}

    </div>
  );
}
