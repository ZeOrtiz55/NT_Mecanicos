'use client'
import { useState } from 'react'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useCached } from '@/hooks/useCached'
import { supabase } from '@/lib/supabase'
import type { OrdemServico } from '@/lib/types'
import {
  Search, ChevronRight, Wrench, FileText, AlertTriangle,
  FileCheck, Navigation, Send, X, Clock, MapPin, CheckCircle2,
} from 'lucide-react'
import Link from 'next/link'

interface OsData {
  ordens: OrdemServico[]
  preenchidas: Set<string>
  cidadeMap: Record<string, string>
  enviadasCount: number
}

async function fetchOsData(nome: string): Promise<OsData> {
  const [osRes, envRes] = await Promise.all([
    supabase
      .from('Ordem_Servico')
      .select('*')
      .not('Status', 'in', '("Concluída","Cancelada","Concluida","cancelada")')
      .or(`Os_Tecnico.ilike.%${nome}%,Os_Tecnico2.ilike.%${nome}%`)
      .order('Id_Ordem', { ascending: false }),
    supabase
      .from('Ordem_Servico_Tecnicos')
      .select('id', { count: 'exact', head: true })
      .ilike('TecResp1', nome)
      .eq('Status', 'enviado'),
  ])

  const todas = (osRes.data || []) as OrdemServico[]
  const hoje = new Date().toISOString().split('T')[0]
  const ordens = todas.filter(o => {
    const prev = o.Previsao_Execucao?.trim?.() || ''
    if (!prev) return true
    return prev <= hoje
  })

  let preenchidas = new Set<string>()
  let cidadeMap: Record<string, string> = {}

  if (todas.length > 0) {
    const ids = todas.map(o => o.Id_Ordem)
    const [preenchRes, cliRes] = await Promise.all([
      supabase.from('Ordem_Servico_Tecnicos').select('Ordem_Servico').in('Ordem_Servico', ids),
      (() => {
        const cnpjs = [...new Set(todas.map(o => o.Cnpj_Cliente).filter(Boolean))]
        return cnpjs.length > 0
          ? supabase.from('Clientes').select('cnpj_cpf, cidade').in('cnpj_cpf', cnpjs)
          : Promise.resolve({ data: null })
      })(),
    ])
    if (preenchRes.data) {
      preenchidas = new Set(preenchRes.data.map((p: { Ordem_Servico: string }) => p.Ordem_Servico))
    }
    if (cliRes.data) {
      cliRes.data.forEach((c: { cnpj_cpf: string; cidade: string | null }) => {
        if (c.cidade) cidadeMap[c.cnpj_cpf] = c.cidade
      })
    }
  }

  return { ordens, preenchidas, cidadeMap, enviadasCount: envRes.count || 0 }
}

