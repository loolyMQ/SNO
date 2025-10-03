declare module 'lru-cache' {
  export interface LRUCacheOptions<K, V> {
    max?: number;
    ttl?: number;
    updateAgeOnGet?: boolean;
    allowStale?: boolean;
    maxAge?: number;
    dispose?: (key: K, value: V) => void;
  }

  export default class LRUCache<K, V> {
    constructor(options?: LRUCacheOptions<K, V>);
    get(key: K): V | undefined;
    set(key: K, value: V): this;
    has(key: K): boolean;
    delete(key: K): boolean;
    clear(): void;
    size: number;
    max: number;
    ttl: number;
    updateAgeOnGet: boolean;
    allowStale: boolean;
    maxAge: number;
  }
}
