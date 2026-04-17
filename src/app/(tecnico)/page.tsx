'use client'
import { useState } from 'react'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useCached } from '@/hooks/useCached'
import { supabase } from '@/lib/supabase'
import type { OrdemServico, AgendaItem } from '@/lib/types'
import {
  AlertTriangle, MapPin, ChevronRight, Clock, Navigation,
  Wrench, ClipboardList, FilePlus, Compass, Calendar, X, Send, Loader2,
} from 'lucide-react'
import Link from 'next/link'
import { Card, ListRow, Section, PageSpinner, EmptyState, Badge } from '@/components/ui'
import { colors, radius, shadow, text } from '@/lib/ui'

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
  agendaHoje: AgendaItem[]
  caminhosHoje: CaminhoAvulso[]
  cidadeMap: Record<string, string>
}

async function fetchHomeData(nome: string, tecnicoNome: string): Promise<HomeData> {
  const hoje = new Date().toISOString().split('T')[0]

  const [agendaRes, caminhosRes, osRes, reqRes] = await Promise.all([
    supabase
      .from('agenda_visao')
      .select('id, data, tecnico_nome, id_ordem, cliente, servico, endereco, cidade, qtd_horas, ordem_sequencia, status, observacoes')
      .eq('tecnico_nome', nome)
      .eq('data', hoje)
      .order('ordem_sequencia'),
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
  for (const os of todas) {
    const prev = os.Previsao_Execucao?.trim?.() || ''
    // Aguardando peças nunca é atrasada
    const aguardandoPecas = os.Status?.includes('peças') || os.Status?.includes('Procurando peças')
    if (aguardandoPecas) continue
    if (!prev || prev === hoje) osHoje.push(os)
    else if (prev < hoje) osAtrasadas.push(os)
  }

  const cidadeMap: Record<string, string> = {}
  const cnpjs = [...new Set(todas.map(o => o.Cnpj_Cliente).filter(Boolean))]
  if (cnpjs.length > 0) {
    const { data: cliData } = await supabase
      .from('Clientes')
      .select('cnpj_cpf, cidade')
      .in('cnpj_cpf', cnpjs)
    cliData?.forEach((c: { cnpj_cpf: string; cidade: string | null }) => {
      if (c.cidade) cidadeMap[c.cnpj_cpf] = c.cidade
    })
  }

  return {
    osHoje,
    osAtrasadas,
    reqPendentes: reqRes.count || 0,
    agendaHoje: (agendaRes.data || []) as unknown as AgendaItem[],
    caminhosHoje: (caminhosRes.data || []) as unknown as CaminhoAvulso[],
    cidadeMap,
  }
}

export default function TecnicoHome() {
  const { user } = useCurrentUser()
  const nome = user?.nome_pos || user?.tecnico_nome || ''

  const { data, loading, refreshing, refresh } = useCached<HomeData>(
    `home:${nome}`,
    () => fetchHomeData(nome, user?.tecnico_nome || ''),
    { skip: !user },
  )

  const [showModal, setShowModal] = useState(false)
  const [camCliente, setCamCliente] = useState('')
  const [camCidade, setCamCidade] = useState('')
  const [camDescricao, setCamDescricao] = useState('')
  const [camSaving, setCamSaving] = useState(false)

  const salvarCaminho = async () => {
    if (!camCliente.trim()) { alert('Informe o cliente.'); return }
    if (!camCidade.trim()) { alert('Informe a cidade.'); return }
    setCamSaving(true)
    const { error } = await supabase.from('Diario_Tecnico').insert({
      tecnico_nome: nome,
      data: new Date().toISOString().split('T')[0],
      id_ordem: null,
      cliente: camCliente.trim(),
      cidade_cliente: camCidade.trim(),
      descricao: camDescricao.trim() || null,
      status: 'em_rota',
    })
    setCamSaving(false)
    if (error) { alert('Erro ao salvar: ' + error.message); return }
    setCamCliente(''); setCamCidade(''); setCamDescricao('')
    setShowModal(false)
    refresh()
  }

  if (loading) return <PageSpinner />

  const { osHoje = [], osAtrasadas = [], reqPendentes = 0, agendaHoje = [], caminhosHoje = [], cidadeMap = {} } = data || {}
  const temAlgoHoje = agendaHoje.length > 0 || osHoje.length > 0 || caminhosHoje.length > 0
  const saudacao = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Bom dia'
    if (h < 18) return 'Boa tarde'
    return 'Boa noite'
  }

  const dataLabel = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {refreshing && <div className="refresh-bar" />}

      {/* Saudação */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, color: colors.textSubtle }}>{saudacao()},</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: colors.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user?.tecnico_nome?.split(' ')[0] || 'Técnico'}
          </div>
        </div>
        <span style={{
          fontSize: 12, fontWeight: 600, color: colors.textSubtle,
          background: colors.surface, borderRadius: radius.md, padding: '6px 12px',
          border: `1px solid ${colors.border}`, flexShrink: 0,
          textTransform: 'capitalize' as const,
        }}>
          {dataLabel}
        </span>
      </div>

      {/* ═══ PENDÊNCIAS (prioridade visual) ═══ */}
      {(osAtrasadas.length > 0 || reqPendentes > 0) && (
        <Section label="Precisa de atenção" icon={AlertTriangle} color={colors.danger}>
          {osAtrasadas.length > 0 && (
            <ListRow
              href="/os"
              icon={AlertTriangle}
              iconColor={colors.danger}
              iconBg={colors.dangerBg}
              tone="danger"
              title={
                <span style={{ color: colors.danger, fontWeight: 700 }}>
                  {osAtrasadas.length} OS atrasada{osAtrasadas.length > 1 ? 's' : ''}
                </span>
              }
              subtitle="Toque para ver e resolver"
            />
          )}
          {reqPendentes > 0 && (
            <ListRow
              href="/requisicoes"
              icon={ClipboardList}
              iconColor={colors.warning}
              iconBg={colors.warningBg}
              tone="warning"
              title={
                <span style={{ color: colors.warning, fontWeight: 700 }}>
                  {reqPendentes} requisição{reqPendentes > 1 ? 'ões' : ''} para atualizar
                </span>
              }
              subtitle="Adicione valor e comprovante"
            />
          )}
        </Section>
      )}

      {/* ═══ SEU DIA ═══ */}
      <Section label="Seu dia" icon={Calendar}>
        {!temAlgoHoje ? (
          <EmptyState
            icon={Compass}
            title="Nenhum compromisso hoje"
            subtitle="Aproveite para organizar suas ordens"
          />
        ) : (
          <>
            {/* Caminhos avulsos */}
            {caminhosHoje.map((cam) => (
              <ListRow
                key={cam.id}
                icon={Navigation}
                iconColor={cam.status === 'finalizado' ? colors.success : colors.info}
                iconBg={cam.status === 'finalizado' ? colors.successBg : colors.infoBg}
                title={cam.cliente}
                subtitle={cam.cidade_cliente}
                trailing={
                  <Badge
                    bg={cam.status === 'finalizado' ? colors.successBg : colors.infoBg}
                    color={cam.status === 'finalizado' ? colors.success : colors.info}
                  >
                    {cam.status === 'finalizado' ? 'Finalizado' : 'Em rota'}
                  </Badge>
                }
              />
            ))}

            {/* Agenda (mesma tabela do painel mecânicos) */}
            {agendaHoje.map((ag) => {
              const idOrdem = (ag as unknown as { id_ordem?: string | null }).id_ordem
              const servico = (ag as unknown as { servico?: string | null }).servico
              const endereco = (ag as unknown as { endereco?: string | null }).endereco
              const cidade = (ag as unknown as { cidade?: string | null }).cidade
              const qtdHoras = (ag as unknown as { qtd_horas?: number | null }).qtd_horas
              return (
                <ListRow
                  key={ag.id}
                  href={idOrdem ? `/os/${idOrdem}` : '/agenda'}
                  icon={Clock}
                  iconColor={colors.accent}
                  iconBg={colors.accentBg}
                  title={ag.cliente || servico || 'Serviço agendado'}
                  subtitle={servico || undefined}
                  meta={
                    <>
                      {(cidade || endereco) && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                          <MapPin size={11} /> {cidade || endereco}
                        </span>
                      )}
                      {qtdHoras != null && qtdHoras > 0 && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                          <Clock size={11} /> {qtdHoras}h
                        </span>
                      )}
                    </>
                  }
                />
              )
            })}

            {/* OS de hoje (fallback quando não há agenda) */}
            {agendaHoje.length === 0 && osHoje.map((os) => {
              const cidade = cidadeMap[os.Cnpj_Cliente]
              return (
                <ListRow
                  key={os.Id_Ordem}
                  href={`/os/${os.Id_Ordem}`}
                  icon={Wrench}
                  iconColor={colors.primary}
                  iconBg={colors.primaryBg}
                  badge={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: colors.primary }}>
                        {os.Id_Ordem}
                      </span>
                      <Badge bg={colors.infoBg} color={colors.info}>{os.Status}</Badge>
                    </div>
                  }
                  title={os.Os_Cliente}
                  subtitle={cidade || undefined}
                />
              )
            })}
          </>
        )}
      </Section>

      {/* ═══ AÇÕES RÁPIDAS ═══ */}
      <div style={{ display: 'flex', gap: 10 }}>
        <Link href="/requisicoes/nova" style={{
          flex: 1, background: colors.primary, borderRadius: radius.lg, padding: '14px 14px',
          textDecoration: 'none', color: '#fff',
          display: 'flex', alignItems: 'center', gap: 10,
          boxShadow: shadow.primary,
        }}>
          <div style={{
            width: 38, height: 38, borderRadius: radius.md, flexShrink: 0,
            background: 'rgba(255,255,255,0.18)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <FilePlus size={18} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>Nova Requisição</div>
            <div style={{ fontSize: 11, opacity: 0.8 }}>Solicitar material</div>
          </div>
        </Link>

        <Link href="/agenda" style={{
          flex: 1, background: colors.accent, borderRadius: radius.lg, padding: '14px 14px',
          textDecoration: 'none', color: '#fff',
          display: 'flex', alignItems: 'center', gap: 10,
          boxShadow: shadow.accent,
        }}>
          <div style={{
            width: 38, height: 38, borderRadius: radius.md, flexShrink: 0,
            background: 'rgba(255,255,255,0.18)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Calendar size={18} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>Agenda</div>
            <div style={{ fontSize: 11, opacity: 0.8 }}>Ver semana</div>
          </div>
        </Link>
      </div>

      {/* Botão Novo Caminho */}
      <button onClick={() => setShowModal(true)} style={{
        width: '100%', background: '#059669', borderRadius: radius.lg, padding: '14px 14px',
        border: 'none', color: '#fff', cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 10,
        boxShadow: '0 4px 12px rgba(5,150,105,0.3)',
      }}>
        <div style={{
          width: 38, height: 38, borderRadius: radius.md, flexShrink: 0,
          background: 'rgba(255,255,255,0.18)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Navigation size={18} />
        </div>
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontSize: 13, fontWeight: 700 }}>Novo Caminho</div>
          <div style={{ fontSize: 11, opacity: 0.8 }}>Registrar visita avulsa</div>
        </div>
      </button>

      {/* Modal Novo Caminho */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.5)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', padding: 20,
        }} onClick={() => setShowModal(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: '#fff', borderRadius: 20, padding: 24,
            width: '100%', maxWidth: 400, boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: colors.text, margin: 0 }}>Novo Caminho</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                <X size={20} color={colors.textMuted} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: colors.textSubtle, display: 'block', marginBottom: 6 }}>Cliente *</label>
                <input value={camCliente} onChange={e => setCamCliente(e.target.value)} placeholder="Nome do cliente"
                  style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '2px solid #E5E7EB', fontSize: 15, outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: colors.textSubtle, display: 'block', marginBottom: 6 }}>Cidade *</label>
                <input value={camCidade} onChange={e => setCamCidade(e.target.value)} placeholder="Cidade de destino"
                  style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '2px solid #E5E7EB', fontSize: 15, outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: colors.textSubtle, display: 'block', marginBottom: 6 }}>Descrição</label>
                <textarea value={camDescricao} onChange={e => setCamDescricao(e.target.value)} placeholder="O que vai fazer lá..."
                  rows={3} style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '2px solid #E5E7EB', fontSize: 15, outline: 'none', boxSizing: 'border-box', resize: 'vertical' }} />
              </div>
              <button onClick={salvarCaminho} disabled={camSaving} style={{
                width: '100%', padding: '14px 0', borderRadius: 12,
                background: camSaving ? '#9CA3AF' : '#059669', color: '#fff',
                fontSize: 15, fontWeight: 700, border: 'none',
                cursor: camSaving ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}>
                {camSaving ? <Loader2 size={18} className="spinner" /> : <Send size={18} />}
                {camSaving ? 'Salvando...' : 'Registrar Caminho'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ height: 80 }} />
    </div>
  )
}
