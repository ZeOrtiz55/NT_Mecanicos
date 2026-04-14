import { useEffect, useCallback, useRef } from 'react'

/**
 * Salva automaticamente o estado do formulário no localStorage.
 * Restaura ao montar o componente (se tiver dados salvos).
 *
 * Uso:
 *   const { restore, clear } = useFormBackup(`os-preencher-${id}`, getFormData, setFormData)
 *
 * - getFormData: função que retorna todos os campos do form como objeto
 * - setFormData: função que recebe o objeto e seta os campos
 * - Chame clear() após salvar/enviar com sucesso
 */
export function useFormBackup(
  key: string,
  getFormData: () => Record<string, unknown>,
  setFormData: (data: Record<string, unknown>) => void,
  deps: unknown[] = [],
) {
  const prefixedKey = `nt-form:${key}`
  const getRef = useRef(getFormData)
  getRef.current = getFormData
  const setRef = useRef(setFormData)
  setRef.current = setFormData
  const restoredRef = useRef(false)

  // Restaurar dados salvos ao montar
  useEffect(() => {
    if (restoredRef.current) return
    try {
      const saved = localStorage.getItem(prefixedKey)
      if (saved) {
        const data = JSON.parse(saved)
        if (data && typeof data === 'object') {
          setRef.current(data)
          restoredRef.current = true
          console.log(`[backup] Restaurado: ${key}`)
        }
      }
    } catch {
      // dados corrompidos, ignora
    }
  }, [prefixedKey, key])

  // Salvar a cada 2 segundos se houver mudanças
  useEffect(() => {
    const interval = setInterval(() => {
      try {
        const data = getRef.current()
        // Só salva se tem algum dado preenchido
        const hasData = Object.values(data).some(v =>
          v !== '' && v !== false && v !== null && v !== undefined &&
          !(Array.isArray(v) && v.length === 0)
        )
        if (hasData) {
          localStorage.setItem(prefixedKey, JSON.stringify(data))
        }
      } catch {
        // storage cheio ou indisponível
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [prefixedKey, ...deps])

  // Salvar quando minimiza/troca de aba
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        try {
          const data = getRef.current()
          localStorage.setItem(prefixedKey, JSON.stringify(data))
        } catch {}
      }
    }

    const handleBeforeUnload = () => {
      try {
        const data = getRef.current()
        localStorage.setItem(prefixedKey, JSON.stringify(data))
      } catch {}
    }

    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('beforeunload', handleBeforeUnload)
    window.addEventListener('pagehide', handleBeforeUnload)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('beforeunload', handleBeforeUnload)
      window.removeEventListener('pagehide', handleBeforeUnload)
    }
  }, [prefixedKey])

  // Limpar backup após envio com sucesso
  const clear = useCallback(() => {
    localStorage.removeItem(prefixedKey)
    console.log(`[backup] Limpo: ${key}`)
  }, [prefixedKey, key])

  return { clear }
}
