export interface SearchQuery {
  query: string;
  filters?: SearchFilters;
  sort?: SearchSort[];
  pagination?: SearchPagination;
  facets?: string[];
  highlight?: boolean;
  suggest?: boolean;
}

export interface SearchFilters {
  dateRange?: {
    field: string;
    from: Date;
    to: Date;
  };
  range?: {
    field: string;
    min: number;
    max: number;
  };
  terms?: {
    field: string;
    values: string[];
  };
  exists?: string[];
  missing?: string[];
  geo?: {
    field: string;
    lat: number;
    lon: number;
    distance: string;
  };
}

export interface SearchSort {
  field: string;
  order: 'asc' | 'desc';
  mode?: 'min' | 'max' | 'sum' | 'avg' | 'median';
}

export interface SearchPagination {
  page: number;
  size: number;
  from?: number;
}

export interface SearchResult<T = unknown> {
  hits: SearchHit<T>[];
  total: number;
  maxScore: number;
  took: number;
  timedOut: boolean;
  aggregations?: Record<string, unknown>;
  suggestions?: SearchSuggestion[];
  facets?: Record<string, SearchFacet>;
}

export interface SearchHit<T = unknown> {
  id: string;
  index: string;
  score: number;
  source: T;
  highlights?: Record<string, string[]>;
  innerHits?: Record<string, SearchResult<T>>;
}

export interface SearchSuggestion {
  text: string;
  score: number;
  contexts?: Record<string, string[]>;
}

export interface SearchFacet {
  buckets: Array<{
    key: string;
    docCount: number;
    subAggregations?: Record<string, unknown>;
  }>;
  docCountErrorUpperBound: number;
  sumOtherDocCount: number;
}

export interface SearchIndex {
  name: string;
  type: string;
  mapping: Record<string, unknown>;
  settings: Record<string, unknown>;
  aliases: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface SearchMapping {
  properties: Record<string, SearchFieldMapping>;
  dynamic?: boolean;
  dateDetection?: boolean;
  numericDetection?: boolean;
}

export interface SearchFieldMapping {
  type: string;
  analyzer?: string;
  searchAnalyzer?: string;
  index?: boolean;
  store?: boolean;
  fields?: Record<string, SearchFieldMapping>;
  format?: string;
  pattern?: string;
}

export interface SearchSettings {
  number_of_shards: number;
  number_of_replicas: number;
  refresh_interval: string;
  analysis: {
    analyzer: Record<string, unknown>;
    tokenizer: Record<string, unknown>;
    filter: Record<string, unknown>;
  };
}

export interface SearchAggregation {
  name: string;
  type: string;
  field: string;
  size?: number;
  order?: Record<string, 'asc' | 'desc'>;
  aggs?: Record<string, SearchAggregation>;
}

export interface SearchHighlight {
  fields: Record<string, unknown>;
  preTags?: string[];
  postTags?: string[];
  fragmentSize?: number;
  numberOfFragments?: number;
}
