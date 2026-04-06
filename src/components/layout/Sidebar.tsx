import {
  Bell,
  Bot,
  DollarSign,
  Gauge,
  Home,
  LogOut,
  MessageSquare,
  Settings,
  ShieldAlert,
  Users,
} from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { APP_VERSION } from "../../utils/constants";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: Home },
  { to: "/atendimentos", label: "Atendimentos", icon: MessageSquare },
  { to: "/usuarios", label: "Usuários", icon: Users },
  { to: "/monitoramento", label: "Monitoramento", icon: Gauge },
  { to: "/agentes", label: "Agentes", icon: Bot },
  { to: "/uso", label: "Uso", icon: Bell },
  { to: "/custos", label: "Custos", icon: DollarSign },
  { to: "/orientacoes", label: "Orientações", icon: Bot },
  { to: "/logs", label: "Logs", icon: Bell },
  { to: "/erros", label: "Erros", icon: ShieldAlert },
];

export function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const isAdmin = user?.perfil === "ADMIN";

  return (
    <aside className="sticky top-0 flex h-screen w-64 flex-col border-r border-white/10 bg-surface/80 p-4">
      <div className="mb-6">
        <h1 className="text-2xl font-heading font-bold text-primary">Beta Admin IA</h1>
        <p className="text-xs text-white/60">Painel central de IA</p>
      </div>
      <nav className="space-y-1 overflow-y-auto">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${isActive ? "bg-primary/15 text-primary" : "text-white/70 hover:bg-white/10"}`
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}

        {isAdmin && (
          <NavLink
            to="/configuracoes"
            end={false}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${isActive ? "bg-primary/15 text-primary" : "text-white/70 hover:bg-white/10"}`
            }
          >
            <Settings className="h-4 w-4" />
            Configurações
          </NavLink>
        )}
      </nav>
      <div className="mt-auto rounded-lg border border-white/10 p-3 text-xs text-white/70">
        <p className="font-semibold text-white">{user?.nome}</p>
        <p>{user?.perfil}</p>
        <button
          className="mt-3 flex items-center gap-2 text-red-300"
          onClick={async () => {
            await logout();
            navigate("/login");
          }}
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
        <p className="mt-4 text-[10px] text-white/40">{APP_VERSION}</p>
      </div>
    </aside>
  );
}
