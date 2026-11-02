/**
 * In-memory client cache with in-flight request deduplication and TTL.
 * Built for high-traffic optimization and Firestore read reduction.
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const memoryCache = new Map<string, CacheEntry<unknown>>();
const inFlightRequests = new Map<string, Promise<unknown>>();

export interface CacheOptions {
  ttlMs?: number; // Time to live in milliseconds (default: 3 minutes)
  forceRefresh?: boolean; // Bypass cache and fetch directly from source
}

// 3 minutes default TTL for client catalog browsing
const DEFAULT_TTL_MS = 3 * 60 * 1000;

/**
 * Fetch with in-flight deduplication and memory cache.
 * If multiple components call this simultaneously with the same key,
 * only ONE underlying fetch will run, and all callers share the same Promise.
 */
export async function cachedFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CacheOptions = {}
): Promise<T> {
  const { ttlMs = DEFAULT_TTL_MS, forceRefresh = false } = options;

  // 1. If not forcing refresh, check memory cache
  if (!forceRefresh) {
    const cached = memoryCache.get(key);
    if (cached && Date.now() - cached.timestamp < ttlMs) {
      return cached.data as T;
    }
  }

  // 2. Check if the exact same request is already in-flight (deduplication)
  if (inFlightRequests.has(key)) {
    return inFlightRequests.get(key)! as Promise<T>;
  }

  // 3. Initiate fetcher and track the promise
  const promise = fetcher()
    .then((result) => {
      memoryCache.set(key, {
        data: result,
        timestamp: Date.now(),
      });
      return result;
    })
    .finally(() => {
      inFlightRequests.delete(key);
    });

  inFlightRequests.set(key, promise);
  return promise;
}

/**
 * Invalidate a specific cache key or all keys matching a prefix.
 * e.g. invalidateCache('product') invalidates 'products:all', 'product:slug:...', etc.
 */
export function invalidateCache(keyPrefix?: string): void {
  if (!keyPrefix) {
    memoryCache.clear();
    return;
  }
  for (const key of memoryCache.keys()) {
    if (key.startsWith(keyPrefix)) {
      memoryCache.delete(key);
    }
  }
}
