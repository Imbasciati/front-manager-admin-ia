import { Badge } from "../ui/badge";

export function StatusBadge({ type, value }: { type: "status" | "perfil" | "erro"; value: string | boolean }) {
  const stringValue = String(value);

  if (type === "status") {
    return <Badge variant={value === true || stringValue === "true" || stringValue === "Ativo" || stringValue === "Online" ? "success" : "muted"}>{value === true || stringValue === "true" ? "Ativo" : String(value)}</Badge>;
  }

  if (type === "perfil") {
    if (stringValue === "ADMIN") return <Badge variant="purple">Admin</Badge>;
    if (stringValue === "SUPERVISOR") return <Badge variant="blue">Supervisor</Badge>;
    return <Badge variant="muted">Vendedor</Badge>;
  }

  if (stringValue === "CRITICAL" || stringValue === "ERROR") return <Badge variant="danger">{stringValue}</Badge>;
  return <Badge variant="warning">{stringValue}</Badge>;
}

