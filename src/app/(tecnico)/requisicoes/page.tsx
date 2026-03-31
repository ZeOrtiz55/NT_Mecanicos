'use client'
import { useState } from 'react'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useCached } from '@/hooks/useCached'
import { supabase } from '@/lib/supabase'
import { cacheInvalidate } from '@/lib/cache'
import {
  FilePlus, ChevronRight, FileCheck, History,
  ClipboardList, XCircle, CheckCircle2, Clock, Package,
} from 'lucide-react'
import Link from 'next/link'
import { notificarPortalReq } from '@/lib/notificarPortal'

interface RequisicaoPOS {
  id: number
  titulo: string
  tipo: string
  solicitante: string
  data: string
  status: string
  fornecedor: string | null
  valor_despeza: string | null
  recibo_fornecedor: string | null
  obs: string | null
}

interface ReqData {
  pendentes: RequisicaoPOS[]
  enviadas: RequisicaoPOS[]
  historico: RequisicaoPOS[]
}

const statusLabel: Record<string, { label: string; bg: string; color: string }> = {
  pedido: { label: 'Pedido', bg: '#FFF7ED', color: '#D97706' },
  completa: { label: 'Atualizada', bg: '#ECFDF5', color: '#059669' },
  cancelada: { label: 'Cancelada', bg: '#FEF2F2', color: '#DC2626' },
  cancelar: { label: 'Cancelamento', bg: '#FEF2F2', color: '#DC2626' },
  aguardando: { label: 'Aguardando', bg: '#EFF6FF', color: '#2563EB' },
  financeiro: { label: 'Financeiro', bg: '#F5F3FF', color: '#7C3AED' },
}

async function fetchReqData(nome: string, tecnicoNome: string): Promise<ReqData> {
  const [pendRes, envRes, histRes] = await Promise.all([
    supabase
      .from('Requisicao')
      .select('id, titulo, tipo, solicitante, data, status, fornecedor, valor_despeza, recibo_fornecedor, obs')
      .or(`solicitante.ilike.%${nome}%,solicitante.eq.${tecnicoNome}`)
      .eq('status', 'pedido')
      .is('recibo_fornecedor', null)
      .order('data', { ascending: false }),
    supabase
      .from('Requisicao')
      .select('id, titulo, tipo, solicitante, data, status, fornecedor, valor_despeza, recibo_fornecedor, obs')
      .or(`solicitante.ilike.%${nome}%,solicitante.eq.${tecnicoNome}`)
      .eq('status', 'pedido')
      .order('data', { ascending: false }),
    supabase
      .from('Requisicao')
      .select('id, titulo, tipo, solicitante, data, status, fornecedor, valor_despeza, recibo_fornecedor, obs')
      .or(`solicitante.ilike.%${nome}%,solicitante.eq.${tecnicoNome}`)
      .not('status', 'in', '("pedido","lixeira")')
      .order('data', { ascending: false })
      .limit(50),
  ])

  return {
    pendentes: (pendRes.data || []) as RequisicaoPOS[],
    enviadas: (envRes.data || []) as RequisicaoPOS[],
    historico: (histRes.data || []) as RequisicaoPOS[],
  }
}

