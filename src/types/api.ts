export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: {
    total: number;
    page: number;
    limit: number;
  };
}

export interface QueryParams {
  page?: number;
  limit?: number;
  de?: string;
  ate?: string;
  vendedorId?: string;
  modelo?: string;
  severidade?: string;
  categoria?: string;
}

