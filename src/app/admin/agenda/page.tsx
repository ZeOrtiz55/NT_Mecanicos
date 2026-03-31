'use client'
import { useEffect, useState, useMemo, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { STATUS_AGENDA, TURNOS } from '@/lib/constants'
import type { AgendaItem, SolicitacaoAgendamento } from '@/lib/types'
import { ChevronLeft, ChevronRight, MapPin, User, CalendarPlus, Check, X, ChevronDown, ChevronUp, AlertTriangle, Clock } from 'lucide-react'
import Link from 'next/link'

export default function AgendaPage() {
  const [items, setItems] = useState<AgendaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [semanaOffset, setSemanaOffset] = useState(0)
  const [tecnicoFiltro, setTecnicoFiltro] = useState<string>('todos')
  const [tecnicos, setTecnicos] = useState<string[]>([])

  // Pending requests state
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoAgendamento[]>([])
  const [loadingSolicitacoes, setLoadingSolicitacoes] = useState(true)
  const [pendingExpanded, setPendingExpanded] = useState(true)
  const [actionLoading, setActionLoading] = useState<number | null>(null)

  const semana = useMemo(() => {
    const hoje = new Date()
    hoje.setDate(hoje.getDate() + semanaOffset * 7)
    const seg = new Date(hoje)
    seg.setDate(hoje.getDate() - hoje.getDay() + 1)
    const dias: Date[] = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(seg)
      d.setDate(seg.getDate() + i)
      dias.push(d)
    }
    return dias
  }, [semanaOffset])

  // Load pending scheduling requests
  const carregarSolicitacoes = useCallback(async () => {
    setLoadingSolicitacoes(true)
    const { data } = await supabase
      .from('solicitacao_agendamento')
      .select('*')
      .eq('status', 'pendente')
      .order('created_at', { ascending: false })

    setSolicitacoes(data || [])
    setLoadingSolicitacoes(false)
  }, [])

  useEffect(() => {
    carregarSolicitacoes()
  }, [carregarSolicitacoes])

  useEffect(() => {
    const carregar = async () => {
      setLoading(true)
      const inicio = semana[0].toISOString().split('T')[0]
      const fim = semana[6].toISOString().split('T')[0]

      const { data } = await supabase
        .from('agenda_tecnico')
        .select('*')
        .gte('data_agendada', inicio)
        .lte('data_agendada', fim)
        .order('data_agendada')
        .order('hora_inicio')

      const list = data || []
      setItems(list)

      // Extrai nomes unicos dos tecnicos
      const nomes = [...new Set(list.map((i) => i.tecnico_nome))].sort()
      setTecnicos(nomes)
      setLoading(false)
    }
    carregar()
  }, [semana])

  const formatDate = (dateStr: string) => {
    return new Date(dateStr + 'T12:00:00').toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  const handleAprovar = async (sol: SolicitacaoAgendamento) => {
    setActionLoading(sol.id)
    try {
      // 1. Update solicitacao status
      const { error: updateError } = await supabase
        .from('solicitacao_agendamento')
        .update({ status: 'aprovada' })
        .eq('id', sol.id)

      if (updateError) throw updateError

      // 2. Create agenda item
      const { error: agendaError } = await supabase
        .from('agenda_tecnico')
        .insert({
          tecnico_nome: sol.tecnico_nome,
          cliente: sol.cliente,
          descricao: sol.descricao,
          data_agendada: sol.data_sugerida,
          turno: sol.turno,
          status: 'agendado',
        })

      if (agendaError) throw agendaError

      // 3. Create notification for the technician
      const dataFormatada = formatDate(sol.data_sugerida)
      const { error: notifError } = await supabase
        .from('mecanico_notificacoes')
        .insert({
          tecnico_nome: sol.tecnico_nome,
          tipo: 'agendamento_aprovado',
          titulo: 'Agendamento aprovado',
          descricao: `Seu agendamento para ${sol.cliente} em ${dataFormatada} foi aprovado.`,
          link: '/agenda',
        })

      if (notifError) throw notifError

      // Refresh lists
      await carregarSolicitacoes()
      // Refresh agenda if the approved date falls within current week view
      const inicio = semana[0].toISOString().split('T')[0]
      const fim = semana[6].toISOString().split('T')[0]
      if (sol.data_sugerida >= inicio && sol.data_sugerida <= fim) {
        const { data } = await supabase
          .from('agenda_tecnico')
          .select('*')
          .gte('data_agendada', inicio)
          .lte('data_agendada', fim)
          .order('data_agendada')
          .order('hora_inicio')
        setItems(data || [])
      }
    } catch (err) {
      console.error('Erro ao aprovar solicitação:', err)
      alert('Erro ao aprovar solicitação. Tente novamente.')
    } finally {
      setActionLoading(null)
    }
  }

  const handleRecusar = async (sol: SolicitacaoAgendamento) => {
    setActionLoading(sol.id)
    try {
      // 1. Update solicitacao status
      const { error: updateError } = await supabase
        .from('solicitacao_agendamento')
        .update({ status: 'recusada' })
        .eq('id', sol.id)

      if (updateError) throw updateError

      // 2. Create notification for the technician
      const { error: notifError } = await supabase
        .from('mecanico_notificacoes')
        .insert({
          tecnico_nome: sol.tecnico_nome,
          tipo: 'agendamento_recusado',
          titulo: 'Agendamento recusado',
          descricao: `Sua solicitação para ${sol.cliente} foi recusada.`,
          link: '/agenda',
        })

      if (notifError) throw notifError

      // Refresh
      await carregarSolicitacoes()
    } catch (err) {
      console.error('Erro ao recusar solicitação:', err)
      alert('Erro ao recusar solicitação. Tente novamente.')
    } finally {
      setActionLoading(null)
    }
  }

  const filtered = tecnicoFiltro === 'todos' ? items : items.filter((i) => i.tecnico_nome === tecnicoFiltro)

  const hojeStr = new Date().toISOString().split('T')[0]
  const diasNomes = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab']

  return (
    <div>
      <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1E3A5F', marginBottom: 16 }}>Agenda - Todos os Tecnicos</h1>

      {/* Pending Scheduling Requests Section */}
      {!loadingSolicitacoes && solicitacoes.length > 0 && (
        <div style={{
          background: 'linear-gradient(135deg, #FFF7ED, #FEF3C7)',
          borderRadius: 14,
          border: '1.5px solid #F59E0B',
          marginBottom: 20,
          overflow: 'hidden',
        }}>
          {/* Header */}
          <button
            onClick={() => setPendingExpanded(!pendingExpanded)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 16px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <CalendarPlus size={20} color="#D97706" />
              <span style={{ fontSize: 15, fontWeight: 700, color: '#92400E' }}>
                Solicitações de Agendamento
              </span>
              <span style={{
                background: '#C41E2A',
                color: '#fff',
                fontSize: 11,
                fontWeight: 700,
                borderRadius: 10,
                padding: '2px 8px',
                minWidth: 22,
                textAlign: 'center',
              }}>
                {solicitacoes.length}
              </span>
            </div>
            {pendingExpanded ? (
              <ChevronUp size={18} color="#92400E" />
            ) : (
              <ChevronDown size={18} color="#92400E" />
            )}
          </button>

          {/* Cards */}
          {pendingExpanded && (
            <div style={{ padding: '0 12px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {solicitacoes.map((sol) => {
                const turno = TURNOS[sol.turno as keyof typeof TURNOS]
                const isProcessing = actionLoading === sol.id
                return (
                  <div key={sol.id} style={{
                    background: '#fff',
                    borderRadius: 12,
                    padding: 14,
                    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                    borderLeft: sol.urgencia === 'urgente' ? '4px solid #C41E2A' : '4px solid #F59E0B',
                    opacity: isProcessing ? 0.6 : 1,
                    pointerEvents: isProcessing ? 'none' : 'auto',
                  }}>
                    {/* Urgency badge */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <User size={13} color="#1E3A5F" />
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#1E3A5F' }}>
                          {sol.tecnico_nome}
                        </span>
                      </div>
                      {sol.urgencia === 'urgente' ? (
                        <span style={{
                          display: 'flex', alignItems: 'center', gap: 4,
                          background: '#FEE2E2', color: '#C41E2A',
                          fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6,
                        }}>
                          <AlertTriangle size={11} /> URGENTE
                        </span>
                      ) : (
                        <span style={{
                          background: '#FEF3C7', color: '#D97706',
                          fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6,
                        }}>
                          Normal
                        </span>
                      )}
                    </div>

                    {/* Client */}
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1F2937', marginBottom: 4 }}>
                      {sol.cliente}
                    </div>

                    {/* Description */}
                    {sol.descricao && (
                      <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 6 }}>
                        {sol.descricao}
                      </div>
                    )}

                    {/* Date and shift */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, fontSize: 12, color: '#4B5563' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <CalendarPlus size={12} />
                        {formatDate(sol.data_sugerida)}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={12} />
                        {turno?.label || sol.turno}
                      </span>
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => handleAprovar(sol)}
                        disabled={isProcessing}
                        style={{
                          flex: 1,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                          padding: '10px 0',
                          background: '#10B981',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 10,
                          fontSize: 13,
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        <Check size={16} />
                        Aprovar
                      </button>
                      <button
                        onClick={() => handleRecusar(sol)}
                        disabled={isProcessing}
                        style={{
                          flex: 1,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                          padding: '10px 0',
                          background: '#C41E2A',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 10,
                          fontSize: 13,
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        <X size={16} />
                        Recusar
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

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

      {/* Week nav */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 16, background: '#fff', borderRadius: 12, padding: '8px 12px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      }}>
        <button onClick={() => setSemanaOffset((s) => s - 1)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8 }}>
          <ChevronLeft size={20} color="#1E3A5F" />
        </button>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#1F2937' }}>
          {semana[0].toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} - {semana[6].toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
        </span>
        <button onClick={() => setSemanaOffset((s) => s + 1)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8 }}>
          <ChevronRight size={20} color="#1E3A5F" />
        </button>
      </div>

      {/* Day pills */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, overflowX: 'auto' }} className="no-scrollbar">
        {semana.map((d) => {
          const dStr = d.toISOString().split('T')[0]
          const isHoje = dStr === hojeStr
          const temItem = filtered.some((i) => i.data_agendada === dStr)
          return (
            <div key={dStr} style={{
              flex: '0 0 auto', textAlign: 'center', padding: '8px 10px', borderRadius: 10,
              background: isHoje ? '#1E3A5F' : temItem ? '#EFF6FF' : '#fff',
              color: isHoje ? '#fff' : '#1F2937', minWidth: 44,
              border: `1px solid ${isHoje ? '#1E3A5F' : temItem ? '#3B82F6' : '#E5E7EB'}`,
            }}>
              <div style={{ fontSize: 10, fontWeight: 500, opacity: 0.7 }}>{diasNomes[d.getDay()]}</div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>{d.getDate()}</div>
              {temItem && <div style={{ width: 5, height: 5, borderRadius: '50%', background: isHoje ? '#fff' : '#3B82F6', margin: '3px auto 0' }} />}
            </div>
          )
        })}
      </div>

      {/* Items */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
      ) : filtered.length === 0 ? (
        <div style={{
          background: '#fff', borderRadius: 14, padding: 40, textAlign: 'center',
          color: '#9CA3AF', fontSize: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        }}>
          Nenhum agendamento nesta semana
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map((item) => {
            const st = STATUS_AGENDA[item.status as keyof typeof STATUS_AGENDA]
            const turno = TURNOS[item.turno as keyof typeof TURNOS]
            const isHoje = item.data_agendada === hojeStr
            return (
              <Link
                key={item.id}
                href={item.id_ordem ? `/admin/os/${item.id_ordem}` : '#'}
                style={{
                  background: '#fff', borderRadius: 14, padding: 16,
                  boxShadow: isHoje ? '0 2px 8px rgba(30,58,95,0.15)' : '0 1px 4px rgba(0,0,0,0.06)',
                  borderLeft: `4px solid ${st?.color || '#9CA3AF'}`,
                  textDecoration: 'none', color: 'inherit',
                  border: isHoje ? '1px solid #1E3A5F' : undefined,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <div>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#1E3A5F' }}>
                      {item.id_ordem || 'Servico'}
                    </span>
                    <span style={{ fontSize: 11, color: '#6B7280', marginLeft: 8 }}>
                      {new Date(item.data_agendada + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                    </span>
                  </div>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6,
                    background: st?.bg, color: st?.color,
                  }}>
                    {st?.label}
                  </span>
                </div>
                {item.cliente && <div style={{ fontSize: 13, fontWeight: 600 }}>{item.cliente}</div>}
                <div style={{ fontSize: 12, color: '#1E3A5F', fontWeight: 600, marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <User size={12} /> {item.tecnico_nome}
                </div>
                {item.endereco && (
                  <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <MapPin size={12} /> {item.endereco}
                  </div>
                )}
                <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 6 }}>
                  {turno?.label} {item.hora_inicio ? `- ${item.hora_inicio}` : ''}{item.hora_fim ? ` - ${item.hora_fim}` : ''}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
