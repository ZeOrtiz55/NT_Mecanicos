'use client'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useCached } from '@/hooks/useCached'
import { supabase } from '@/lib/supabase'
import type { OrdemServico, AgendaItem } from '@/lib/types'
import {
  AlertTriangle, MapPin, ChevronRight, Clock, Navigation,
  Wrench, ClipboardList, FilePlus, Compass, Calendar,
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

      <div style={{ height: 80 }} />
    </div>
  )
}
