import { useQuery } from "@tanstack/react-query";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageHeader } from "../components/shared/PageHeader";
import { Card } from "../components/ui/card";
import { usoService } from "../services/uso.service";

type UsoResumo = {
  sugestoes: number;
  autoRespostas: number;
  editadas: number;
  ignoradas: number;
  total: number;
};

type UsoHora = {
  hora: string;
  total: number;
  auto: number;
};

export function Uso() {
  const resumo = useQuery<UsoResumo>({ queryKey: ["uso-resumo"], queryFn: () => usoService.resumo() });
  const porHora = useQuery<UsoHora[]>({ queryKey: ["uso-hora"], queryFn: () => usoService.porHora() });

  return (
    <div className="space-y-4">
      <PageHeader title="Uso" subtitle="Métricas de assistência da IA por período" />
      <div className="grid gap-4 md:grid-cols-4">
        {[
          ["Sugestões", resumo.data?.sugestoes ?? 0],
          ["Auto-respostas", resumo.data?.autoRespostas ?? 0],
          ["Editadas", resumo.data?.editadas ?? 0],
          ["Total", resumo.data?.total ?? 0],
        ].map(([label, value]) => (
          <Card key={String(label)}><p className="text-sm text-white/70">{String(label)}</p><p className="text-2xl font-heading">{String(value)}</p></Card>
        ))}
      </div>
      <Card className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={porHora.data ?? []}>
            <defs><linearGradient id="uso" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#00C896" stopOpacity={0.8} /><stop offset="95%" stopColor="#00C896" stopOpacity={0} /></linearGradient></defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#2d3242" />
            <XAxis dataKey="hora" stroke="#9CA3AF" />
            <YAxis stroke="#9CA3AF" />
            <Tooltip />
            <Area type="monotone" dataKey="total" stroke="#00C896" fill="url(#uso)" />
          </AreaChart>
        </ResponsiveContainer>
      </Card>
      <Card>
        <table className="w-full text-sm">
          <thead><tr className="text-white/60"><th className="text-left">Hora</th><th className="text-left">Total</th><th className="text-left">Auto</th></tr></thead>
          <tbody>
            {(porHora.data ?? []).map((row) => (
              <tr key={row.hora} className="border-t border-white/10"><td>{row.hora}</td><td>{row.total}</td><td>{row.auto}</td></tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

