import { api } from "../services/api";

/**
 * Envia um erro para o backend registrar no ErroSistema.
 * Silencia falhas (não deve causar mais erros).
 */
async function reportar(payload: {
  severidade?: "WARNING" | "ERROR" | "CRITICAL";
  categoria: string;
  mensagem: string;
  stack?: string;
  detalhes?: Record<string, unknown>;
}) {
  await api
    .post("/erros/capturar", {
      severidade: payload.severidade ?? "ERROR",
      categoria: payload.categoria,
      mensagem: payload.mensagem,
      stack: payload.stack,
      detalhes: payload.detalhes,
      origem: "frontend",
    })
    .catch(() => undefined);
}

/**
 * Instala captura global de erros JavaScript não tratados.
 * Chame uma única vez antes de renderizar o app.
 */
export function setupErrorCapture() {
  // Erros síncronos e de recursos (JS runtime, eval, etc.)
  window.onerror = (msg, source, lineno, colno, error) => {
    reportar({
      categoria: "JS_ERROR",
      mensagem: String(msg),
      stack: error?.stack,
      detalhes: { source, lineno, colno },
    });
    return false; // não suprimir — mantém o comportamento padrão do browser
  };

  // Promises rejeitadas sem .catch()
  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    const isAxiosError = reason?.isAxiosError === true;

    // Não reporta erros de rede de chamadas que já têm tratamento (axios interceptors)
    // mas sim erros de lógica que resultaram em promise rejeitada
    if (isAxiosError) return;

    reportar({
      categoria: "PROMISE_REJECTION",
      mensagem: reason?.message ?? String(reason) ?? "Unhandled promise rejection",
      stack: reason?.stack,
      detalhes: { type: "unhandledrejection" },
    });
  });
}
