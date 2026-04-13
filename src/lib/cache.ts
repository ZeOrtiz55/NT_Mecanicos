// Cache global in-memory com padrão SWR (stale-while-revalidate)
// + persistência em IndexedDB para funcionar offline

import { offlineGet, offlineSet } from './offlineCache'

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
  // Persiste em IndexedDB para offline (fire-and-forget)
  offlineSet(key, data).catch(() => {})
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

/**
 * Tenta recuperar do IndexedDB se não estiver em memória.
 * Usado no useCached para ter dados instantâneos após reload.
 */
export async function cacheGetPersisted<T>(key: string): Promise<T | null> {
  // Primeiro tenta memória
  const mem = cacheGet<T>(key)
  if (mem) return mem

  // Depois tenta IndexedDB
  const persisted = await offlineGet<T>(key)
  if (persisted) {
    // Carrega em memória (como stale, para forçar revalidação)
    store.set(key, { data: persisted, timestamp: 0 })
    return persisted
  }

  return null
}
