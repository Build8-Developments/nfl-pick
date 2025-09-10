// Simple in-memory cache for the SPA lifetime (clears on full page refresh)

type CacheValue = unknown;

const cacheStore = new Map<string, CacheValue>();

export const memCache = {
  get<T = unknown>(key: string): T | undefined {
    return cacheStore.get(key) as T | undefined;
  },
  set<T = unknown>(key: string, value: T): void {
    cacheStore.set(key, value as CacheValue);
  },
  has(key: string): boolean {
    return cacheStore.has(key);
  },
  delete(key: string): void {
    cacheStore.delete(key);
  },
  clear(): void {
    cacheStore.clear();
  },
};
