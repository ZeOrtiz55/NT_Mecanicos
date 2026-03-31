'use client'
import { useEffect, useState } from 'react'
import { supabase, fetchAll } from '@/lib/supabase'
import type { OrdemServico } from '@/lib/types'
import { Search, Wrench, MapPin, User } from 'lucide-react'
import Link from 'next/link'

const STATUS_COLORS: Record<string, string> = {
  'Orcamento': '#3B82F6',
  'Execucao': '#F59E0B',
  'Execucao Procurando pecas': '#F97316',
  'Executada aguardando comercial': '#8B5CF6',
  'Aguardando ordem Tecnico': '#0EA5E9',
  'Concluida': '#10B981',
  'Cancelada': '#EF4444',
}

export default function OSListPage() {
  const [ordens, setOrdens] = useState<OrdemServico[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState('')
  const [tecnicoFiltro, setTecnicoFiltro] = useState<string>('todos')
  const [tecnicos, setTecnicos] = useState<string[]>([])
  const [mostrarConcluidas, setMostrarConcluidas] = useState(false)

  useEffect(() => {
    const carregar = async () => {
      const list = await fetchAll<OrdemServico>('Ordem_Servico', {
        order: { column: 'Id_Ordem', ascending: false },
      })
      setOrdens(list)

      const nomes = [...new Set(list.flatMap((o) => [o.Os_Tecnico, o.Os_Tecnico2].filter(Boolean)))].sort()
      setTecnicos(nomes)
      setLoading(false)
    }
    carregar()
  }, [])

  const filtered = ordens.filter((o) => {
    if (!mostrarConcluidas && (o.Status === 'Concluida' || o.Status === 'Cancelada')) return false
    if (tecnicoFiltro !== 'todos' && o.Os_Tecnico !== tecnicoFiltro && o.Os_Tecnico2 !== tecnicoFiltro) return false
    if (!filtro) return true
    const term = filtro.toLowerCase()
    return o.Id_Ordem.toLowerCase().includes(term) ||
      o.Os_Cliente?.toLowerCase().includes(term) ||
      o.Projeto?.toLowerCase().includes(term) ||
      o.Os_Tecnico?.toLowerCase().includes(term)
  })

  return (
    <div>
      <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1E3A5F', marginBottom: 16 }}>Todas as Ordens</h1>

      {/* Filtro por tecnico */}
      <div style={{ marginBottom: 12 }}>
        <select
          value={tecnicoFiltro}
          onChange={(e) => setTecnicoFiltro(e.target.value)}
          style={{
            width: '100%', padding: '10px 14px', borderRadius: 10,
            border: '1.5px solid #E5E7EB', fontSize: 13, background: '#fff',
          }}
        >
          <option value="todos">Todos os tecnicos</option>
          {tecnicos.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 12 }}>
        <Search size={16} style={{ position: 'absolute', left: 14, top: 13, color: '#9CA3AF' }} />
        <input
          type="text" value={filtro} onChange={(e) => setFiltro(e.target.value)}
          placeholder="Buscar por OS, cliente, projeto ou tecnico..."
          style={{
            width: '100%', padding: '12px 12px 12px 40px', borderRadius: 12,
            border: '1.5px solid #E5E7EB', fontSize: 14, outline: 'none', background: '#fff',
          }}
        />
      </div>

      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#6B7280', marginBottom: 16, cursor: 'pointer' }}>
        <input type="checkbox" checked={mostrarConcluidas} onChange={(e) => setMostrarConcluidas(e.target.checked)} />
        Mostrar concluidas/canceladas
      </label>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
      ) : filtered.length === 0 ? (
        <div style={{
          background: '#fff', borderRadius: 14, padding: 40, textAlign: 'center',
          color: '#9CA3AF', fontSize: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        }}>
          Nenhuma ordem encontrada
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map((os) => {
            const color = STATUS_COLORS[os.Status] || '#6B7280'
            return (
              <Link key={os.Id_Ordem} href={`/admin/os/${os.Id_Ordem}`} style={{
                background: '#fff', borderRadius: 14, padding: 16,
                boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                borderLeft: `4px solid ${color}`,
                textDecoration: 'none', color: 'inherit',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: '#1E3A5F' }}>{os.Id_Ordem}</span>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6,
                    background: color + '18', color,
                  }}>
                    {os.Status}
                  </span>
                </div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{os.Os_Cliente}</div>
                {os.Projeto && (
                  <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Wrench size={12} /> {os.Projeto}
                  </div>
                )}
                {os.Endereco_Cliente && (
                  <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <MapPin size={12} /> {os.Endereco_Cliente}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: 11, color: '#9CA3AF' }}>
                  <span><User size={11} /> {os.Os_Tecnico}</span>
                  {os.Os_Tecnico2 && <span><User size={11} /> {os.Os_Tecnico2}</span>}
                  {os.Tipo_Servico && <span>{os.Tipo_Servico}</span>}
                  <span>R$ {Number(os.Valor_Total || 0).toFixed(2).replace('.', ',')}</span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
