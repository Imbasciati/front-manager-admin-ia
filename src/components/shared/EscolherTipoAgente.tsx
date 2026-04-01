import { RefreshCw, TrendingUp, X, Zap } from "lucide-react";
import { Button } from "../ui/button";

interface Props {
  onClose: () => void;
  onVendas: () => void;
  onRecuperacao: () => void;
  onZero: () => void;
}

export function EscolherTipoAgente({ onClose, onVendas, onRecuperacao, onZero }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-2xl rounded-2xl border border-white/10 bg-[#0f1117] p-8 shadow-2xl">
        {/* Fechar */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/50 transition hover:border-white/20 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Título */}
        <div className="mb-6 text-center">
          <h2 className="text-xl font-bold text-white">Escolha o tipo de agente</h2>
          <p className="mt-1 text-sm text-white/50">Selecione o modelo de agente que deseja criar</p>
        </div>

        {/* Opções */}
        <div className="grid grid-cols-2 gap-4">
          {/* Agente de Vendas */}
          <button
            onClick={onVendas}
            className="group flex flex-col items-center gap-4 rounded-2xl border-2 border-white/10 bg-white/5 p-6 text-center transition-all duration-200 hover:border-emerald-500/60 hover:bg-emerald-500/10"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/20 transition-colors group-hover:bg-emerald-500/30">
              <TrendingUp className="h-8 w-8 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-bold text-white">Agente de Vendas</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-white/50">
                Foca em fechar novas vendas e converter leads em clientes
              </p>
            </div>
          </button>

          {/* Agente de Recuperação */}
          <button
            onClick={onRecuperacao}
            className="group flex flex-col items-center gap-4 rounded-2xl border-2 border-white/10 bg-white/5 p-6 text-center transition-all duration-200 hover:border-orange-500/60 hover:bg-orange-500/10"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-orange-500/30 bg-orange-500/20 transition-colors group-hover:bg-orange-500/30">
              <RefreshCw className="h-8 w-8 text-orange-400" />
            </div>
            <div>
              <h3 className="font-bold text-white">Agente de Recuperação</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-white/50">
                Reengaja clientes que abandonaram o funil de vendas
              </p>
            </div>
          </button>
        </div>

        {/* Criar do Zero */}
        <div className="mt-6 flex justify-center">
          <Button variant="outline" onClick={onZero} className="gap-2 text-white/60 hover:text-white">
            <Zap className="h-4 w-4" />
            Criar do Zero
          </Button>
        </div>
      </div>
    </div>
  );
}