export default function OrdensHub() {
  const { user } = useCurrentUser()
  const nome = user?.nome_pos || user?.tecnico_nome || ''

  const { data, loading, refreshing, refresh } = useCached<OsData>(
    `os:${nome}`,
    () => fetchOsData(nome),
    { skip: !user },
  )

  const [aba, setAba] = useState<'preencher' | 'enviadas'>('preencher')
  const [busca, setBusca] = useState('')
  const [resultadoBusca, setResultadoBusca] = useState<OrdemServico[]>([])
  const [buscando, setBuscando] = useState(false)
  const [buscaCidadeMap, setBuscaCidadeMap] = useState<Record<string, string>>({})

  // Modal Novo Caminho
  const [showModal, setShowModal] = useState(false)
  const [novoCliente, setNovoCliente] = useState('')
  const [novoCidade, setNovoCidade] = useState('')
  const [novoDescricao, setNovoDescricao] = useState('')
  const [salvando, setSalvando] = useState(false)

  const enviarNovoCaminho = async () => {
    if (!novoCliente.trim() || !novoCidade.trim()) {
      alert('Preencha o cliente e a cidade/sítio.')
      return
    }
    setSalvando(true)
    const hoje = new Date().toISOString().split('T')[0]
    await supabase.from('Diario_Tecnico').insert({
      tecnico_nome: nome,
      data: hoje,
      id_ordem: null,
      cliente: novoCliente.trim(),
      endereco_cliente: '',
      cidade_cliente: novoCidade.trim(),
      descricao: novoDescricao.trim() || null,
      ordem_visita: 0,
      status: 'em_deslocamento',
      hora_saida_origem: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false }),
    })
    setNovoCliente('')
    setNovoCidade('')
    setNovoDescricao('')
    setShowModal(false)
    setSalvando(false)
    refresh()
  }

  const pesquisar = async () => {
    if (!busca.trim()) { setResultadoBusca([]); return }
    setBuscando(true)
    const { data: searchData } = await supabase
      .from('Ordem_Servico')
      .select('*')
      .not('Status', 'in', '("Concluída","Cancelada","Concluida","cancelada")')
      .or(`Id_Ordem.ilike.%${busca.trim()}%,Os_Cliente.ilike.%${busca.trim()}%,ID_PPV.ilike.%${busca.trim()}%`)
      .limit(10)
    const resultado = (searchData || []) as OrdemServico[]
    setResultadoBusca(resultado)
    if (resultado.length > 0) {
      const cnpjs = [...new Set(resultado.map(o => o.Cnpj_Cliente).filter(Boolean))]
      if (cnpjs.length > 0) {
        const { data: cliData } = await supabase.from('Clientes').select('cnpj_cpf, cidade').in('cnpj_cpf', cnpjs)
        if (cliData) {
          const mapa: Record<string, string> = {}
          cliData.forEach((c: { cnpj_cpf: string; cidade: string | null }) => { if (c.cidade) mapa[c.cnpj_cpf] = c.cidade })
          setBuscaCidadeMap(mapa)
        }
      }
    }
    setBuscando(false)
  }

  const { ordens = [], preenchidas = new Set<string>(), cidadeMap = {}, enviadasCount = 0 } = data || {}

  const hoje = new Date().toISOString().split('T')[0]
  const atrasadas = ordens.filter(o => {
    const prev = o.Previsao_Execucao?.trim?.() || ''
    return prev !== '' && prev < hoje
  })
  const deHoje = ordens.filter(o => {
    const prev = o.Previsao_Execucao?.trim?.() || ''
    return prev === '' || prev === hoje
  })
  const pendentes = ordens.filter(o => !preenchidas.has(o.Id_Ordem))

  const renderCard = (os: OrdemServico, cidMap: Record<string, string>) => {
    const jaPreenchu = preenchidas.has(os.Id_Ordem)
    const cidade = cidMap[os.Cnpj_Cliente]
    return (
      <Link key={os.Id_Ordem} href={`/os/${os.Id_Ordem}`} style={{
        background: '#fff', borderRadius: 16, padding: '14px 16px',
        textDecoration: 'none', color: 'inherit',
        display: 'flex', alignItems: 'center', gap: 12,
        border: '1px solid #F3F4F6',
      }}>
        <div style={{
          width: 42, height: 42, borderRadius: 12, flexShrink: 0,
          background: jaPreenchu ? '#ECFDF5' : '#FFF7ED',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {jaPreenchu
            ? <CheckCircle2 size={20} color="#059669" />
            : <FileText size={20} color="#D97706" />
          }
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#C41E2A' }}>{os.Id_Ordem}</span>
            <span style={{
              fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 6,
              textTransform: 'uppercase', letterSpacing: 0.5,
              background: jaPreenchu ? '#ECFDF5' : '#FFF7ED',
              color: jaPreenchu ? '#059669' : '#D97706',
            }}>
              {jaPreenchu ? 'Preenchida' : 'Pendente'}
            </span>
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#1F2937', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {os.Os_Cliente}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
            {cidade && (
              <span style={{ fontSize: 11, color: '#1E3A5F', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 2 }}>
                <MapPin size={10} /> {cidade}
              </span>
            )}
            {cidade && <span style={{ fontSize: 11, color: '#D1D5DB' }}>|</span>}
            <span style={{ fontSize: 11, color: '#9CA3AF' }}>
              {os.Tipo_Servico}{os.ID_PPV ? ` · ${os.ID_PPV}` : ''}
            </span>
          </div>
        </div>
        <ChevronRight size={18} color="#D1D5DB" style={{ flexShrink: 0 }} />
      </Link>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {refreshing && <div className="refresh-bar" />}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#1F2937', margin: 0 }}>
          Ordens
        </h1>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          style={{
            background: '#059669', borderRadius: 12, padding: '10px 16px',
            border: 'none', cursor: 'pointer', color: '#fff',
            display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 13, fontWeight: 700,
            boxShadow: '0 2px 8px rgba(5,150,105,0.25)',
          }}
        >
          <Navigation size={15} />
          Novo Caminho
        </button>
      </div>

      {/* Resumo em cards */}
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
          background: atrasadas.length > 0 ? '#FEF2F2' : '#F9FAFB',
          borderRadius: 14, padding: '14px 12px', textAlign: 'center',
          border: atrasadas.length > 0 ? '1px solid #FECACA' : '1px solid #F3F4F6',
        }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: atrasadas.length > 0 ? '#DC2626' : '#D1D5DB' }}>
            {atrasadas.length}
          </div>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', marginTop: 2 }}>Atrasadas</div>
        </div>
        <div style={{
          background: enviadasCount > 0 ? '#ECFDF5' : '#F9FAFB',
          borderRadius: 14, padding: '14px 12px', textAlign: 'center',
          border: enviadasCount > 0 ? '1px solid #A7F3D0' : '1px solid #F3F4F6',
        }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: enviadasCount > 0 ? '#059669' : '#D1D5DB' }}>
            {enviadasCount}
          </div>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', marginTop: 2 }}>Enviadas</div>
        </div>
      </div>

      {/* Abas */}
      <div style={{
        display: 'flex', gap: 0,
        background: '#F3F4F6', borderRadius: 14, padding: 4,
      }}>
        <button
          onClick={() => setAba('preencher')}
          style={{
            flex: 1, padding: '12px 0', borderRadius: 12, fontSize: 14, fontWeight: 700,
            border: 'none', cursor: 'pointer', transition: 'all 0.2s',
            background: aba === 'preencher' ? '#fff' : 'transparent',
            color: aba === 'preencher' ? '#1F2937' : '#9CA3AF',
            boxShadow: aba === 'preencher' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
          }}
        >
          <Wrench size={15} style={{ verticalAlign: 'middle', marginRight: 6 }} />
          Preencher
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
          <FileCheck size={15} style={{ verticalAlign: 'middle', marginRight: 6 }} />
          Enviadas
        </button>
      </div>

      {/* === ABA PREENCHER === */}
      {aba === 'preencher' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Busca */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: '#fff', borderRadius: 14, padding: '0 14px',
            border: '1.5px solid #E5E7EB',
          }}>
            <Search size={18} color="#9CA3AF" />
            <input
              type="text" value={busca}
              onChange={(e) => setBusca(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') pesquisar() }}
              placeholder="Buscar OS, cliente ou PPV..."
              style={{
                flex: 1, border: 'none', outline: 'none', fontSize: 15,
                padding: '14px 0', background: 'transparent', color: '#1F2937',
              }}
            />
            {busca.trim() && (
              <button
                onClick={() => { setBusca(''); setResultadoBusca([]) }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
              >
                <X size={16} color="#9CA3AF" />
              </button>
            )}
          </div>

          {/* Resultado pesquisa */}
          {busca.trim() && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 1 }}>
                Resultados
              </div>
              {buscando ? (
                <div style={{ textAlign: 'center', padding: 20 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
              ) : resultadoBusca.length === 0 ? (
                <div style={{ background: '#fff', borderRadius: 14, padding: 20, textAlign: 'center', color: '#9CA3AF', fontSize: 14, border: '1px solid #F3F4F6' }}>
                  Nenhuma OS encontrada
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {resultadoBusca.map(os => renderCard(os, buscaCidadeMap))}
                </div>
              )}
            </div>
          )}

          {loading ? (
            <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
          ) : ordens.length === 0 ? (
            <div style={{
              background: '#fff', borderRadius: 18, padding: 48, textAlign: 'center',
              border: '1px solid #F3F4F6',
            }}>
              <div style={{
                width: 64, height: 64, borderRadius: 16, background: '#F9FAFB',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 14px',
              }}>
                <Wrench size={28} color="#D1D5DB" />
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#9CA3AF' }}>Nenhuma OS atribuída</div>
              <div style={{ fontSize: 13, color: '#D1D5DB', marginTop: 4 }}>Quando houver ordens, elas aparecerão aqui</div>
            </div>
          ) : (
            <>
              {/* Atrasadas */}
              {atrasadas.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <AlertTriangle size={14} color="#DC2626" />
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#DC2626', textTransform: 'uppercase', letterSpacing: 1 }}>
                      Atrasadas ({atrasadas.length})
                    </span>
                  </div>
                  <div style={{
                    display: 'flex', flexDirection: 'column', gap: 8,
                    background: '#FEF2F2', borderRadius: 16, padding: 10,
                    border: '1px solid #FECACA',
                  }}>
                    {atrasadas.map(os => renderCard(os, cidadeMap))}
                  </div>
                </div>
              )}

              {/* Hoje */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Clock size={14} color="#6B7280" />
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 1 }}>
                    Hoje ({deHoje.length})
                  </span>
                </div>
                {deHoje.length === 0 ? (
                  <div style={{
                    background: '#fff', borderRadius: 14, padding: 20, textAlign: 'center',
                    color: '#9CA3AF', fontSize: 14, border: '1px solid #F3F4F6',
                  }}>
                    Nenhuma OS para hoje
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {deHoje.map(os => renderCard(os, cidadeMap))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* === ABA ENVIADAS === */}
      {aba === 'enviadas' && (
        <OsEnviadasTab nome={nome} loading={loading} />
      )}

      {/* Modal Novo Caminho */}
      {showModal && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 100,
            background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          }}
          onClick={() => setShowModal(false)}
        >
          <div
            style={{
              background: '#fff', borderRadius: '24px 24px 0 0',
              width: '100%', maxWidth: 480, padding: '16px 20px 32px',
              maxHeight: '85vh', overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ width: 36, height: 4, borderRadius: 2, background: '#E5E7EB', margin: '0 auto 20px' }} />

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#1F2937' }}>Novo Caminho</div>
                <div style={{ fontSize: 13, color: '#9CA3AF', marginTop: 2 }}>Registrar deslocamento avulso</div>
              </div>
              <button type="button" onClick={() => setShowModal(false)} style={{
                width: 36, height: 36, borderRadius: 10, border: 'none',
                background: '#F3F4F6', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <X size={18} color="#6B7280" />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 6, display: 'block' }}>Cliente *</label>
                <input type="text" value={novoCliente} onChange={(e) => setNovoCliente(e.target.value)}
                  placeholder="Nome do cliente"
                  style={{
                    width: '100%', padding: '14px 16px', borderRadius: 12,
                    border: '1.5px solid #E5E7EB', fontSize: 15, outline: 'none',
                    background: '#FAFAFA', boxSizing: 'border-box',
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 6, display: 'block' }}>Cidade / Sítio *</label>
                <input type="text" value={novoCidade} onChange={(e) => setNovoCidade(e.target.value)}
                  placeholder="Ex: Sítio São João, Avaré"
                  style={{
                    width: '100%', padding: '14px 16px', borderRadius: 12,
                    border: '1.5px solid #E5E7EB', fontSize: 15, outline: 'none',
                    background: '#FAFAFA', boxSizing: 'border-box',
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 6, display: 'block' }}>Descrição (opcional)</label>
                <textarea value={novoDescricao} onChange={(e) => setNovoDescricao(e.target.value)}
                  placeholder="O que vai fazer lá?"
                  rows={2}
                  style={{
                    width: '100%', padding: '14px 16px', borderRadius: 12,
                    border: '1.5px solid #E5E7EB', fontSize: 15, outline: 'none',
                    background: '#FAFAFA', boxSizing: 'border-box', resize: 'none',
                    lineHeight: 1.5,
                  }}
                />
              </div>
              <button type="button" onClick={enviarNovoCaminho} disabled={salvando || !novoCliente.trim() || !novoCidade.trim()}
                style={{
                  width: '100%', padding: '16px 0', borderRadius: 14,
                  background: !novoCliente.trim() || !novoCidade.trim() ? '#D1D5DB' : '#059669',
                  color: '#fff', border: 'none',
                  fontSize: 16, fontWeight: 700, cursor: salvando ? 'wait' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  opacity: salvando ? 0.7 : 1, marginTop: 4,
                  boxShadow: novoCliente.trim() && novoCidade.trim() ? '0 4px 12px rgba(5,150,105,0.3)' : 'none',
                  transition: 'all 0.2s',
                }}
              >
                <Send size={18} />
                {salvando ? 'Registrando...' : 'Registrar Caminho'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ height: 80 }} />
    </div>
  )
}

