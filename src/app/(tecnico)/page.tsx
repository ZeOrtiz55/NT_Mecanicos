'use client'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useCached } from '@/hooks/useCached'
import { supabase } from '@/lib/supabase'
import type { OrdemServico, AgendaItem } from '@/lib/types'
import {
  AlertTriangle, MapPin, ChevronRight, Clock, Navigation,
  Wrench, ClipboardList, FilePlus, Compass,
} from 'lucide-react'
import Link from 'next/link'

interface CaminhoAvulso {
  id: number
  cliente: string
  cidade_cliente: string
  descricao: string
  status: string
  created_at: string
}

interface HomeData {
  osHoje: OrdemServico[]
  osAtrasadas: OrdemServico[]
  reqPendentes: number
  agendaFutura: number
  agendaHoje: AgendaItem[]
  caminhosHoje: CaminhoAvulso[]
  cidadeMap: Record<string, string>
}

async function fetchHomeData(nome: string, tecnicoNome: string): Promise<HomeData> {
  const hoje = new Date().toISOString().split('T')[0]

  const [agendaRes, caminhosRes, osRes, reqRes] = await Promise.all([
    supabase
      .from('agenda_tecnico')
      .select('*')
      .eq('tecnico_nome', nome)
      .eq('data_agendada', hoje)
      .neq('status', 'cancelado')
      .order('hora_inicio'),
    supabase
      .from('Diario_Tecnico')
      .select('id, cliente, cidade_cliente, descricao, status, created_at')
      .eq('tecnico_nome', nome)
      .eq('data', hoje)
      .is('id_ordem', null)
      .order('created_at'),
    supabase
      .from('Ordem_Servico')
      .select('*')
      .not('Status', 'in', '("Concluída","Cancelada","Concluida","cancelada")')
      .or(`Os_Tecnico.ilike.%${nome}%,Os_Tecnico2.ilike.%${nome}%`)
      .order('Previsao_Execucao'),
    supabase
      .from('Requisicao')
      .select('id', { count: 'exact', head: true })
      .or(`solicitante.ilike.%${nome}%,solicitante.eq.${tecnicoNome}`)
      .eq('status', 'pedido')
      .is('recibo_fornecedor', null),
  ])

  const todas = (osRes.data || []) as OrdemServico[]
  const osHoje: OrdemServico[] = []
  const osAtrasadas: OrdemServico[] = []
  let agendaFutura = 0
  for (const os of todas) {
    const prev = os.Previsao_Execucao?.trim?.() || ''
    if (!prev || prev === hoje) osHoje.push(os)
    else if (prev < hoje) osAtrasadas.push(os)
    else agendaFutura++
  }

  let cidadeMap: Record<string, string> = {}
  const cnpjs = [...new Set(todas.map(o => o.Cnpj_Cliente).filter(Boolean))]
  if (cnpjs.length > 0) {
    const { data: cliData } = await supabase
      .from('Clientes')
      .select('cnpj_cpf, cidade')
      .in('cnpj_cpf', cnpjs)
    if (cliData) {
      cliData.forEach((c: { cnpj_cpf: string; cidade: string | null }) => {
        if (c.cidade) cidadeMap[c.cnpj_cpf] = c.cidade
      })
    }
  }

  return {
    osHoje,
    osAtrasadas,
    reqPendentes: reqRes.count || 0,
    agendaFutura,
    agendaHoje: (agendaRes.data || []) as AgendaItem[],
    caminhosHoje: (caminhosRes.data || []) as CaminhoAvulso[],
    cidadeMap,
  }
}

