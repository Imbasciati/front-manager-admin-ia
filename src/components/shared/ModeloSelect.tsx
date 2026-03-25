import { useQuery } from "@tanstack/react-query";
import type { UseFormRegisterReturn } from "react-hook-form";
import { modelosService } from "../../services/configuracoes.service";
import type { ModeloIA } from "../../types/configuracoes";

const PROVIDER_LABELS: Record<string, string> = {
  openai: "GPT (OpenAI)",
  anthropic: "Anthropic (Claude)",
  google: "Gemini (Google)",
};

function groupByProvider(modelos: ModeloIA[]) {
  const groups: Record<string, ModeloIA[]> = {};
  for (const m of modelos) {
    if (!groups[m.provider]) groups[m.provider] = [];
    groups[m.provider].push(m);
  }
  return groups;
}

interface ModeloSelectProps {
  registration: UseFormRegisterReturn;
}

export function ModeloSelect({ registration }: ModeloSelectProps) {
  const { data: modelos } = useQuery({
    queryKey: ["modelos", "ativos"],
    queryFn: () => modelosService.list({ ativo: true }),
    select: (r) => r.data ?? [],
  });

  const groups = groupByProvider(modelos ?? []);
  const providers = Object.keys(groups);

  return (
    <select
      {...registration}
      className="h-10 w-full rounded-md border border-white/20 bg-surface px-3 text-sm"
    >
      {providers.length > 0 ? (
        providers.map((provider) => (
          <optgroup key={provider} label={PROVIDER_LABELS[provider] ?? provider}>
            {groups[provider].map((m) => (
              <option key={m.id} value={m.modelId}>
                {m.nome}
              </option>
            ))}
          </optgroup>
        ))
      ) : (
        <>
          <optgroup label="GPT (OpenAI)">
            <option value="gpt-4o">GPT-4o</option>
            <option value="gpt-4o-mini">GPT-4o mini</option>
          </optgroup>
          <optgroup label="Anthropic (Claude)">
            <option value="claude-sonnet-4-6">Claude Sonnet 4.6</option>
          </optgroup>
          <optgroup label="Gemini (Google)">
            <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
          </optgroup>
        </>
      )}
    </select>
  );
}
