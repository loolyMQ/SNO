// Типы для клиентов
export interface ApiClient {
  baseUrl: string;
  timeout?: number;
}

export interface HttpClient extends ApiClient {
  headers?: Record<string, string>;
}
