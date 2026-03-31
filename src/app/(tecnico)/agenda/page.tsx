'use client'
import { useEffect, useState, useMemo, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { TURNOS } from '@/lib/constants'
import type { OrdemServico } from '@/lib/types'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  MapPin,
  Plus,
  X,
  Clock,
  AlertTriangle,
  CheckCircle,
  Send,
  Wrench,
  FileText,
  Package,
} from 'lucide-react'

interface MovimentacaoPPV {
  Id: number
  Id_PPV: string
  CodProduto: string
  Descricao: string
  Qtde: string
  Preco: number
  TipoMovimento: string
}

interface RequisicaoOS {
  id: number
  material_solicitado: string
  quantidade: string | null
  urgencia: string
  status: string
}

interface AgendaUnificada {
  id: string
  id_ordem: string | null
  data: string
  cliente: string
  cidade: string
  endereco: string
  tipo_servico: string
  projeto: string
  status_os: string
  turno: string | null
  hora_inicio: string | null
  hora_fim: string | null
  origem: 'pos' | 'agenda'
  id_ppv: string
  serv_solicitado: string
  qtd_hr: number | null
  qtd_km: number | null
  descricao_agenda: string
  revisao: string
  valor_total: number | null
  previsao_execucao: string
}

export default function AgendaTecnicoPage() {
  const { user, loading: userLoading } = useCurrentUser()
  const [items, setItems] = useState<AgendaUnificada[]>([])
  const [loading, setLoading] = useState(true)
  const [semanaOffset, setSemanaOffset] = useState(0)
  const [diaSelecionado, setDiaSelecionado] = useState<string>('')
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [pecasCache, setPecasCache] = useState<Record<string, MovimentacaoPPV[]>>({})
  const [reqCache, setReqCache] = useState<Record<string, RequisicaoOS[]>>({})
  const [loadingDetails, setLoadingDetails] = useState<string | null>(null)

  // Form state
  const [cliente, setCliente] = useState('')
  const [descricao, setDescricao] = useState('')
  const [dataSugerida, setDataSugerida] = useState('')
  const [turno, setTurno] = useState<'manha' | 'tarde' | 'integral'>('manha')
  const [urgencia, setUrgencia] = useState<'normal' | 'urgente'>('normal')

  const hojeStr = new Date().toISOString().split('T')[0]

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

  // Selecionar "hoje" por padrão ao mudar de semana
  useEffect(() => {
    const hojeNaSemana = semana.find(d => d.toISOString().split('T')[0] === hojeStr)
    if (hojeNaSemana) {
      setDiaSelecionado(hojeStr)
    } else {
      setDiaSelecionado(semana[0].toISOString().split('T')[0])
    }
  }, [semana, hojeStr])

  useEffect(() => {
    if (!user) return
    const nome = user.nome_pos || user.tecnico_nome

    const carregar = async () => {
      setLoading(true)
      const inicio = semana[0].toISOString().split('T')[0]
      const fim = semana[6].toISOString().split('T')[0]

      const { data: osData } = await supabase
        .from('Ordem_Servico')
        .select('*')
        .not('Status', 'in', '("Concluída","Cancelada","Concluida","cancelada")')
        .gte('Previsao_Execucao', inicio)
        .lte('Previsao_Execucao', fim)
        .or(`Os_Tecnico.ilike.%${nome}%,Os_Tecnico2.ilike.%${nome}%`)
        .order('Previsao_Execucao')

      const { data: agendaData } = await supabase
        .from('agenda_tecnico')
        .select('*')
        .eq('tecnico_nome', nome)
        .gte('data_agendada', inicio)
        .lte('data_agendada', fim)
        .order('data_agendada')
        .order('hora_inicio')

      const osList = (osData || []) as OrdemServico[]
      const cnpjs = [...new Set(osList.map(o => o.Cnpj_Cliente).filter(Boolean))]
      let cidadeMap: Record<string, string> = {}
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

      const unificada: AgendaUnificada[] = []
      const osIdsNaAgenda = new Set((agendaData || []).map((a: { id_ordem: string | null }) => a.id_ordem).filter(Boolean))

      for (const os of osList) {
        if (osIdsNaAgenda.has(os.Id_Ordem)) continue
        unificada.push({
          id: `pos_${os.Id_Ordem}`,
          id_ordem: os.Id_Ordem,
          data: os.Previsao_Execucao,
          cliente: os.Os_Cliente,
          cidade: cidadeMap[os.Cnpj_Cliente] || '',
          endereco: os.Endereco_Cliente || '',
          tipo_servico: os.Tipo_Servico || '',
          projeto: os.Projeto || '',
          status_os: os.Status,
          turno: null,
          hora_inicio: null,
          hora_fim: null,
          origem: 'pos',
          id_ppv: os.ID_PPV || '',
          serv_solicitado: os.Serv_Solicitado || '',
          qtd_hr: os.Qtd_HR,
          qtd_km: os.Qtd_KM,
          descricao_agenda: '',
          revisao: os.Revisao || '',
          valor_total: os.Valor_Total,
          previsao_execucao: os.Previsao_Execucao || '',
        })
      }

      for (const ag of (agendaData || [])) {
        unificada.push({
          id: `ag_${ag.id}`,
          id_ordem: ag.id_ordem,
          data: ag.data_agendada,
          cliente: ag.cliente || '',
          cidade: '',
          endereco: ag.endereco || '',
          tipo_servico: '',
          projeto: '',
          status_os: ag.status,
          turno: ag.turno,
          hora_inicio: ag.hora_inicio,
          hora_fim: ag.hora_fim,
          origem: 'agenda',
          id_ppv: '',
          serv_solicitado: '',
          qtd_hr: null,
          qtd_km: null,
          descricao_agenda: ag.descricao || '',
          revisao: '',
          valor_total: null,
          previsao_execucao: ag.data_agendada || '',
        })
      }

      unificada.sort((a, b) => a.data.localeCompare(b.data) || (a.hora_inicio || '').localeCompare(b.hora_inicio || ''))
      setItems(unificada)
      setLoading(false)
    }
    carregar()
  }, [semana, user])

  const toggleExpand = useCallback(async (item: AgendaUnificada) => {
    if (expandedId === item.id) {
      setExpandedId(null)
      return
    }
    setExpandedId(item.id)

    if (item.id_ppv && !pecasCache[item.id_ppv]) {
      setLoadingDetails(item.id)
      const { data: movs } = await supabase
        .from('movimentacoes')
        .select('*')
        .eq('Id_PPV', item.id_ppv)
      setPecasCache(prev => ({ ...prev, [item.id_ppv]: (movs || []) as MovimentacaoPPV[] }))
    }

    if (item.id_ordem && !reqCache[item.id_ordem]) {
      setLoadingDetails(item.id)
      const { data: reqs } = await supabase
        .from('mecanico_requisicoes')
        .select('id, material_solicitado, quantidade, urgencia, status')
        .eq('id_ordem', item.id_ordem)
      setReqCache(prev => ({ ...prev, [item.id_ordem!]: (reqs || []) as RequisicaoOS[] }))
    }

    setLoadingDetails(null)
  }, [expandedId, pecasCache, reqCache])

  const resetForm = () => {
    setCliente('')
    setDescricao('')
    setDataSugerida('')
    setTurno('manha')
    setUrgencia('normal')
  }

  const handleSubmit = async () => {
    if (!user || !cliente.trim() || !descricao.trim() || !dataSugerida) return

    setSubmitting(true)
    const tecnicoNome = user.nome_pos || user.tecnico_nome

    try {
      const { error: insertError } = await supabase
        .from('solicitacao_agendamento')
        .insert({
          tecnico_nome: tecnicoNome,
          cliente: cliente.trim(),
          descricao: descricao.trim(),
          data_sugerida: dataSugerida,
          turno,
          urgencia,
          status: 'pendente',
        })

      if (insertError) {
        console.error('Erro ao solicitar agendamento:', insertError)
        alert('Erro ao enviar solicitação. Tente novamente.')
        setSubmitting(false)
        return
      }

      const { data: admins } = await supabase
        .from('mecanico_usuarios')
        .select('tecnico_nome')
        .eq('role', 'admin')

      if (admins && admins.length > 0) {
        const notificacoes = admins.map((admin) => ({
          tecnico_nome: admin.tecnico_nome,
          tipo: 'solicitacao_agendamento',
          titulo: `${tecnicoNome} solicitou agendamento`,
          descricao: `Cliente: ${cliente.trim()} - ${descricao.trim()}`,
          link: '/admin/agenda',
          lida: false,
        }))
        await supabase.from('mecanico_notificacoes').insert(notificacoes)
      }

      setSuccessMsg('Solicitação enviada!')
      resetForm()
      setShowForm(false)
      setTimeout(() => setSuccessMsg(''), 4000)
    } catch (err) {
      console.error('Erro:', err)
      alert('Erro ao enviar solicitação.')
    } finally {
      setSubmitting(false)
    }
  }

  const diasNomes = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB']

  // Itens filtrados pelo dia selecionado
  const itensDoDia = useMemo(() => {
    if (!diaSelecionado) return []
    return items.filter(i => i.data === diaSelecionado)
  }, [items, diaSelecionado])

  // Contagem de itens por dia (para mostrar dots)
  const contagemPorDia = useMemo(() => {
    const map: Record<string, number> = {}
    for (const item of items) {
      map[item.data] = (map[item.data] || 0) + 1
    }
    return map
  }, [items])

  if (userLoading) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <div className="spinner" style={{ margin: '0 auto' }} />
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1F2937', margin: 0 }}>Agenda</h1>
        <button
          onClick={() => { setShowForm(true); setSuccessMsg('') }}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: '#C41E2A', color: '#fff', border: 'none',
            borderRadius: 10, padding: '8px 14px', fontSize: 13,
            fontWeight: 700, cursor: 'pointer',
          }}
        >
          <Plus size={16} /> Solicitar
        </button>
      </div>

      {successMsg && (
        <div style={{
          background: '#D1FAE5', color: '#065F46', borderRadius: 12,
          padding: '10px 14px', fontSize: 13, fontWeight: 600,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <CheckCircle size={16} /> {successMsg}
        </div>
      )}

      {/* ── Navegação da semana ── */}
      <div style={{
        background: '#fff', borderRadius: 16, padding: '12px 8px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      }}>
        {/* Mês + setas */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 12, padding: '0 8px',
        }}>
          <button onClick={() => setSemanaOffset(s => s - 1)} style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 6,
            borderRadius: 8, display: 'flex',
          }}>
            <ChevronLeft size={20} color="#6B7280" />
          </button>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#1F2937', textTransform: 'capitalize' }}>
              {semana[3].toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
            </div>
            {semanaOffset !== 0 && (
              <button
                onClick={() => setSemanaOffset(0)}
                style={{
                  fontSize: 11, color: '#C41E2A', fontWeight: 600,
                  background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                  marginTop: 2,
                }}
              >
                Voltar para hoje
              </button>
            )}
          </div>
          <button onClick={() => setSemanaOffset(s => s + 1)} style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 6,
            borderRadius: 8, display: 'flex',
          }}>
            <ChevronRight size={20} color="#6B7280" />
          </button>
        </div>

        {/* Dias da semana */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
          {semana.map((d) => {
            const dStr = d.toISOString().split('T')[0]
            const isHoje = dStr === hojeStr
            const isSelecionado = dStr === diaSelecionado
            const qtd = contagemPorDia[dStr] || 0

            return (
              <button
                key={dStr}
                onClick={() => setDiaSelecionado(dStr)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  padding: '8px 4px', borderRadius: 12, border: 'none',
                  cursor: 'pointer', transition: 'all 0.15s',
                  background: isSelecionado ? '#C41E2A' : isHoje ? '#FEF2F2' : 'transparent',
                  position: 'relative',
                }}
              >
                <span style={{
                  fontSize: 10, fontWeight: 600, marginBottom: 4,
                  color: isSelecionado ? 'rgba(255,255,255,0.7)' : '#9CA3AF',
                }}>
                  {diasNomes[d.getDay()]}
                </span>
                <span style={{
                  fontSize: 18, fontWeight: 700,
                  color: isSelecionado ? '#fff' : isHoje ? '#C41E2A' : '#1F2937',
                }}>
                  {d.getDate()}
                </span>
                {qtd > 0 && (
                  <div style={{
                    width: 6, height: 6, borderRadius: '50%', marginTop: 4,
                    background: isSelecionado ? '#fff' : '#C41E2A',
                  }} />
                )}
                {qtd === 0 && <div style={{ width: 6, height: 6, marginTop: 4 }} />}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Itens do dia selecionado ── */}
      <div>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 10,
        }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#6B7280' }}>
            {diaSelecionado === hojeStr ? 'Hoje' : new Date(diaSelecionado + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' })}
          </span>
          <span style={{
            fontSize: 12, fontWeight: 700, color: '#9CA3AF',
          }}>
            {itensDoDia.length} {itensDoDia.length === 1 ? 'item' : 'itens'}
          </span>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <div className="spinner" style={{ margin: '0 auto' }} />
          </div>
        ) : itensDoDia.length === 0 ? (
          <div style={{
            background: '#fff', borderRadius: 16, padding: '40px 20px',
            textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          }}>
            <div style={{ fontSize: 32, marginBottom: 8, opacity: 0.3 }}>📅</div>
            <div style={{ fontSize: 14, color: '#9CA3AF', fontWeight: 500 }}>
              Nada agendado para este dia
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {itensDoDia.map((item) => {
              const isPOS = item.origem === 'pos'
              const isExpanded = expandedId === item.id
              const isLoadingThis = loadingDetails === item.id
              const pecas = item.id_ppv ? (pecasCache[item.id_ppv] || []) : []
              const requisicoes = item.id_ordem ? (reqCache[item.id_ordem] || []) : []
              const turnoInfo = item.turno ? TURNOS[item.turno as keyof typeof TURNOS] : null

              const horario = item.hora_inicio
                ? `${item.hora_inicio}${item.hora_fim ? ' - ' + item.hora_fim : ''}`
                : turnoInfo
                  ? turnoInfo.label
                  : isPOS ? 'Sem horário' : null

              return (
                <div
                  key={item.id}
                  style={{
                    background: '#fff', borderRadius: 16, overflow: 'hidden',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                  }}
                >
                  {/* Card principal */}
                  <div
                    onClick={() => toggleExpand(item)}
                    style={{
                      padding: '14px 16px', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 12,
                    }}
                  >
                    {/* Ícone */}
                    <div style={{
                      width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                      background: isPOS ? '#FEF2F2' : '#EFF6FF',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {isPOS
                        ? <Wrench size={20} color="#C41E2A" />
                        : <FileText size={20} color="#1E3A5F" />
                      }
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                        {item.id_ordem && (
                          <span style={{ fontSize: 13, fontWeight: 700, color: isPOS ? '#C41E2A' : '#1E3A5F' }}>
                            {item.id_ordem}
                          </span>
                        )}
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 6,
                          background: isPOS ? '#FEF2F2' : '#EFF6FF',
                          color: isPOS ? '#C41E2A' : '#2563EB',
                        }}>
                          {isPOS ? item.status_os : 'Agendado'}
                        </span>
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#1F2937', marginBottom: 2 }}>
                        {item.cliente || 'Serviço'}
                      </div>
                      <div style={{ fontSize: 12, color: '#9CA3AF', display: 'flex', alignItems: 'center', gap: 8 }}>
                        {horario && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                            <Clock size={11} /> {horario}
                          </span>
                        )}
                        {(item.cidade || item.endereco) && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                            <MapPin size={11} /> {item.cidade || item.endereco}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Expand arrow */}
                    <div style={{ flexShrink: 0 }}>
                      {isExpanded
                        ? <ChevronUp size={18} color="#9CA3AF" />
                        : <ChevronDown size={18} color="#9CA3AF" />
                      }
                    </div>
                  </div>

                  {/* ── Expandido ── */}
                  {isExpanded && (
                    <div style={{
                      padding: '0 16px 16px',
                      borderTop: '1px solid #F3F4F6',
                    }}>
                      {isLoadingThis && (
                        <div style={{ textAlign: 'center', padding: 12 }}>
                          <div className="spinner" style={{ margin: '0 auto', width: 20, height: 20 }} />
                        </div>
                      )}

                      {/* Info da OS */}
                      {isPOS && (
                        <div style={{
                          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px',
                          padding: '14px 0', fontSize: 13,
                        }}>
                          {item.tipo_servico && (
                            <div>
                              <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 2 }}>Tipo</div>
                              <div style={{ fontWeight: 600, color: '#1F2937' }}>{item.tipo_servico}</div>
                            </div>
                          )}
                          {item.projeto && (
                            <div>
                              <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 2 }}>Projeto</div>
                              <div style={{ fontWeight: 600, color: '#1F2937' }}>{item.projeto}</div>
                            </div>
                          )}
                          {item.revisao && (
                            <div>
                              <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 2 }}>Revisão</div>
                              <div style={{ fontWeight: 600, color: '#1F2937' }}>{item.revisao}</div>
                            </div>
                          )}
                          {item.id_ppv && (
                            <div>
                              <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 2 }}>PPV</div>
                              <div style={{ fontWeight: 600, color: '#1E3A5F' }}>{item.id_ppv}</div>
                            </div>
                          )}
                          {item.qtd_hr != null && item.qtd_hr > 0 && (
                            <div>
                              <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 2 }}>Horas prev.</div>
                              <div style={{ fontWeight: 600, color: '#1F2937' }}>{item.qtd_hr}h</div>
                            </div>
                          )}
                          {item.qtd_km != null && item.qtd_km > 0 && (
                            <div>
                              <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 2 }}>KM prev.</div>
                              <div style={{ fontWeight: 600, color: '#1F2937' }}>{item.qtd_km} km</div>
                            </div>
                          )}
                          {item.endereco && (
                            <div style={{ gridColumn: '1 / -1' }}>
                              <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 2 }}>Endereço</div>
                              <div style={{ fontWeight: 500, color: '#374151', display: 'flex', alignItems: 'center', gap: 4 }}>
                                <MapPin size={12} /> {item.endereco}{item.cidade ? `, ${item.cidade}` : ''}
                              </div>
                            </div>
                          )}
                          {item.serv_solicitado && (
                            <div style={{ gridColumn: '1 / -1' }}>
                              <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 2 }}>Serviço solicitado</div>
                              <div style={{ fontWeight: 500, color: '#374151', lineHeight: 1.4 }}>
                                {item.serv_solicitado}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Descrição (agenda_tecnico) */}
                      {!isPOS && item.descricao_agenda && (
                        <div style={{
                          padding: '14px 0', fontSize: 13, color: '#374151', lineHeight: 1.5,
                        }}>
                          {item.descricao_agenda}
                        </div>
                      )}

                      {/* Turno/horário detalhado */}
                      {turnoInfo && (
                        <div style={{
                          fontSize: 12, color: '#6B7280', paddingBottom: 8,
                          display: 'flex', alignItems: 'center', gap: 4,
                        }}>
                          <Clock size={13} /> {turnoInfo.label} ({turnoInfo.horario})
                          {item.hora_inicio ? ` · Início: ${item.hora_inicio}` : ''}
                          {item.hora_fim ? ` · Fim: ${item.hora_fim}` : ''}
                        </div>
                      )}

                      {/* Peças */}
                      {isPOS && item.id_ppv && pecas.length > 0 && (
                        <div style={{
                          background: '#FFF7ED', borderRadius: 12, padding: 14, marginTop: 8,
                        }}>
                          <div style={{
                            display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10,
                            fontSize: 11, fontWeight: 700, color: '#C2410C', textTransform: 'uppercase',
                          }}>
                            <Package size={13} /> Peças ({pecas.length})
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {pecas.map((p, idx) => (
                              <div key={idx} style={{
                                background: '#fff', borderRadius: 8, padding: '8px 10px',
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                border: '1px solid #FED7AA', fontSize: 13,
                              }}>
                                <div>
                                  <div style={{ fontWeight: 600, color: '#1F2937' }}>{p.Descricao || p.CodProduto}</div>
                                  {p.CodProduto && p.Descricao && (
                                    <div style={{ fontSize: 11, color: '#9CA3AF' }}>Cód: {p.CodProduto}</div>
                                  )}
                                </div>
                                <span style={{ fontWeight: 700, color: '#C2410C' }}>×{p.Qtde}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Requisições */}
                      {item.id_ordem && requisicoes.length > 0 && (
                        <div style={{
                          background: '#F0F9FF', borderRadius: 12, padding: 14, marginTop: 8,
                        }}>
                          <div style={{
                            fontSize: 11, fontWeight: 700, color: '#0369A1', textTransform: 'uppercase',
                            marginBottom: 10,
                          }}>
                            Requisições ({requisicoes.length})
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {requisicoes.map((r) => (
                              <div key={r.id} style={{
                                background: '#fff', borderRadius: 8, padding: '8px 10px',
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                border: '1px solid #BAE6FD', fontSize: 13,
                              }}>
                                <div>
                                  <div style={{ fontWeight: 600, color: '#1F2937' }}>{r.material_solicitado}</div>
                                  {r.quantidade && <div style={{ fontSize: 11, color: '#9CA3AF' }}>Qtd: {r.quantidade}</div>}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  {r.urgencia === 'urgente' && <AlertTriangle size={12} color="#DC2626" />}
                                  <span style={{
                                    fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6,
                                    background: r.status === 'aprovada' ? '#D1FAE5' : r.status === 'recusada' ? '#FEE2E2' : '#FEF3C7',
                                    color: r.status === 'aprovada' ? '#065F46' : r.status === 'recusada' ? '#DC2626' : '#92400E',
                                  }}>
                                    {r.status}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Modal Solicitar Agendamento ── */}
      {showForm && (
        <div
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)', zIndex: 1000,
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          }}
          onClick={() => { setShowForm(false); resetForm() }}
        >
          <div
            style={{
              background: '#fff', borderRadius: '20px 20px 0 0', padding: '20px 20px 32px',
              width: '100%', maxWidth: 500, maxHeight: '85vh', overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              width: 40, height: 4, borderRadius: 2, background: '#D1D5DB',
              margin: '0 auto 16px',
            }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1F2937', margin: 0 }}>
                Solicitar Agendamento
              </h2>
              <button
                onClick={() => { setShowForm(false); resetForm() }}
                style={{
                  width: 32, height: 32, borderRadius: 8, border: 'none',
                  background: '#F3F4F6', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <X size={16} color="#6B7280" />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6, display: 'block' }}>Cliente *</label>
                <input type="text" value={cliente} onChange={(e) => setCliente(e.target.value)}
                  placeholder="Nome do cliente"
                  style={{
                    width: '100%', padding: '12px 14px', borderRadius: 12,
                    border: '2px solid #E5E7EB', fontSize: 15, outline: 'none',
                    background: '#FAFAFA', boxSizing: 'border-box',
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#C41E2A'}
                  onBlur={(e) => e.target.style.borderColor = '#E5E7EB'}
                />
              </div>

              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6, display: 'block' }}>Descrição do serviço *</label>
                <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Descreva o serviço a ser realizado" rows={2}
                  style={{
                    width: '100%', padding: '12px 14px', borderRadius: 12,
                    border: '2px solid #E5E7EB', fontSize: 15, outline: 'none',
                    background: '#FAFAFA', boxSizing: 'border-box', resize: 'none',
                    fontFamily: 'inherit',
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#C41E2A'}
                  onBlur={(e) => e.target.style.borderColor = '#E5E7EB'}
                />
              </div>

              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6, display: 'block' }}>Data sugerida *</label>
                <input type="date" value={dataSugerida} onChange={(e) => setDataSugerida(e.target.value)}
                  style={{
                    width: '100%', padding: '12px 14px', borderRadius: 12,
                    border: '2px solid #E5E7EB', fontSize: 15, outline: 'none',
                    background: '#FAFAFA', boxSizing: 'border-box',
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#C41E2A'}
                  onBlur={(e) => e.target.style.borderColor = '#E5E7EB'}
                />
              </div>

              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6, display: 'block' }}>Turno</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  {[
                    { value: 'manha', label: 'Manhã' },
                    { value: 'tarde', label: 'Tarde' },
                    { value: 'integral', label: 'Integral' },
                  ].map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setTurno(t.value as 'manha' | 'tarde' | 'integral')}
                      style={{
                        padding: '10px 8px', borderRadius: 10, fontSize: 13,
                        fontWeight: 600, cursor: 'pointer', border: 'none',
                        background: turno === t.value ? '#1E3A5F' : '#F3F4F6',
                        color: turno === t.value ? '#fff' : '#6B7280',
                      }}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6, display: 'block' }}>Urgência</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <button type="button" onClick={() => setUrgencia('normal')}
                    style={{
                      padding: '10px', borderRadius: 10, fontSize: 13,
                      fontWeight: 600, cursor: 'pointer', border: 'none',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      background: urgencia === 'normal' ? '#1E3A5F' : '#F3F4F6',
                      color: urgencia === 'normal' ? '#fff' : '#6B7280',
                    }}
                  >
                    <Clock size={14} /> Normal
                  </button>
                  <button type="button" onClick={() => setUrgencia('urgente')}
                    style={{
                      padding: '10px', borderRadius: 10, fontSize: 13,
                      fontWeight: 600, cursor: 'pointer', border: 'none',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      background: urgencia === 'urgente' ? '#C41E2A' : '#F3F4F6',
                      color: urgencia === 'urgente' ? '#fff' : '#6B7280',
                    }}
                  >
                    <AlertTriangle size={14} /> Urgente
                  </button>
                </div>
              </div>

              <button onClick={handleSubmit}
                disabled={submitting || !cliente.trim() || !descricao.trim() || !dataSugerida}
                style={{
                  width: '100%', padding: '14px 0', borderRadius: 14, marginTop: 4,
                  background: submitting || !cliente.trim() || !descricao.trim() || !dataSugerida ? '#D1D5DB' : '#C41E2A',
                  color: '#fff', border: 'none', fontSize: 16, fontWeight: 700,
                  cursor: submitting || !cliente.trim() || !descricao.trim() || !dataSugerida ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                {submitting ? (
                  <><div className="spinner" style={{ width: 18, height: 18 }} /> Enviando...</>
                ) : (
                  <><Send size={16} /> Enviar Solicitação</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
