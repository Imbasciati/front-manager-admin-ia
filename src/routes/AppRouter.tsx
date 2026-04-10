import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom";
import { PrivateRoute } from "./PrivateRoute";
import { Layout } from "../components/layout/Layout";
import { Login } from "../pages/Login";
import { Dashboard } from "../pages/Dashboard";
import { Usuarios } from "../pages/Usuarios";
import { Monitoramento } from "../pages/Monitoramento";
import { Agentes } from "../pages/Agentes";
import { NovoAgente } from "../pages/NovoAgente";
import { NovoAgenteRecuperacao } from "../pages/NovoAgenteRecuperacao";
import { EditarAgente } from "../pages/EditarAgente";
import { TestarAgente } from "../pages/TestarAgente";
import { Uso } from "../pages/Uso";
import { Custos } from "../pages/Custos";
import { Orientacoes } from "../pages/Orientacoes";
import { Logs } from "../pages/Logs";
import { Erros } from "../pages/Erros";
import { ModelosIA } from "../pages/configuracoes/ModelosIA";
import { Provedores } from "../pages/configuracoes/Provedores";
import { Webhooks } from "../pages/configuracoes/Webhooks";
import { AgenteConfig } from "../pages/configuracoes/AgenteConfig";
import { ConfiguracoesIndex } from "../pages/configuracoes/Index";
import { ConfigUnnichat } from "../pages/configuracoes/Unnichat";
import { ConfigFirepay } from "../pages/configuracoes/Firepay";
import { Atendimentos } from "../pages/Atendimentos";

const router = createBrowserRouter([
  { path: "/login", element: <Login /> },
  {
    path: "/",
    element: <PrivateRoute />,
    children: [
      {
        element: <Layout><Dashboard /></Layout>,
        path: "/dashboard",
      },
      { element: <Layout><Usuarios /></Layout>, path: "/usuarios" },
      { element: <Layout><Monitoramento /></Layout>, path: "/monitoramento" },
      { element: <Layout><Agentes /></Layout>, path: "/agentes" },
      { element: <Layout><NovoAgente /></Layout>, path: "/agentes/novo" },
      { element: <Layout><NovoAgenteRecuperacao /></Layout>, path: "/agentes/novo/recuperacao" },
      { element: <Layout><EditarAgente /></Layout>, path: "/agentes/:id/editar" },
      { element: <Layout><TestarAgente /></Layout>, path: "/agentes/:id/testar" },
      { element: <Layout><Uso /></Layout>, path: "/uso" },
      { element: <Layout><Custos /></Layout>, path: "/custos" },
      { element: <Layout><Orientacoes /></Layout>, path: "/orientacoes" },
      { element: <Layout><Logs /></Layout>, path: "/logs" },
      { element: <Layout><Erros /></Layout>, path: "/erros" },
      { element: <Layout><Atendimentos /></Layout>, path: "/atendimentos" },
      { element: <Layout><ConfiguracoesIndex /></Layout>, path: "/configuracoes" },
      { element: <Layout><Provedores /></Layout>, path: "/configuracoes/provedores" },
      { element: <Layout><ModelosIA /></Layout>, path: "/configuracoes/modelos" },
      { element: <Layout><Webhooks /></Layout>, path: "/configuracoes/webhooks" },
      { element: <Layout><AgenteConfig /></Layout>, path: "/configuracoes/agente" },
      { element: <Layout><ConfigUnnichat /></Layout>, path: "/configuracoes/unnichat" },
      { element: <Layout><ConfigFirepay /></Layout>, path: "/configuracoes/firepay" },
      { path: "/", element: <Navigate to="/dashboard" replace /> },
    ],
  },
  { path: "*", element: <Navigate to="/dashboard" replace /> },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
