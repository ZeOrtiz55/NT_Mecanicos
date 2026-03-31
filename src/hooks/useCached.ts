import { useEffect, useState, useCallback, useRef } from 'react'
import { cacheGet, cacheSet, cacheIsFresh } from '@/lib/cache'

interface UseCachedOptions {
  skip?: boolean
}

interface UseCachedResult<T> {
  data: T | null
  loading: boolean
  refreshing: boolean
  refresh: () => void
}

export function useCached<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: UseCachedOptions,
): UseCachedResult<T> {
  const [data, setData] = useState<T | null>(() => cacheGet<T>(key))
  const [loading, setLoading] = useState(() => !cacheGet<T>(key))
  const [refreshing, setRefreshing] = useState(false)

  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher
  const keyRef = useRef(key)
  keyRef.current = key
  const fetchingRef = useRef(false)

  const doFetch = useCallback(async (background: boolean) => {
    if (fetchingRef.current) return
    fetchingRef.current = true

    if (!background) setLoading(true)
    else setRefreshing(true)

    try {
      const result = await fetcherRef.current()
      cacheSet(keyRef.current, result)
      setData(result)
    } catch (e) {
      console.error(`[cache] Erro ao buscar ${keyRef.current}:`, e)
    } finally {
      setLoading(false)
      setRefreshing(false)
      fetchingRef.current = false
    }
  }, []) // sem dependências - usa refs

  useEffect(() => {
    if (options?.skip) {
      setLoading(false)
      return
    }

    const cached = cacheGet<T>(key)

    if (cached) {
      // Tem cache: mostra instantâneo
      setData(cached)
      setLoading(false)

      // Se stale, atualiza em background
      if (!cacheIsFresh(key)) {
        doFetch(true)
      }
    } else {
      // Sem cache: fetch completo
      doFetch(false)
    }
  }, [key, options?.skip]) // doFetch é estável (sem deps)

  const refresh = useCallback(() => {
    const cached = cacheGet<T>(keyRef.current)
    doFetch(cached !== null)
  }, [doFetch])

  return { data, loading, refreshing, refresh }
}
