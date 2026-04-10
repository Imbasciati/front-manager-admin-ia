import { api } from "./api";

export interface FirepayConfig {
  configurado: boolean;
  apiKeyMascarada: string | null;
}

export interface FirepayCheckoutData {
  // Campos de transação individual (webhook payload structure)
  link?: string;
  price?: number;
  formatted_price?: string;
  product_price?: number;
  formatted_product_price?: string;
  product?: { name?: string; slug?: string };
  checkout_id?: number;
  // Campos do endpoint GET /api/public/transactions (dados agregados)
  data?: {
    total_sales_count?: number;
    total_sales_value?: number;
    transactions?: Array<{
      link?: string;
      price?: number;
      formatted_price?: string;
      product_price?: number;
      formatted_product_price?: string;
      [key: string]: unknown;
    }>;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export const firepayService = {
  async getConfig(): Promise<FirepayConfig> {
    const { data } = await api.get<{ data: FirepayConfig }>("/configuracoes/firepay");
    return data.data;
  },

  async saveApiKey(apiKey: string) {
    const { data } = await api.put("/configuracoes/firepay", { apiKey });
    return data.data;
  },

  async deleteApiKey() {
    const { data } = await api.delete("/configuracoes/firepay");
    return data.data;
  },

  async testar(): Promise<{ conectado: boolean }> {
    const { data } = await api.post<{ data: { conectado: boolean } }>("/configuracoes/firepay/testar");
    return data.data;
  },

  async getCheckout(checkoutId: string): Promise<FirepayCheckoutData> {
    const { data } = await api.get<{ data: FirepayCheckoutData }>(
      `/configuracoes/firepay/checkout/${checkoutId}`,
    );
    return data.data;
  },
};
