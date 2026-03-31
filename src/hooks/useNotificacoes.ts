'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { MecanicoNotificacao } from '@/lib/types'

export function useNotificacoes(tecnicoNome: string | undefined) {
  const [notificacoes, setNotificacoes] = useState<MecanicoNotificacao[]>([])
  const [naoLidas, setNaoLidas] = useState(0)

  useEffect(() => {
    if (!tecnicoNome) return

    const carregar = async () => {
      const { data } = await supabase
        .from('mecanico_notificacoes')
        .select('*')
        .eq('tecnico_nome', tecnicoNome)
        .order('created_at', { ascending: false })
        .limit(50)
      if (data) {
        setNotificacoes(data)
        setNaoLidas(data.filter((n) => !n.lida).length)
      }
    }
    carregar()

    const channel = supabase
      .channel('mec_notif_' + tecnicoNome)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'mecanico_notificacoes',
        filter: `tecnico_nome=eq.${tecnicoNome}`,
      }, (payload) => {
        const nova = payload.new as MecanicoNotificacao
        setNotificacoes((prev) => [nova, ...prev].slice(0, 50))
        setNaoLidas((n) => n + 1)

        // Browser notification
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted' && document.hidden) {
          new Notification(nova.titulo, { body: nova.descricao || '', icon: '/Logo_Nova.png' })
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [tecnicoNome])

  const marcarComoLida = useCallback(async (id: number) => {
    await supabase.from('mecanico_notificacoes').update({ lida: true }).eq('id', id)
    setNotificacoes((prev) => prev.map((n) => n.id === id ? { ...n, lida: true } : n))
    setNaoLidas((n) => Math.max(0, n - 1))
  }, [])

  const marcarTodasComoLidas = useCallback(async () => {
    if (!tecnicoNome) return
    await supabase.from('mecanico_notificacoes').update({ lida: true }).eq('tecnico_nome', tecnicoNome).eq('lida', false)
    setNotificacoes((prev) => prev.map((n) => ({ ...n, lida: true })))
    setNaoLidas(0)
  }, [tecnicoNome])

  return { notificacoes, naoLidas, marcarComoLida, marcarTodasComoLidas }
}
