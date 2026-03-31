'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { MecanicoProfile } from '@/lib/types'

export function useAuth() {
  const [tecnicos, setTecnicos] = useState<MecanicoProfile[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const carregar = async () => {
      const { data } = await supabase
        .from('mecanico_usuarios')
        .select('*')
        .eq('ativo', true)
        .order('tecnico_nome')
      setTecnicos(data || [])
      setLoading(false)
    }
    carregar()
  }, [])

  return { tecnicos, loading }
}
