/**
 * Gerenciador de sync offline → online.
 * Processa a fila do IndexedDB quando volta a ter internet.
 */

import { supabase } from './supabase'
import { getQueue, removeFromQueue, type SyncItem } from './offlineCache'

let syncing = false

export async function processQueue(): Promise<number> {
  if (syncing) return 0
  if (!navigator.onLine) return 0

  syncing = true
  let processed = 0

  try {
    const items = await getQueue()
    if (items.length === 0) return 0

    console.log(`[sync] Processando ${items.length} item(s) pendente(s)...`)

    for (const item of items) {
      try {
        let result

        if (item.action === 'insert') {
          result = await supabase.from(item.table).insert(item.data)
        } else if (item.action === 'update' && item.match) {
          let query = supabase.from(item.table).update(item.data)
          for (const [k, v] of Object.entries(item.match)) {
            query = query.eq(k, v)
          }
          result = await query
        } else if (item.action === 'upsert') {
          result = await supabase.from(item.table).upsert(item.data)
        }

        if (result?.error) {
          console.error(`[sync] Erro ao processar item ${item.id}:`, result.error)
          continue // pula este, tenta os próximos
        }

        if (item.id) await removeFromQueue(item.id)
        processed++
        console.log(`[sync] Item ${item.id} sincronizado (${item.table}/${item.action})`)
      } catch (err) {
        console.error(`[sync] Erro no item ${item.id}:`, err)
      }
    }

    if (processed > 0) {
      console.log(`[sync] ${processed} item(s) sincronizado(s) com sucesso`)
    }
  } finally {
    syncing = false
  }

  return processed
}

/** Registra listeners para sync automático quando volta online */
export function startAutoSync() {
  if (typeof window === 'undefined') return

  // Sync quando volta online
  window.addEventListener('online', () => {
    console.log('[sync] Conexão restaurada, sincronizando...')
    processQueue()
  })

  // Sync quando o app volta ao foco
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && navigator.onLine) {
      processQueue()
    }
  })

  // Sync inicial se tiver internet
  if (navigator.onLine) {
    processQueue()
  }
}
