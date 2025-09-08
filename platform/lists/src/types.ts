// Типы для работы со списками
export interface ListItem {
  id: string;
  title: string;
  description?: string;
  completed?: boolean;
}

export interface List {
  id: string;
  title: string;
  items: ListItem[];
}
