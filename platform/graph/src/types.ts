// Типы для графовых операций
export interface Node {
  id: string;
  label: string;
  properties?: Record<string, any>;
}

export interface Edge {
  id: string;
  source: string;
  target: string;
  label: string;
  properties?: Record<string, any>;
}
