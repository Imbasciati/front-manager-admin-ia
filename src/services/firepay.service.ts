import { api } from "./api";

export interface FirepayConfig {
  configurado: boolean;
  apiKeyMascarada: string | null;
}

export interface FirepayCheckoutData {
  // campos que a API pode retornar — mapeamos os conhecidos
  link?: string;
  price?: number;
  formatted_price?: string;
  product_price?: number;
  formatted_product_price?: string;
  product?: { name?: string; slug?: string };
  checkout_id?: number;
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

  async getCheckout(checkoutId: string): Promise<FirepayCheckoutData> {
    const { data } = await api.get<{ data: FirepayCheckoutData }>(
      `/configuracoes/firepay/checkout/${checkoutId}`,
    );
    return data.data;
  },
};