// ─── Aba Enviadas ───
function OsEnviadasTab({ nome, loading: parentLoading }: { nome: string; loading: boolean }) {
  const { data: ordens, loading, refreshing } = useCached(
    `os-enviadas:${nome}`,
    async () => {
      const { data } = await supabase
        .from('Ordem_Servico_Tecnicos')
        .select('*')
        .ilike('TecResp1', nome)
        .eq('Status', 'enviado')
        .order('Data', { ascending: false })
      return (data || []) as { id: number; Ordem_Servico: string; TecResp1: string; Data: string; TipoServico: string; Status: string }[]
    },
    { skip: !nome },
  )

  if (loading || parentLoading) {
    return <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
  }

  if (!ordens || ordens.length === 0) {
    return (
      <div style={{
        background: '#fff', borderRadius: 18, padding: 48, textAlign: 'center',
        border: '1px solid #F3F4F6',
      }}>
        <div style={{
          width: 64, height: 64, borderRadius: 16, background: '#F9FAFB',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 14px',
        }}>
          <Send size={28} color="#D1D5DB" />
        </div>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#9CA3AF' }}>
          Nenhuma OS enviada
        </div>
        <div style={{ fontSize: 13, color: '#D1D5DB', marginTop: 4 }}>
          Suas ordens preenchidas aparecerão aqui
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {refreshing && <div className="refresh-bar" />}
      {ordens.map((os) => (
        <Link key={os.id ?? os.Ordem_Servico} href={`/os-enviadas/${os.Ordem_Servico}`} style={{
          background: '#fff', borderRadius: 16, padding: '14px 16px',
          textDecoration: 'none', color: 'inherit',
          display: 'flex', alignItems: 'center', gap: 12,
          border: '1px solid #F3F4F6',
        }}>
          <div style={{
            width: 42, height: 42, borderRadius: 12, flexShrink: 0,
            background: '#ECFDF5',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <CheckCircle2 size={20} color="#059669" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#C41E2A' }}>{os.Ordem_Servico}</span>
              <span style={{
                fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 6,
                background: '#ECFDF5', color: '#059669',
                textTransform: 'uppercase', letterSpacing: 0.5,
              }}>
                Enviada
              </span>
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#1F2937', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {os.TipoServico || 'Ordem de Serviço'}
            </div>
            <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 3 }}>
              {os.Data ? new Date(os.Data).toLocaleDateString('pt-BR') : ''}
            </div>
          </div>
          <ChevronRight size={18} color="#D1D5DB" style={{ flexShrink: 0 }} />
        </Link>
      ))}
    </div>
  )
}
