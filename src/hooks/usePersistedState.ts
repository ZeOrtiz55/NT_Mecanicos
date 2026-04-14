import { useState, useEffect, useCallback, useRef } from 'react'

/**
 * useState que persiste no localStorage.
 * Dados sobrevivem a minimizar, trocar de aba, recarregar.
 * Limpa automaticamente ao chamar clear().
 */
export function usePersistedState<T>(
  key: string,
  initialValue: T,
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  const prefixedKey = `nt-form:${key}`

  const [state, setState] = useState<T>(() => {
    if (typeof window === 'undefined') return initialValue
    try {
      const saved = localStorage.getItem(prefixedKey)
      if (saved) {
        const parsed = JSON.parse(saved)
        // Restaurar Sets se necessário
        return parsed
      }
    } catch {
      // corrupted data
    }
    return initialValue
  })

  // Salvar no localStorage a cada mudança
  const isFirstRender = useRef(true)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    try {
      localStorage.setItem(prefixedKey, JSON.stringify(state))
    } catch {
      // storage full or unavailable
    }
  }, [state, prefixedKey])

  // Limpar dados salvos (chamar após enviar com sucesso)
  const clear = useCallback(() => {
    localStorage.removeItem(prefixedKey)
  }, [prefixedKey])

  return [state, setState, clear]
}

/**
 * Persiste múltiplos campos de formulário de uma vez.
 * Uso: const [form, setForm, clearForm] = usePersistedForm('os-234', { campo1: '', campo2: '' })
 */
export function usePersistedForm<T extends Record<string, unknown>>(
  key: string,
  initialValue: T,
): [T, (updates: Partial<T>) => void, () => void] {
  const [state, setState, clear] = usePersistedState<T>(key, initialValue)

  const updateForm = useCallback((updates: Partial<T>) => {
    setState((prev: T) => ({ ...prev, ...updates }))
  }, [setState])

  return [state, updateForm, clear]
}
