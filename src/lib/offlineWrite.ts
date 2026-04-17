/**
 * Helper para operações de escrita com fallback offline.
 * Se online, faz a operação direto no Supabase.
 * Se offline (ou se falhar por rede), enfileira no IndexedDB para sync depois.
 */

import { supabase } from './supabase'
import { queueSync } from './offlineCache'

interface WriteOptions {
  table: string
  action: 'insert' | 'update' | 'upsert'
  data: Record<string, unknown>
  match?: Record<string, unknown>
}

export async function offlineWrite(opts: WriteOptions): Promise<{ ok: boolean; queued: boolean; error?: string }> {
  // Se offline, vai direto pra fila
  if (!navigator.onLine) {
    await queueSync({
      table: opts.table,
      action: opts.action,
      data: opts.data,
      match: opts.match,
    })
    return { ok: true, queued: true }
  }

  // Tenta online
  try {
    let result

    if (opts.action === 'insert') {
      result = await supabase.from(opts.table).insert(opts.data)
    } else if (opts.action === 'update' && opts.match) {
      let query = supabase.from(opts.table).update(opts.data)
      for (const [k, v] of Object.entries(opts.match)) {
        query = query.eq(k, v as string | number)
      }
      result = await query
    } else if (opts.action === 'upsert') {
      result = await supabase.from(opts.table).upsert(opts.data)
    }

    if (result?.error) {
      // Se é erro de rede, enfileira
      if (result.error.message?.includes('fetch') || result.error.message?.includes('network')) {
        await queueSync({
          table: opts.table,
          action: opts.action,
          data: opts.data,
          match: opts.match,
        })
        return { ok: true, queued: true }
      }
      return { ok: false, queued: false, error: result.error.message }
    }

    return { ok: true, queued: false }
  } catch {
    // Erro de rede, enfileira
    await queueSync({
      table: opts.table,
      action: opts.action,
      data: opts.data,
      match: opts.match,
    })
    return { ok: true, queued: true }
  }
}