export default function TecnicoHome() {
  const { user } = useCurrentUser()
  const nome = user?.nome_pos || user?.tecnico_nome || ''

  const { data, loading, refreshing } = useCached<HomeData>(
    `home:${nome}`,
    () => fetchHomeData(nome, user?.tecnico_nome || ''),
    { skip: !user },
  )

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>

  const saudacao = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Bom dia'
    if (h < 18) return 'Boa tarde'
    return 'Boa noite'
  }

  const { osHoje = [], osAtrasadas = [], reqPendentes = 0, agendaHoje = [], caminhosHoje = [], cidadeMap = {} } = data || {}
  const temAlgoHoje = agendaHoje.length > 0 || osHoje.length > 0 || caminhosHoje.length > 0
  const totalPendencias = osAtrasadas.length + reqPendentes

  const turnoLabel: Record<string, string> = {
    manha: 'Manhã',
    tarde: 'Tarde',
    integral: 'Integral',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {refreshing && <div className="refresh-bar" />}

      {/* Saudação */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 13, color: '#9CA3AF' }}>{saudacao()},</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#1F2937' }}>
            {user?.tecnico_nome?.split(' ')[0] || 'Técnico'}
          </div>
        </div>
        <span style={{
          fontSize: 12, fontWeight: 600, color: '#9CA3AF',
          background: '#fff', borderRadius: 10, padding: '6px 12px',
          border: '1px solid #F3F4F6',
        }}>
          {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' })}
        </span>
      </div>

      {/* ── PLANO DE HOJE ── */}
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
          Seu dia
        </div>

        {!temAlgoHoje ? (
          <div style={{
            background: '#fff', borderRadius: 16, padding: '28px 20px',
            textAlign: 'center', border: '1px solid #F3F4F6',
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: 14, background: '#F9FAFB',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 12px',
            }}>
              <Compass size={24} color="#D1D5DB" />
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#9CA3AF' }}>Nenhum compromisso hoje</div>
            <div style={{ fontSize: 13, color: '#D1D5DB', marginTop: 4 }}>Aproveite para organizar suas ordens</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {/* Caminhos avulsos */}
            {caminhosHoje.map((cam) => (
              <div key={cam.id} style={{
                background: '#fff', borderRadius: 14, padding: '12px 14px',
                display: 'flex', alignItems: 'center', gap: 12,
                border: '1px solid #F3F4F6',
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                  background: cam.status === 'finalizado' ? '#ECFDF5' : '#EFF6FF',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Navigation size={18} color={cam.status === 'finalizado' ? '#059669' : '#2563EB'} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#1F2937' }}>{cam.cliente}</div>
                  <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2, display: 'flex', alignItems: 'center', gap: 3 }}>
                    <MapPin size={10} /> {cam.cidade_cliente}
                  </div>
                </div>
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6,
                  textTransform: 'uppercase', letterSpacing: 0.5,
                  background: cam.status === 'finalizado' ? '#ECFDF5' : '#EFF6FF',
                  color: cam.status === 'finalizado' ? '#059669' : '#2563EB',
                }}>
                  {cam.status === 'finalizado' ? 'Finalizado' : 'Em rota'}
                </span>
              </div>
            ))}

            {/* Agenda */}
            {agendaHoje.map((ag) => (
              <Link key={ag.id} href={ag.id_ordem ? `/os/${ag.id_ordem}` : '/agenda'} style={{
                background: '#fff', borderRadius: 14, padding: '12px 14px',
                textDecoration: 'none', color: 'inherit',
                display: 'flex', alignItems: 'center', gap: 12,
                border: '1px solid #F3F4F6',
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                  background: '#EFF6FF',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Clock size={18} color="#1E3A5F" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#1F2937' }}>
                    {ag.cliente || ag.descricao || 'Serviço agendado'}
                  </div>
                  <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 3, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{
                      background: '#EFF6FF', color: '#1E3A5F', fontWeight: 600,
                      padding: '1px 7px', borderRadius: 5, fontSize: 11,
                    }}>
                      {turnoLabel[ag.turno] || ag.turno}
                    </span>
                    {ag.hora_inicio && <span>{ag.hora_inicio}{ag.hora_fim ? ` – ${ag.hora_fim}` : ''}</span>}
                  </div>
                </div>
                <ChevronRight size={16} color="#D1D5DB" style={{ flexShrink: 0 }} />
              </Link>
            ))}

            {/* OS de hoje (se não tem agenda) */}
            {agendaHoje.length === 0 && osHoje.map((os) => {
              const cidade = cidadeMap[os.Cnpj_Cliente]
              return (
                <Link key={os.Id_Ordem} href={`/os/${os.Id_Ordem}`} style={{
                  background: '#fff', borderRadius: 14, padding: '12px 14px',
                  textDecoration: 'none', color: 'inherit',
                  display: 'flex', alignItems: 'center', gap: 12,
                  border: '1px solid #F3F4F6',
                }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                    background: '#FEF2F2',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Wrench size={18} color="#C41E2A" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#C41E2A' }}>{os.Id_Ordem}</span>
                      <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 7px', borderRadius: 5, background: '#EFF6FF', color: '#2563EB' }}>
                        {os.Status}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, color: '#374151', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {os.Os_Cliente}
                      {cidade && <span style={{ color: '#9CA3AF' }}> · {cidade}</span>}
                    </div>
                  </div>
                  <ChevronRight size={16} color="#D1D5DB" style={{ flexShrink: 0 }} />
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* ── AÇÕES ── */}
      <div>
        <div style={{
          background: '#fff', borderRadius: 16, padding: '20px 18px',
          border: '1px solid #F3F4F6',
        }}>
          <div style={{ fontSize: 14, color: '#6B7280', lineHeight: 1.5, marginBottom: 16 }}>
            Um novo destino? Solicite uma ordem ou informe-os adicionando um novo caminho.
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <Link href="/requisicoes/nova" style={{
              flex: 1, background: '#C41E2A', borderRadius: 14, padding: '14px 12px',
              textDecoration: 'none', color: '#fff',
              display: 'flex', alignItems: 'center', gap: 10,
              boxShadow: '0 2px 8px rgba(196,30,42,0.2)',
            }}>
              <div style={{
                width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                background: 'rgba(255,255,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <FilePlus size={18} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>Nova Requisição</div>
                <div style={{ fontSize: 11, opacity: 0.8 }}>Solicitar material</div>
              </div>
            </Link>

            <Link href="/os" style={{
              flex: 1, background: '#059669', borderRadius: 14, padding: '14px 12px',
              textDecoration: 'none', color: '#fff',
              display: 'flex', alignItems: 'center', gap: 10,
              boxShadow: '0 2px 8px rgba(5,150,105,0.2)',
            }}>
              <div style={{
                width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                background: 'rgba(255,255,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Navigation size={18} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>Novo Caminho</div>
                <div style={{ fontSize: 11, opacity: 0.8 }}>Registrar destino</div>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* ── PENDÊNCIAS (por último) ── */}
      {totalPendencias > 0 && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
            Pendências
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {osAtrasadas.length > 0 && (
              <Link href="/os" style={{
                background: '#fff', borderRadius: 14, padding: '14px 16px',
                textDecoration: 'none', color: 'inherit',
                display: 'flex', alignItems: 'center', gap: 12,
                border: '1px solid #FECACA',
              }}>
                <div style={{
                  width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                  background: '#FEF2F2',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <AlertTriangle size={20} color="#DC2626" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#DC2626' }}>
                    {osAtrasadas.length} OS atrasada{osAtrasadas.length > 1 ? 's' : ''}
                  </div>
                  <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>
                    Toque para ver e resolver
                  </div>
                </div>
                <ChevronRight size={18} color="#FECACA" style={{ flexShrink: 0 }} />
              </Link>
            )}

            {reqPendentes > 0 && (
              <Link href="/requisicoes" style={{
                background: '#fff', borderRadius: 14, padding: '14px 16px',
                textDecoration: 'none', color: 'inherit',
                display: 'flex', alignItems: 'center', gap: 12,
                border: '1px solid #FED7AA',
              }}>
                <div style={{
                  width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                  background: '#FFF7ED',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <ClipboardList size={20} color="#D97706" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#D97706' }}>
                    {reqPendentes} requisição(ões) para atualizar
                  </div>
                  <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>
                    Adicione valor e comprovante
                  </div>
                </div>
                <ChevronRight size={18} color="#FED7AA" style={{ flexShrink: 0 }} />
              </Link>
            )}
          </div>
        </div>
      )}

      {/* ── O QUE VOCÊ PRECISA? (guia de ajuda) ── */}
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
          O que você precisa?
        </div>
        <div style={{
          background: '#fff', borderRadius: 16, border: '1px solid #F3F4F6',
          overflow: 'hidden',
        }}>
          {[
            {
              question: 'Preencher uma Ordem de Serviço?',
              answer: 'Vá em Ordens, escolha a OS e preencha o formulário.',
              href: '/os',
              color: '#C41E2A',
              bg: '#FEF2F2',
              icon: Wrench,
            },
            {
              question: 'Precisa de peças ou material?',
              answer: 'Crie uma nova requisição e o escritório será avisado.',
              href: '/requisicoes/nova',
              color: '#1E3A5F',
              bg: '#EFF6FF',
              icon: FilePlus,
            },
            {
              question: 'Atualizar uma requisição?',
              answer: 'Vá em Requisições > Atualizar e adicione valor e nota.',
              href: '/requisicoes',
              color: '#D97706',
              bg: '#FFF7ED',
              icon: ClipboardList,
            },
            {
              question: 'Registrar um deslocamento?',
              answer: 'Vá em Ordens e toque em "Novo Caminho".',
              href: '/os',
              color: '#059669',
              bg: '#ECFDF5',
              icon: Navigation,
            },
          ].map((item, i, arr) => {
            const Icon = item.icon
            return (
              <Link key={i} href={item.href} style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '16px 16px',
                textDecoration: 'none', color: 'inherit',
                borderBottom: i < arr.length - 1 ? '1px solid #F3F4F6' : 'none',
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                  background: item.bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon size={18} color={item.color} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#1F2937' }}>
                    {item.question}
                  </div>
                  <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2, lineHeight: 1.4 }}>
                    {item.answer}
                  </div>
                </div>
                <ChevronRight size={16} color="#D1D5DB" style={{ flexShrink: 0 }} />
              </Link>
            )
          })}
        </div>
      </div>

      <div style={{ height: 80 }} />
    </div>
  )
}
