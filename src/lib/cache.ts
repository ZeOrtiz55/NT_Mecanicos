// Cache global in-memory com padrão SWR (stale-while-revalidate)
// Dados ficam em memória entre navegações de página (SPA)

interface CacheEntry<T> {
  data: T
  timestamp: number
}

const store = new Map<string, CacheEntry<unknown>>()

// Tempo máximo que o cache é considerado "fresco" (não refaz fetch)
const FRESH_MS = 30_000 // 30 segundos

export function cacheGet<T>(key: string): T | null {
  const entry = store.get(key) as CacheEntry<T> | undefined
  return entry ? entry.data : null
}

export function cacheSet<T>(key: string, data: T): void {
  store.set(key, { data, timestamp: Date.now() })
}

export function cacheIsFresh(key: string): boolean {
  const entry = store.get(key)
  if (!entry) return false
  return Date.now() - entry.timestamp < FRESH_MS
}

export function cacheInvalidate(key: string): void {
  store.delete(key)
}

export function cacheInvalidatePrefix(prefix: string): void {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key)
  }
}
