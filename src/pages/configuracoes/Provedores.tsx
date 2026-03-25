import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { CheckCircle, Eye, EyeOff, Loader2, XCircle } from "lucide-react";
import { PageHeader } from "../../components/shared/PageHeader";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Card } from "../../components/ui/card";
import { provedoresService } from "../../services/configuracoes.service";
import type { ConfiguracaoProvedor, ProviderSlug } from "../../types/configuracoes";

// ── metadados dos provedores ─────────────────────────────────────────────────

const PROVEDOR_META: Record<
  ProviderSlug,
  { label: string; logo: string; placeholder: string; docsUrl: string }
> = {
  openai: {
    label: "OpenAI",
    logo: "https://upload.wikimedia.org/wikipedia/commons/4/4d/OpenAI_Logo.svg",
    placeholder: "sk-proj-••••••••••••••••••••••••",
    docsUrl: "https://platform.openai.com/api-keys",
  },
  anthropic: {
    label: "Anthropic",
    logo: "https://upload.wikimedia.org/wikipedia/commons/7/78/Anthropic_logo.svg",
    placeholder: "sk-ant-api03-••••••••••••••••••",
    docsUrl: "https://console.anthropic.com/keys",
  },
  google: {
    label: "Google Gemini",
    logo: "https://www.gstatic.com/lamda/images/gemini_sparkle_v002_d4735304ff6292a690345.svg",
    placeholder: "AIza••••••••••••••••••••••••••••••",
    docsUrl: "https://aistudio.google.com/app/apikey",
  },
};

// ── card individual de provedor ───────────────────────────────────────────────

function ProvedorCard({ config }: { config: ConfiguracaoProvedor }) {
  const queryClient = useQueryClient();
  const meta = PROVEDOR_META[config.provider];

  const [apiKey, setApiKey] = useState(config.apiKeyMascarada ?? "");
  const [mostrarKey, setMostrarKey] = useState(false);
  const [dirty, setDirty] = useState(false);

  const saveMutation = useMutation({
    mutationFn: () =>
      provedoresService.save(config.provider, { apiKey, ativo: config.ativo }),
    onSuccess: () => {
      toast.success(`${meta.label}: API Key salva com sucesso`);
      setDirty(false);
      void queryClient.invalidateQueries({ queryKey: ["provedores"] });
    },
    onError: () => {
      toast.error(`Erro ao salvar a API Key da ${meta.label}`);
    },
  });

  const testarMutation = useMutation({
    mutationFn: () => provedoresService.testar(config.provider),
    onSuccess: (res) => {
      if (res.ok) {
        toast.success(`${meta.label}: ${res.mensagem}`);
        void queryClient.invalidateQueries({ queryKey: ["provedores"] });
      } else {
        toast.error(`${meta.label}: ${res.mensagem}`);
      }
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (ativo: boolean) => provedoresService.toggle(config.provider, ativo),
    onSuccess: (_, ativo) => {
      toast.success(`${meta.label} ${ativo ? "ativado" : "desativado"}`);
      void queryClient.invalidateQueries({ queryKey: ["provedores"] });
    },
  });

  return (
    <Card className="space-y-4">
      {/* cabeçalho */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 p-1.5">
            <img src={meta.logo} alt={meta.label} className="h-full w-full object-contain" />
          </div>
          <div>
            <p className="font-semibold">{meta.label}</p>
            <div className="flex items-center gap-1.5 text-xs text-white/60">
              {config.verificado ? (
                <>
                  <CheckCircle className="h-3 w-3 text-green-400" />
                  <span className="text-green-400">Verificado</span>
                </>
              ) : config.configurado ? (
                <>
                  <XCircle className="h-3 w-3 text-yellow-400" />
                  <span className="text-yellow-400">Não testado</span>
                </>
              ) : (
                <>
                  <XCircle className="h-3 w-3 text-red-400" />
                  <span className="text-red-400">Não configurado</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {config.configurado && (
            <Button
              size="sm"
              variant="outline"
              disabled={testarMutation.isPending}
              onClick={() => testarMutation.mutate()}
            >
              {testarMutation.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                "Testar conexão"
              )}
            </Button>
          )}
          <Button
            size="sm"
            variant={config.ativo ? "secondary" : "outline"}
            disabled={!config.configurado || toggleMutation.isPending}
            onClick={() => toggleMutation.mutate(!config.ativo)}
          >
            {config.ativo ? "Desativar" : "Ativar"}
          </Button>
        </div>
      </div>

      {/* campo de API Key */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-sm text-white/70">API Key</label>
          <a
            href={meta.docsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline"
          >
            Obter API Key →
          </a>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              type={mostrarKey ? "text" : "password"}
              placeholder={meta.placeholder}
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value);
                setDirty(true);
              }}
              className="pr-10 font-mono text-sm"
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
              onClick={() => setMostrarKey((v) => !v)}
              tabIndex={-1}
            >
              {mostrarKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <Button
            disabled={!dirty || !apiKey || saveMutation.isPending}
            onClick={() => saveMutation.mutate()}
          >
            {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
          </Button>
        </div>
        {config.atualizadoEm && (
          <p className="text-xs text-white/40">
            Última atualização:{" "}
            {new Date(config.atualizadoEm).toLocaleString("pt-BR")}
          </p>
        )}
      </div>

      {/* badge status */}
      <div className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2 text-xs">
        <span
          className={`h-2 w-2 rounded-full ${
            config.ativo && config.verificado
              ? "bg-green-400"
              : config.ativo && config.configurado
              ? "bg-yellow-400"
              : "bg-red-400"
          }`}
        />
        <span className="text-white/60">
          {config.ativo && config.verificado
            ? "Provedor ativo e funcionando"
            : config.ativo && config.configurado
            ? "Configurado mas não testado — clique em \"Testar conexão\""
            : config.configurado
            ? "Provedor desativado"
            : "Configure a API Key para usar este provedor"}
        </span>
      </div>
    </Card>
  );
}

// ── página ────────────────────────────────────────────────────────────────────

export function Provedores() {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ["provedores"],
    queryFn: () => provedoresService.list(),
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Provedores de IA"
        subtitle="Configure as API Keys para cada provedor. As chaves ficam armazenadas com segurança no banco de dados."
        onBack={() => navigate("/configuracoes")}
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-1 xl:grid-cols-1">
          {(data ?? []).map((config) => (
            <ProvedorCard key={config.provider} config={config} />
          ))}
        </div>
      )}
    </div>
  );
}
