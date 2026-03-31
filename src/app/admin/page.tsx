'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { STATUS_AGENDA } from '@/lib/constants'
import { useAdmin } from '@/hooks/useAdmin'
import type { AgendaItem, OrdemServico, MecanicoRequisicao, Execucao } from '@/lib/types'
import { Calendar, Wrench, ClipboardList, AlertTriangle, UserPlus, CheckCircle } from 'lucide-react'
import Link from 'next/link'

interface TecnicoResumo {
  nome: string
  agendaHoje: AgendaItem[]
  osAbertas: number
  reqPendentes: number
  atrasados: number
  concluidos: number
}

export default function DashboardAdmin() {
  const { admin } = useAdmin()
  const [resumos, setResumos] = useState<TecnicoResumo[]>([])
  const [totais, setTotais] = useState({ agenda: 0, os: 0, req: 0, atrasos: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const carregar = async () => {
      const hoje = new Date().toISOString().split('T')[0]

      const [{ data: agenda }, { data: os }, { data: req }, { data: tecnicos }] = await Promise.all([
        supabase.from('agenda_tecnico').select('*').eq('data_agendada', hoje).order('hora_inicio'),
        supabase.from('Ordem_Servico').select('*').not('Status', 'in', '("Concluida","Cancelada")'),
        supabase.from('mecanico_requisicoes').select('*').eq('status', 'pendente'),
        supabase.from('mecanico_usuarios').select('tecnico_nome').eq('ativo', true).order('tecnico_nome'),
      ])

      const agendaList = agenda || []
      const osList = os || []
      const reqList = req || []
      const tecnicosList = tecnicos || []

      // Conta atrasos: agendados em dias anteriores que nao foram concluidos
      const { data: atrasados } = await supabase
        .from('agenda_tecnico')
        .select('*')
        .lt('data_agendada', hoje)
        .in('status', ['agendado', 'em_andamento'])

      const atrasosList = atrasados || []

      const map = new Map<string, TecnicoResumo>()
      for (const t of tecnicosList) {
        map.set(t.tecnico_nome, {
          nome: t.tecnico_nome,
          agendaHoje: [],
          osAbertas: 0,
          reqPendentes: 0,
          atrasados: 0,
          concluidos: 0,
        })
      }

      for (const a of agendaList) {
        const r = map.get(a.tecnico_nome)
        if (r) r.agendaHoje.push(a)
      }

      for (const o of osList) {
        const r1 = map.get(o.Os_Tecnico)
        if (r1) r1.osAbertas++
        if (o.Os_Tecnico2) {
          const r2 = map.get(o.Os_Tecnico2)
          if (r2) r2.osAbertas++
        }
      }

      for (const rq of reqList) {
        const r = map.get(rq.tecnico_nome)
        if (r) r.reqPendentes++
      }

      for (const a of atrasosList) {
        const r = map.get(a.tecnico_nome)
        if (r) r.atrasados++
      }

      // Conta concluidos hoje
      const { data: concluidos } = await supabase
        .from('agenda_tecnico')
        .select('tecnico_nome')
        .eq('data_agendada', hoje)
        .eq('status', 'concluido')

      for (const c of (concluidos || [])) {
        const r = map.get(c.tecnico_nome)
        if (r) r.concluidos++
      }

      const lista = Array.from(map.values()).sort((a, b) => b.atrasados - a.atrasados || b.agendaHoje.length - a.agendaHoje.length)

      setResumos(lista)
      setTotais({
        agenda: agendaList.length,
        os: osList.length,
        req: reqList.length,
        atrasos: atrasosList.length,
      })
      setLoading(false)
    }
    carregar()
  }, [])

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>

  const saudacao = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Bom dia'
    if (h < 18) return 'Boa tarde'
    return 'Boa noite'
  }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1E3A5F', margin: 0 }}>
          {saudacao()}, {admin?.tecnico_nome || 'Administrador'}
        </h1>
        <p style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>
          {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      {/* Ação rápida */}
      <Link href="/admin/tecnicos" style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        background: '#1E3A5F', color: '#fff', borderRadius: 12, padding: '14px 0',
        textDecoration: 'none', fontSize: 14, fontWeight: 700, marginBottom: 16,
        boxShadow: '0 2px 8px rgba(30,58,95,0.3)',
      }}>
        <UserPlus size={18} />
        Cadastrar Técnico
      </Link>

      {/* Totais */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
        <Link href="/admin/agenda" style={{
          background: '#fff', borderRadius: 14, padding: 16,
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)', textDecoration: 'none',
          display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          <Calendar size={20} color="#3B82F6" />
          <span style={{ fontSize: 24, fontWeight: 700, color: '#1F2937' }}>{totais.agenda}</span>
          <span style={{ fontSize: 12, color: '#6B7280' }}>Agendados hoje</span>
        </Link>

        <Link href="/admin/os" style={{
          background: '#fff', borderRadius: 14, padding: 16,
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)', textDecoration: 'none',
          display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          <Wrench size={20} color="#F59E0B" />
          <span style={{ fontSize: 24, fontWeight: 700, color: '#1F2937' }}>{totais.os}</span>
          <span style={{ fontSize: 12, color: '#6B7280' }}>OS abertas</span>
        </Link>

        <Link href="/admin/requisicoes" style={{
          background: '#fff', borderRadius: 14, padding: 16,
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)', textDecoration: 'none',
          display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          <ClipboardList size={20} color="#8B5CF6" />
          <span style={{ fontSize: 24, fontWeight: 700, color: '#1F2937' }}>{totais.req}</span>
          <span style={{ fontSize: 12, color: '#6B7280' }}>Requisicoes pendentes</span>
        </Link>

        <div style={{
          background: totais.atrasos > 0 ? '#FEF2F2' : '#fff', borderRadius: 14, padding: 16,
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          display: 'flex', flexDirection: 'column', gap: 8,
          border: totais.atrasos > 0 ? '1px solid #FCA5A5' : 'none',
        }}>
          <AlertTriangle size={20} color={totais.atrasos > 0 ? '#EF4444' : '#9CA3AF'} />
          <span style={{ fontSize: 24, fontWeight: 700, color: totais.atrasos > 0 ? '#DC2626' : '#1F2937' }}>{totais.atrasos}</span>
          <span style={{ fontSize: 12, color: '#6B7280' }}>Atrasos</span>
        </div>
      </div>

      {/* Resumo por tecnico */}
      <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1F2937', marginBottom: 12 }}>
        Tecnicos - Visao de Hoje
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {resumos.map((t) => (
          <div key={t.nome} style={{
            background: '#fff', borderRadius: 14, padding: 16,
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
            borderLeft: `4px solid ${t.atrasados > 0 ? '#EF4444' : t.agendaHoje.length > 0 ? '#3B82F6' : '#D1D5DB'}`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: '#1E3A5F', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: 700,
                }}>
                  {t.nome.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#1E3A5F' }}>{t.nome}</div>
                  <div style={{ fontSize: 11, color: '#9CA3AF' }}>
                    {t.agendaHoje.length} agendado(s) hoje
                  </div>
                </div>
              </div>
              {t.atrasados > 0 && (
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6,
                  background: '#FEE2E2', color: '#DC2626',
                }}>
                  {t.atrasados} atraso(s)
                </span>
              )}
            </div>

            <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#6B7280' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Wrench size={12} /> {t.osAbertas} OS
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <CheckCircle size={12} color="#10B981" /> {t.concluidos} feito(s)
              </span>
              {t.reqPendentes > 0 && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <ClipboardList size={12} color="#F59E0B" /> {t.reqPendentes} req
                </span>
              )}
            </div>

            {/* Agenda items de hoje */}
            {t.agendaHoje.length > 0 && (
              <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {t.agendaHoje.map((item) => {
                  const st = STATUS_AGENDA[item.status as keyof typeof STATUS_AGENDA]
                  return (
                    <Link key={item.id} href={item.id_ordem ? `/admin/os/${item.id_ordem}` : '/admin/agenda'} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      background: '#F9FAFB', borderRadius: 8, padding: '8px 12px',
                      textDecoration: 'none', color: 'inherit',
                    }}>
                      <div>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#1E3A5F' }}>
                          {item.id_ordem || 'Servico'}
                        </span>
                        {item.cliente && (
                          <span style={{ fontSize: 11, color: '#6B7280', marginLeft: 8 }}>{item.cliente}</span>
                        )}
                      </div>
                      <span style={{
                        fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
                        background: st?.bg, color: st?.color,
                      }}>
                        {st?.label}
                      </span>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