export default function RequisicoesHub() {
  const { user } = useCurrentUser()
  const nome = user?.nome_pos || user?.tecnico_nome || ''
  const cacheKey = `requisicoes:${nome}`

  const { data, loading, refreshing, refresh } = useCached<ReqData>(
    cacheKey,
    () => fetchReqData(nome, user?.tecnico_nome || ''),
    { skip: !user },
  )

  const [aba, setAba] = useState<'atualizar' | 'enviadas' | 'historico'>('enviadas')
  const [cancelando, setCancelando] = useState<number | null>(null)

  const { pendentes = [], enviadas = [], historico = [] } = data || {}

  const getSt = (status: string) => statusLabel[status] || { label: status, bg: '#F3F4F6', color: '#6B7280' }

  const solicitarCancelamento = async (id: number) => {
    const confirmar = window.confirm('Tem certeza que deseja solicitar o cancelamento desta requisição?')
    if (!confirmar) return
    setCancelando(id)
    const req = enviadas.find(r => r.id === id)
    const { error } = await supabase
      .from('Requisicao')
      .update({ status: 'cancelar' })
      .eq('id', id)
    if (error) {
      alert('Erro ao solicitar cancelamento. Tente novamente.')
    } else {
      notificarPortalReq(
        'Solicitação de Cancelamento',
        `Técnico ${nome} solicitou cancelamento da requisição #${id}${req ? ` — ${req.titulo}` : ''}`
      )
      cacheInvalidate(cacheKey)
      refresh()
    }
    setCancelando(null)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {refreshing && <div className="refresh-bar" />}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#1F2937', margin: 0 }}>
          Requisições
        </h1>
        <Link href="/requisicoes/nova" style={{
          background: '#C41E2A', borderRadius: 12, padding: '10px 16px',
          border: 'none', cursor: 'pointer', color: '#fff',
          display: 'flex', alignItems: 'center', gap: 6,
          fontSize: 13, fontWeight: 700, textDecoration: 'none',
          boxShadow: '0 2px 8px rgba(196,30,42,0.25)',
        }}>
          <FilePlus size={15} />
          Nova
        </Link>
      </div>

      {/* Resumo */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
        <div style={{
          background: pendentes.length > 0 ? '#FFF7ED' : '#F9FAFB',
          borderRadius: 14, padding: '14px 12px', textAlign: 'center',
          border: pendentes.length > 0 ? '1px solid #FED7AA' : '1px solid #F3F4F6',
        }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: pendentes.length > 0 ? '#D97706' : '#D1D5DB' }}>
            {pendentes.length}
          </div>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', marginTop: 2 }}>Pendentes</div>
        </div>
        <div style={{
          background: enviadas.length > 0 ? '#EFF6FF' : '#F9FAFB',
          borderRadius: 14, padding: '14px 12px', textAlign: 'center',
          border: enviadas.length > 0 ? '1px solid #BFDBFE' : '1px solid #F3F4F6',
        }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: enviadas.length > 0 ? '#2563EB' : '#D1D5DB' }}>
            {enviadas.length}
          </div>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', marginTop: 2 }}>Em aberto</div>
        </div>
        <div style={{
          background: historico.length > 0 ? '#ECFDF5' : '#F9FAFB',
          borderRadius: 14, padding: '14px 12px', textAlign: 'center',
          border: historico.length > 0 ? '1px solid #A7F3D0' : '1px solid #F3F4F6',
        }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: historico.length > 0 ? '#059669' : '#D1D5DB' }}>
            {historico.length}
          </div>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', marginTop: 2 }}>Histórico</div>
        </div>
      </div>

      {/* Abas */}
      <div style={{
        display: 'flex', gap: 0,
        background: '#F3F4F6', borderRadius: 14, padding: 4,
      }}>
        <button
          onClick={() => setAba('atualizar')}
          style={{
            flex: 1, padding: '12px 0', borderRadius: 12, fontSize: 14, fontWeight: 700,
            border: 'none', cursor: 'pointer', transition: 'all 0.2s',
            background: aba === 'atualizar' ? '#fff' : 'transparent',
            color: aba === 'atualizar' ? '#1F2937' : '#9CA3AF',
            boxShadow: aba === 'atualizar' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
            position: 'relative',
          }}
        >
          Atualizar
          {pendentes.length > 0 && (
            <span style={{
              position: 'absolute', top: 3, right: 8,
              background: '#EF4444', color: '#fff', fontSize: 9,
              fontWeight: 700, borderRadius: 10, minWidth: 18,
              height: 18, display: 'inline-flex', alignItems: 'center',
              justifyContent: 'center', padding: '0 4px',
            }}>
              {pendentes.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setAba('enviadas')}
          style={{
            flex: 1, padding: '12px 0', borderRadius: 12, fontSize: 14, fontWeight: 700,
            border: 'none', cursor: 'pointer', transition: 'all 0.2s',
            background: aba === 'enviadas' ? '#fff' : 'transparent',
            color: aba === 'enviadas' ? '#1F2937' : '#9CA3AF',
            boxShadow: aba === 'enviadas' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
          }}
        >
          Enviadas
        </button>
        <button
          onClick={() => setAba('historico')}
          style={{
            flex: 1, padding: '12px 0', borderRadius: 12, fontSize: 14, fontWeight: 700,
            border: 'none', cursor: 'pointer', transition: 'all 0.2s',
            background: aba === 'historico' ? '#fff' : 'transparent',
            color: aba === 'historico' ? '#1F2937' : '#9CA3AF',
            boxShadow: aba === 'historico' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
          }}
        >
          Histórico
        </button>
      </div>

      {/* === ABA ATUALIZAR === */}
      {aba === 'atualizar' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
          ) : pendentes.length === 0 ? (
            <div style={{
              background: '#fff', borderRadius: 18, padding: 48, textAlign: 'center',
              border: '1px solid #F3F4F6',
            }}>
              <div style={{
                width: 64, height: 64, borderRadius: 16, background: '#ECFDF5',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 14px',
              }}>
                <CheckCircle2 size={28} color="#059669" />
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#059669' }}>Tudo em dia!</div>
              <div style={{ fontSize: 13, color: '#D1D5DB', marginTop: 4 }}>Nenhuma pendente de atualização</div>
            </div>
          ) : (
            <>
              {pendentes.map((req) => (
                <Link key={req.id} href={`/requisicoes/atualizar/${req.id}`} style={{
                  background: '#fff', borderRadius: 16, padding: '14px 16px',
                  textDecoration: 'none', color: 'inherit',
                  display: 'flex', alignItems: 'center', gap: 12,
                  border: '1px solid #F3F4F6',
                }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                    background: '#FFF7ED',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Clock size={20} color="#D97706" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: '#C41E2A' }}>#{req.id}</span>
                      <span style={{
                        fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 6,
                        background: '#FFF7ED', color: '#D97706',
                        textTransform: 'uppercase', letterSpacing: 0.5,
                      }}>Pendente</span>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#1F2937', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {req.titulo}
                    </div>
                    <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 3 }}>
                      {req.tipo} · {new Date(req.data).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                  <ChevronRight size={18} color="#D1D5DB" style={{ flexShrink: 0 }} />
                </Link>
              ))}
            </>
          )}
        </div>
      )}

      {/* === ABA ENVIADAS === */}
      {aba === 'enviadas' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
          ) : enviadas.length === 0 ? (
            <div style={{
              background: '#fff', borderRadius: 18, padding: 48, textAlign: 'center',
              border: '1px solid #F3F4F6',
            }}>
              <div style={{
                width: 64, height: 64, borderRadius: 16, background: '#F9FAFB',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 14px',
              }}>
                <Package size={28} color="#D1D5DB" />
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#9CA3AF' }}>Nenhuma requisição enviada</div>
              <div style={{ fontSize: 13, color: '#D1D5DB', marginTop: 4 }}>Suas solicitações aparecerão aqui</div>
            </div>
          ) : (
            <>
              {enviadas.map((req) => {
                const st = getSt(req.status)
                const podeCancelar = req.status === 'pedido'

                return (
                  <div key={req.id} style={{
                    background: '#fff', borderRadius: 16, padding: '14px 16px',
                    border: '1px solid #F3F4F6',
                  }}>
                    <Link href={`/requisicoes/atualizar/${req.id}`} style={{
                      textDecoration: 'none', color: 'inherit',
                      display: 'flex', alignItems: 'center', gap: 12,
                    }}>
                      <div style={{
                        width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                        background: st.bg,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <ClipboardList size={20} color={st.color} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                          <span style={{ fontSize: 15, fontWeight: 700, color: '#C41E2A' }}>#{req.id}</span>
                          <span style={{
                            fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 6,
                            background: st.bg, color: st.color,
                            textTransform: 'uppercase', letterSpacing: 0.5,
                          }}>{st.label}</span>
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#1F2937', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {req.titulo}
                        </div>
                        <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 3 }}>
                          {req.tipo} · {req.data ? new Date(req.data).toLocaleDateString('pt-BR') : ''}
                        </div>
                      </div>
                      <ChevronRight size={18} color="#D1D5DB" style={{ flexShrink: 0 }} />
                    </Link>

                    {podeCancelar && (
                      <button
                        onClick={() => solicitarCancelamento(req.id)}
                        disabled={cancelando === req.id}
                        style={{
                          marginTop: 10, width: '100%', padding: '10px 0',
                          borderRadius: 10, border: '1px solid #FECACA',
                          background: cancelando === req.id ? '#FEF2F2' : '#fff',
                          color: '#DC2626', fontSize: 13, fontWeight: 700,
                          cursor: cancelando === req.id ? 'not-allowed' : 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                          transition: 'all 0.2s',
                        }}
                      >
                        <XCircle size={14} />
                        {cancelando === req.id ? 'Cancelando...' : 'Solicitar Cancelamento'}
                      </button>
                    )}
                  </div>
                )
              })}
            </>
          )}
        </div>
      )}

      {/* === ABA HISTÓRICO === */}
      {aba === 'historico' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
          ) : historico.length === 0 ? (
            <div style={{
              background: '#fff', borderRadius: 18, padding: 48, textAlign: 'center',
              border: '1px solid #F3F4F6',
            }}>
              <div style={{
                width: 64, height: 64, borderRadius: 16, background: '#F9FAFB',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 14px',
              }}>
                <History size={28} color="#D1D5DB" />
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#9CA3AF' }}>Nenhuma no histórico</div>
            </div>
          ) : (
            <>
              {historico.map((req) => {
                const st = getSt(req.status)
                return (
                  <div key={req.id} style={{
                    background: '#fff', borderRadius: 16, padding: '14px 16px',
                    border: '1px solid #F3F4F6',
                    display: 'flex', alignItems: 'center', gap: 12,
                  }}>
                    <div style={{
                      width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                      background: st.bg,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <FileCheck size={20} color={st.color} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                        <span style={{ fontSize: 15, fontWeight: 700, color: '#1E3A5F' }}>#{req.id}</span>
                        <span style={{
                          fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 6,
                          background: st.bg, color: st.color,
                          textTransform: 'uppercase', letterSpacing: 0.5,
                        }}>{st.label}</span>
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#1F2937', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {req.titulo}
                      </div>
                      <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 3 }}>
                        {req.tipo} · {new Date(req.data).toLocaleDateString('pt-BR')}
                        {req.fornecedor && (
                          <span style={{ color: '#059669', fontWeight: 600 }}>
                            {' '}· {req.fornecedor}
                            {req.valor_despeza ? ` · R$ ${Number(req.valor_despeza).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </>
          )}
        </div>
      )}

      <div style={{ height: 80 }} />
    </div>
  )
}
