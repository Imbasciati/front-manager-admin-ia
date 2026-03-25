import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { modelosService } from "../../services/configuracoes.service";
import type { ModeloIA } from "../../types/configuracoes";

const PROVIDERS: { id: string; label: string; cor: string; ring: string; bg: string }[] = [
  { id: "openai",    label: "GPT (OpenAI)",      cor: "#34d399", ring: "ring-emerald-500/60", bg: "bg-emerald-500/10" },
  { id: "anthropic", label: "Claude (Anthropic)", cor: "#fb923c", ring: "ring-orange-500/60",  bg: "bg-orange-500/10"  },
  { id: "google",    label: "Gemini (Google)",    cor: "#60a5fa", ring: "ring-blue-500/60",    bg: "bg-blue-500/10"    },
];

interface Props {
  value: string;
  onChange: (modelId: string) => void;
}

export function ProviderModelSelect({ value, onChange }: Props) {
  const { data: modelos } = useQuery({
    queryKey: ["modelos", "ativos"],
    queryFn: () => modelosService.list({ ativo: true }),
    select: (r) => (r.data ?? []) as ModeloIA[],
  });

  // Descobre o provedor atual a partir do modelo selecionado
  const provedorAtual =
    modelos?.find((m) => m.modelId === value)?.provider ?? "openai";

  const [providerSel, setProviderSel] = useState(provedorAtual);

  // Sincroniza quando os modelos carregam ou o valor externo muda
  useEffect(() => {
    if (modelos && value) {
      const found = modelos.find((m) => m.modelId === value);
      if (found) setProviderSel(found.provider);
    }
  }, [modelos, value]);

  const modelosFiltrados = (modelos ?? []).filter((m) => m.provider === providerSel);
  const provConfig = PROVIDERS.find((p) => p.id === providerSel) ?? PROVIDERS[0];

  function handleProviderChange(pId: string) {
    setProviderSel(pId);
    const primeiroModelo = (modelos ?? []).find((m) => m.provider === pId);
    if (primeiroModelo) onChange(primeiroModelo.modelId);
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {/* Dropdown Provedor */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-white/60">Provedor</label>
        <div
          className={`rounded-lg ring-2 transition-all ${provConfig.ring} ${provConfig.bg}`}
        >
          <select
            value={providerSel}
            onChange={(e) => handleProviderChange(e.target.value)}
            className="h-10 w-full rounded-lg bg-transparent px-3 text-sm font-semibold focus:outline-none"
            style={{ color: provConfig.cor }}
          >
            {PROVIDERS.map((p) => (
              <option key={p.id} value={p.id} className="bg-gray-900 text-white">
                {p.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Dropdown Modelo */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-white/60">Modelo</label>
        <div
          className={`rounded-lg ring-2 transition-all ${provConfig.ring} ${provConfig.bg}`}
        >
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="h-10 w-full rounded-lg bg-transparent px-3 text-sm font-semibold focus:outline-none"
            style={{ color: provConfig.cor }}
          >
            {modelosFiltrados.length > 0 ? (
              modelosFiltrados.map((m) => (
                <option key={m.id} value={m.modelId} className="bg-gray-900 text-white font-normal">
                  {m.nome}
                </option>
              ))
            ) : (
              <option value={value} className="bg-gray-900 text-white">
                {value}
              </option>
            )}
          </select>
        </div>
      </div>
    </div>
  );
}
