import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "../ui/button";
import { Card } from "../ui/card";

type Column<T> = {
  key: keyof T | string;
  label: string;
  render?: (row: T) => ReactNode;
};

export function DataTable<T extends { id?: string }>({
  columns,
  data,
  loading,
  emptyMessage,
  page,
  total,
  limit,
  onPageChange,
}: {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  page: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / limit));

  return (
    <Card className="overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5 text-white/70">
            <tr>
              {columns.map((col) => (
                <th key={String(col.key)} className="px-4 py-3 font-medium">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-white/70">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                </td>
              </tr>
            )}
            {!loading && data.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-white/60">
                  {emptyMessage ?? "Nenhum registro encontrado."}
                </td>
              </tr>
            )}
            {!loading &&
              data.map((row, idx) => (
                <tr key={row.id ?? idx} className={idx % 2 === 0 ? "bg-white/[0.02]" : "bg-transparent"}>
                  {columns.map((col) => (
                    <td key={String(col.key)} className="px-4 py-3 hover:bg-white/[0.03]">
                      {col.render ? col.render(row) : String((row as Record<string, unknown>)[String(col.key)] ?? "-")}
                    </td>
                  ))}
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t border-white/10 px-4 py-3 text-sm">
        <span className="text-white/70">Total: {total}</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => onPageChange(page - 1)} disabled={page <= 1}>
            Anterior
          </Button>
          <span className="px-2 py-1 text-white/80">
            {page} / {pages}
          </span>
          <Button variant="outline" size="sm" onClick={() => onPageChange(page + 1)} disabled={page >= pages}>
            Próxima
          </Button>
        </div>
      </div>
    </Card>
  );
}


