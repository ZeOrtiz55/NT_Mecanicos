'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { MecanicoProfile } from '@/lib/types'

export function useCurrentUser() {
  const [user, setUser] = useState<MecanicoProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const routerRef = useRef(router)
  routerRef.current = router

  const [refreshKey, setRefreshKey] = useState(0)

  const refresh = () => setRefreshKey(k => k + 1)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()

        if (!session) {
          routerRef.current.replace('/login')
          return
        }

        // 1. Checar portal_permissoes
        const { data: perm } = await supabase
          .from('portal_permissoes')
          .select('is_admin, mecanico_role, mecanico_tecnico_nome')
          .eq('user_id', session.user.id)
          .single()

        if (cancelled) return

        if (perm && (perm.mecanico_role || perm.is_admin)) {
          const { data: portalProfile } = await supabase
            .from('financeiro_usu')
            .select('nome, email, avatar_url')
            .eq('id', session.user.id)
            .single()

          if (cancelled) return

          if (perm.is_admin && !perm.mecanico_role) {
            routerRef.current.replace('/admin')
            return
          }

          setUser({
            id: session.user.id,
            tecnico_nome: portalProfile?.nome || 'Usuário',
            tecnico_email: portalProfile?.email || session.user.email || '',
            telefone: null,
            avatar_url: portalProfile?.avatar_url || null,
            ativo: true,
            role: perm.is_admin ? 'admin' : 'tecnico',
            nome_pos: perm.mecanico_tecnico_nome || null,
            mecanico_role: perm.mecanico_role as 'tecnico' | 'observador' | null,
          })
          setLoading(false)
          return
        }

        // 2. Fallback: checar mecanico_usuarios (legado)
        const { data } = await supabase
          .from('mecanico_usuarios')
          .select('*')
          .eq('id', session.user.id)
          .single()

        if (cancelled) return

        if (data) {
          const profile = data as MecanicoProfile
          const email = profile.tecnico_email?.trim()

          if (email && !profile.nome_pos) {
            const { data: reqUser } = await supabase
              .from('req_usuarios')
              .select('nome')
              .ilike('email', `%${email}%`)
              .maybeSingle()

            let nomePOS = reqUser?.nome || null

            if (!nomePOS) {
              const { data: tecApp } = await supabase
                .from('Tecnicos_Appsheet')
                .select('UsuNome')
                .ilike('UsuEmail', `%${email}%`)
                .maybeSingle()
              nomePOS = tecApp?.UsuNome?.trim() || null
            }

            if (nomePOS) {
              const { data: tecExato } = await supabase
                .from('Tecnicos_Appsheet')
                .select('UsuNome')
                .ilike('UsuNome', `%${nomePOS}%`)
                .maybeSingle()
              if (tecExato?.UsuNome) nomePOS = tecExato.UsuNome.trim()
              profile.nome_pos = nomePOS
            }
          }

          if (cancelled) return
          setUser(profile)
          setLoading(false)
          return
        }

        routerRef.current.replace('/login')
      } catch (err) {
        console.error('Erro ao carregar usuário:', err)
        if (!cancelled) routerRef.current.replace('/login')
      }
    }
    load()

    return () => { cancelled = true }
  }, [refreshKey])

  const logout = async () => {
    await supabase.auth.signOut()
    routerRef.current.replace('/login')
  }

  return { user, loading, logout, refresh }
}
