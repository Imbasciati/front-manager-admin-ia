import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  Check,
  Eye,
  EyeOff,
  ExternalLink,
  Info,
  RotateCcw,
  Save,
} from "lucide-react";
import { PageHeader } from "../../components/shared/PageHeader";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Card } from "../../components/ui/card";
import { agenteConfigService, type ConfigCampo } from "../../services/agente-config.service";

// ── fonte badge ────────────────────────────────────────────────────────────────

const FONTE_LABEL: Record<string, { label: string; color: string }> = {
  database: { label: "Banco de dados", color: "bg-green-500/20 text-green-400" },
  env:      { label: "Variável de ambiente", color: "bg-blue-500/20 text-blue-400" },
  padrao:   { label: "Padrão", color: "bg-white/10 text-white/50" },
  nao_configurado: { label: "Não configurado", color: "bg-red-500/20 text-red-400" },
};

function FonteBadge({ fonte }: { fonte: ConfigCampo["fonte"] }) {
  const { label, color } = FONTE_LABEL[fonte] ?? FONTE_LABEL.nao_configurado;
  return (
    <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${color}`}>{label}</span>
  );
}

// ── campo editável ────────────────────────────────────────────────────────────

function CampoConfig({ campo }: { campo: ConfigCampo }) {
  const queryClient = useQueryClient();
  const [valor, setValor] = useState(campo.valor);
  const [mostrar, setMostrar] = useState(false);
  const [saved, setSaved] = useState(false);

  const updateMutation = useMutation({
    mutationFn: () => agenteConfigService.update(campo.chave, valor),
    onSuccess: () => {
      toast.success(`${campo.chave} salvo com sucesso`);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      void queryClient.invalidateQueries({ queryKey: ["agente-config"] });
    },
  });

  const removeMutation = useMutation({
    mutationFn: () => agenteConfigService.remove(campo.chave),
    onSuccess: () => {
      toast.success(`${campo.chave} removido — voltando ao padrão`);
      setValor(campo.padrao ?? "");
      void queryClient.invalidateQueries({ queryKey: ["agente-config"] });
    },
  });

  const isDirty = valor !== campo.valor;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-white">{campo.chave}</label>
          <FonteBadge fonte={campo.fonte} />
        </div>
        {campo.fonte === "database" && (
          <button
            className="flex items-center gap-1 text-xs text-white/40 hover:text-red-400 transition"
            onClick={() => removeMutation.mutate()}
            disabled={removeMutation.isPending}
            title="Remover do banco e voltar ao padrão/.env"
          >
            <RotateCcw className="h-3 w-3" />
            Resetar
          </button>
        )}
      </div>
      <p className="text-xs text-white/50">{campo.descricao}</p>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            type={campo.sensivel && !mostrar ? "password" : "text"}
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            placeholder={
              campo.sensivel
                ? campo.configurado
                  ? "••••••• (configurado)"
                  : "Cole o token aqui"
                : campo.padrao
                  ? `Padrão: ${campo.padrao}`
                  : ""
            }
            className="font-mono text-sm"
          />
          {campo.sensivel && (
            <button
              type="button"
              onClick={() => setMostrar((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition"
            >
              {mostrar ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          )}
        </div>
        <Button
          size="sm"
          disabled={!isDirty || !valor || updateMutation.isPending}
          onClick={() => updateMutation.mutate()}
          className="shrink-0"
        >
          {saved ? (
            <Check className="h-3.5 w-3.5" />
          ) : (
            <Save className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>
    </div>
  );
}

// ── seção de campos ───────────────────────────────────────────────────────────

function Secao({
  titulo,
  descricao,
  campos,
}: {
  titulo: string;
  descricao: string;
  campos: ConfigCampo[];
}) {
  return (
    <Card className="space-y-5">
      <div>
        <p className="font-semibold text-white">{titulo}</p>
        <p className="mt-0.5 text-xs text-white/50">{descricao}</p>
      </div>
      <div className="space-y-4">
        {campos.map((campo) => (
          <CampoConfig key={campo.chave} campo={campo} />
        ))}
      </div>
    </Card>
  );
}

// ── página ────────────────────────────────────────────────────────────────────

const ORDEM_MANYCHAT = [
  "MANYCHAT_TOKEN",
  "MANYCHAT_FIELD_IA_INTERAGIU",
  "MANYCHAT_FIELD_RESPONSE",
  "MANYCHAT_FLOW_NS",
];
const ORDEM_COMPORTAMENTO = ["BUFFER_WINDOW_MS", "CONVERSATION_CONTEXT_WINDOW"];

export function AgenteConfig() {
  const navigate = useNavigate();
  const { data: campos, isLoading } = useQuery({
    queryKey: ["agente-config"],
    queryFn: () => agenteConfigService.list(),
  });

  const camposManychat = campos?.filter((c) => ORDEM_MANYCHAT.includes(c.chave)) ?? [];
  const camposComportamento = campos?.filter((c) => ORDEM_COMPORTAMENTO.includes(c.chave)) ?? [];

  const totalNaoConfigurado = campos?.filter((c) => c.fonte === "nao_configurado").length ?? 0;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Agente de Vendas IA"
        subtitle="Configure a integração com o ManyChat e o comportamento do agente Roberta"
        onBack={() => navigate("/configuracoes")}
      />

      {/* Aviso de campos não configurados */}
      {totalNaoConfigurado > 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-300">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            {totalNaoConfigurado} campo{totalNaoConfigurado > 1 ? "s" : ""} ainda não{" "}
            {totalNaoConfigurado > 1 ? "foram configurados" : "foi configurado"}. O agente não
            funcionará corretamente sem esses valores.
          </span>
        </div>
      )}

      {/* Nota sobre OpenAI */}
      <Card className="flex items-center gap-3 py-3">
        <Info className="h-4 w-4 shrink-0 text-primary" />
        <p className="text-sm text-white/60">
          A chave da <strong className="text-white">OpenAI</strong> é gerenciada em{" "}
          <a
            href="/configuracoes/provedores"
            className="text-primary underline-offset-2 hover:underline"
          >
            Configurações → Provedores de IA
            <ExternalLink className="ml-1 inline h-3 w-3" />
          </a>
        </p>
      </Card>

      {isLoading ? (
        <p className="text-center text-sm text-white/50">Carregando configurações...</p>
      ) : (
        <>
          <Secao
            titulo="ManyChat"
            descricao="Credenciais e IDs necessários para enviar mensagens e acionar fluxos no ManyChat"
            campos={camposManychat}
          />

          <Secao
            titulo="Comportamento do Agente"
            descricao="Ajuste o agrupamento de mensagens e o tamanho da memória de conversa"
            campos={camposComportamento}
          />
        </>
      )}
    </div>
  );
}
