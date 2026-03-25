import { useAuth } from "../../contexts/AuthContext";

export function Header() {
  const { user } = useAuth();

  return (
    <header className="mb-6 rounded-xl border border-white/10 bg-surface/70 p-4">
      <p className="text-sm text-white/70">Bem-vindo de volta,</p>
      <p className="text-lg font-heading">{user?.nome ?? "Usuário"}</p>
    </header>
  );
}

