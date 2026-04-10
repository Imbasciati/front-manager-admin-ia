import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Save,
  ShoppingCart,
  Trash2,
  Wifi,
  XCircle,
} from "lucide-react";
import { PageHeader } from "../../components/shared/PageHeader";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { firepayService } from "../../services/firepay.service";

export function ConfigFirepay() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [apiKey, setApiKey] = useState("");
  const [mostrar, setMostrar] = useState(false);
  const [testeResult, setTesteResult] = useState<"ok" | "erro" | null>(null);

  const { data: config, isLoading } = useQuery({
    queryKey: ["firepay-config"],
    queryFn: firepayService.getConfig,
  });

  const saveMutation = useMutation({
    mutationFn: () => firepayService.saveApiKey(apiKey),
    onSuccess: () => {
      toast.success("API Key da FirePay salva com sucesso!");
      setApiKey("");
      void queryClient.invalidateQueries({ queryKey: ["firepay-config"] });
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Erro ao salvar a API Key";
      toast.error(msg);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: firepayService.deleteApiKey,
    onSuccess: () => {
      toast.success("API Key removida");
      setTesteResult(null);
      void queryClient.invalidateQueries({ queryKey: ["firepay-config"] });
    },
  });

  const testeMutation = useMutation({
    mutationFn: firepayService.testar,
    onSuccess: () => {
      setTesteResult("ok");
      toast.success("Conexão com a FirePay estabelecida com sucesso!");
    },
    onError: (err: unknown) => {
      setTesteResult("erro");
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Falha ao conectar à API da FirePay";
      toast.error(msg);
    },
  });

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate("/configuracoes")}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/60 transition hover:border-white/30 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <PageHeader
          title="FirePay"
          subtitle="Configure a integração com a plataforma de checkouts FirePay"
        />
      </div>

      {/* Status */}
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-surface">
        <div className="flex items-center gap-2.5 border-b border-white/10 bg-white/5 px-5 py-3">
          <ShoppingCart className="h-4 w-4 text-orange-400" />
          <h2 className="text-sm font-semibold text-white/80">Chave de API</h2>
        </div>

        <div className="p-5 space-y-5">
          {/* Status atual */}
          {!isLoading && (
            <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${
              config?.configurado
                ? "border-green-500/30 bg-green-500/10"
                : "border-white/10 bg-white/5"
            }`}>
              {config?.configurado ? (
                <>
                  <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-green-400" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-green-400">API Key configurada</p>
                    <p className="mt-0.5 font-mono text-xs text-white/40 truncate">
                      {config.apiKeyMascarada}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => testeMutation.mutate()}
                      disabled={testeMutation.isPending}
                      className="gap-1.5 text-white/50 hover:bg-white/10 hover:text-white"
                    >
                      {testeMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Wifi className="h-4 w-4" />
                      )}
                      Testar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteMutation.mutate()}
                      disabled={deleteMutation.isPending}
                      className="text-red-400/70 hover:bg-red-500/10 hover:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 flex-shrink-0 text-white/30" />
                  <p className="text-sm text-white/40">Nenhuma API Key configurada</p>
                </>
              )}
            </div>
          )}

          {/* Resultado do teste */}
          {testeResult && (
            <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${
              testeResult === "ok"
                ? "border-green-500/30 bg-green-500/10"
                : "border-red-500/30 bg-red-500/10"
            }`}>
              {testeResult === "ok" ? (
                <>
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-green-400" />
                  <p className="text-sm text-green-400">Conexão estabelecida — a API Key está válida e funcionando.</p>
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 shrink-0 text-red-400" />
                  <p className="text-sm text-red-400">Falha na conexão — verifique se a API Key é válida.</p>
                </>
              )}
            </div>
          )}

          {/* Formulário */}
          <div className="space-y-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-white/60">
                {config?.configurado ? "Substituir API Key" : "API Key da FirePay"}
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type={mostrar ? "text" : "password"}
                    placeholder="eyJ0eXAiOiJKV1QiLCJhbGciO..."
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="pr-10 font-mono text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrar((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
                  >
                    {mostrar ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <Button
                  onClick={() => saveMutation.mutate()}
                  disabled={!apiKey.trim() || saveMutation.isPending}
                  className="gap-2 shrink-0"
                >
                  <Save className="h-4 w-4" />
                  {saveMutation.isPending ? "Salvando..." : "Salvar"}
                </Button>
              </div>
              <p className="mt-1.5 text-[11px] text-white/30">
                Acesse o painel FirePay → Configurações → Chaves de API para gerar sua chave.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Como usar */}
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-surface">
        <div className="flex items-center gap-2.5 border-b border-white/10 bg-white/5 px-5 py-3">
          <ShoppingCart className="h-4 w-4 text-white/40" />
          <h2 className="text-sm font-semibold text-white/80">Como funciona</h2>
        </div>
        <div className="p-5 space-y-3 text-sm text-white/55">
          <p>
            Com a API Key configurada, ao cadastrar produtos nos{" "}
            <strong className="text-white/80">Agentes de Recuperação com Produtos Variados</strong>,
            o botão{" "}
            <span className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-xs text-white/70">
              Verificar
            </span>{" "}
            valida se o ID de Checkout da FirePay existe e informa o número de transações nos últimos 30 dias.
          </p>
          <ul className="space-y-1.5 pl-4">
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-400" />
              <span><strong className="text-white/80">Verificação de ID</strong> — confirma que o checkout existe na FirePay</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-400" />
              <span><strong className="text-white/80">Contagem de transações</strong> — mostra quantas vendas ocorreram nos últimos 30 dias</span>
            </li>
          </ul>
          <p className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 px-3 py-2 text-xs text-yellow-400/80">
            A API pública da FirePay não expõe link de checkout nem preço por produto — esses campos devem ser preenchidos manualmente.
          </p>
          <p className="text-xs text-white/35">
            Base URL da API: <span className="font-mono">https://admin.firepay.com.br</span>
          </p>
        </div>
      </div>
    </div>
  );
}
