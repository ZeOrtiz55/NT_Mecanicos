'use client'
import { useEffect, useState } from 'react'
import { use } from 'react'
import { supabase } from '@/lib/supabase'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import type { OrdemServico } from '@/lib/types'
import {
  ArrowLeft, ClipboardEdit, CheckCircle, MapPin, User, Wrench,
  Briefcase, Clock, Navigation, FileText, Hash, Plus, AlertTriangle, Save,
} from 'lucide-react'
import Link from 'next/link'

interface DiaVisita {
  data: string
  horaChegada: string
  horaSaida: string
  kmInicio: string
  kmFim: string
}

const cardStyle: React.CSSProperties = {
  background: '#fff',
  borderRadius: 14,
  padding: 16,
  boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
}

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  color: '#9CA3AF',
  marginBottom: 4,
}

const valueStyle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 600,
  color: '#1F2937',
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px', borderRadius: 10,
  border: '2px solid #E5E7EB', fontSize: 14, outline: 'none',
  background: '#fff', boxSizing: 'border-box',
}

function hoje() {
  return new Date().toISOString().split('T')[0]
}

export default function OSDetalhe({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { user } = useCurrentUser()
  const [os, setOs] = useState<OrdemServico | null>(null)
  const [jaPreenchida, setJaPreenchida] = useState(false)
  const [statusPreench, setStatusPreench] = useState('')
  const [existingId, setExistingId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [cidade, setCidade] = useState('')

  // Registro de visita (horários)
  const [dias, setDias] = useState<DiaVisita[]>([{ data: hoje(), horaChegada: '', horaSaida: '', kmInicio: '', kmFim: '' }])
  const [horariosRegistrados, setHorariosRegistrados] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [justificativa, setJustificativa] = useState('')
  const [precisaJustificar, setPrecisaJustificar] = useState(false)

  useEffect(() => {
    const carregar = async () => {
      const [{ data: osData }, { data: preench }] = await Promise.all([
        supabase.from('Ordem_Servico').select('*').eq('Id_Ordem', id).single(),
        supabase.from('Ordem_Servico_Tecnicos').select('*').eq('Ordem_Servico', id).maybeSingle(),
      ])
      if (osData) {
        setOs(osData as OrdemServico)
        if (osData.Cnpj_Cliente) {
          const { data: cli } = await supabase
            .from('Clientes')
            .select('cidade')
            .eq('cnpj_cpf', osData.Cnpj_Cliente)
            .maybeSingle()
          if (cli?.cidade) setCidade(cli.cidade)
        }
      }
      if (preench) {
        setExistingId(preench.IdOs)
        setJaPreenchida(true)
        setStatusPreench(preench.Status)

        // Carregar dias já registrados
        const diasLoaded: DiaVisita[] = []
        if (preench.DataInicio) {
          diasLoaded.push({
            data: preench.DataInicio, horaChegada: preench.InicioHora || '',
            horaSaida: preench.FinalHora || '', kmInicio: preench.InicioKm || '', kmFim: preench.FinalKm || '',
          })
        }
        if (preench.AdicionarData2 && preench.DataInicio2) {
          diasLoaded.push({
            data: preench.DataInicio2, horaChegada: preench.InicioHora2 || '',
            horaSaida: preench.FinalHora2 || '', kmInicio: preench.InicioKm2 || '', kmFim: preench.FinalKm2 || '',
          })
        }
        if (preench.AdicionarData3 && preench.DataInicio3) {
          diasLoaded.push({
            data: preench.DataInicio3, horaChegada: preench.InicioHora3 || '',
            horaSaida: preench.FinalHora3 || '', kmInicio: preench.InicioKm3 || '', kmFim: preench.FinalKm3 || '',
          })
        }
        if (diasLoaded.length > 0) {
          setDias(diasLoaded)
          // Se já tem pelo menos um dia com chegada e saída, considerar registrado
          if (diasLoaded.some(d => d.horaChegada && d.horaSaida)) {
            setHorariosRegistrados(true)
          }
        }
        // Carregar justificativa existente
        if (preench.JustificativaAtraso) {
          setJustificativa(preench.JustificativaAtraso)
        }
      }
      setLoading(false)
    }
    carregar()
  }, [id])

  // Verificar se precisa justificar (data > previsão de execução)
  useEffect(() => {
    if (!os || !dias[0]?.data) return
    const previsao = os.Previsao_Execucao
    if (previsao && dias[0].data > previsao) {
      setPrecisaJustificar(true)
    } else {
      setPrecisaJustificar(false)
    }
  }, [os, dias])

  const updateDia = (index: number, field: keyof DiaVisita, value: string) => {
    setDias(prev => prev.map((d, i) => i === index ? { ...d, [field]: value } : d))
    setHorariosRegistrados(false) // Marcar como não salvo ao editar
  }

  const calcTotalHoras = () => {
    let total = 0
    for (const d of dias) {
      if (d.horaChegada && d.horaSaida) {
        const [hi, mi] = d.horaChegada.split(':').map(Number)
        const [hf, mf] = d.horaSaida.split(':').map(Number)
        total += (hf * 60 + mf) - (hi * 60 + mi)
      }
    }
    if (total <= 0) return ''
    const h = Math.floor(total / 60)
    const m = total % 60
    return `${h}h${m > 0 ? `${m}m` : ''}`
  }

  const calcTotalKm = () => {
    let total = 0
    for (const d of dias) {
      const ini = parseFloat(d.kmInicio) || 0
      const fim = parseFloat(d.kmFim) || 0
      if (fim > ini) total += fim - ini
    }
    return total > 0 ? String(total) : ''
  }

  const salvarHorarios = async () => {
    if (!user) return

    // Validar que pelo menos o primeiro dia tem chegada e saída
    if (!dias[0].horaChegada || !dias[0].horaSaida) {
      alert('Preencha pelo menos a hora de chegada e saída do primeiro dia.')
      return
    }

    // Validar justificativa se necessário
    if (precisaJustificar && !justificativa.trim()) {
      alert('Informe a justificativa do atraso (serviço iniciado após a previsão de execução).')
      return
    }

    setSalvando(true)

    const payload: Record<string, unknown> = {
      Ordem_Servico: id,
      TecResp1: user.tecnico_nome,
      // Dia 1
      DataInicio: dias[0]?.data || '',
      DataFinal: dias[dias.length - 1]?.data || dias[0]?.data || '',
      InicioHora: dias[0]?.horaChegada || '',
      FinalHora: dias[0]?.horaSaida || '',
      InicioKm: dias[0]?.kmInicio || '',
      FinalKm: dias[0]?.kmFim || '',
      // Dia 2
      AdicionarData2: dias.length >= 2,
      DataInicio2: dias[1]?.data || '',
      InicioHora2: dias[1]?.horaChegada || '',
      FinalHora2: dias[1]?.horaSaida || '',
      InicioKm2: dias[1]?.kmInicio || '',
      FinalKm2: dias[1]?.kmFim || '',
      // Dia 3
      AdicionarData3: dias.length >= 3,
      DataInicio3: dias[2]?.data || '',
      InicioHora3: dias[2]?.horaChegada || '',
      FinaHora3: dias[2]?.horaSaida || '',
      InicioKm3: dias[2]?.kmInicio || '',
      FinalKm3: dias[2]?.kmFim || '',
      TotalHora: calcTotalHoras(),
      TotalKm: calcTotalKm(),
      Data: hoje(),
      Status: 'rascunho',
      pdf_criado: false,
      JustificativaAtraso: precisaJustificar ? justificativa.trim() : null,
    }

    if (existingId) {
      await supabase.from('Ordem_Servico_Tecnicos').update(payload).eq('IdOs', existingId)
    } else {
      const { data } = await supabase.from('Ordem_Servico_Tecnicos').insert(payload).select('IdOs').single()
      if (data) {
        setExistingId(data.IdOs)
        setJaPreenchida(true)
        setStatusPreench('rascunho')
      }
    }

    setHorariosRegistrados(true)
    setSalvando(false)
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
  if (!os) return <div style={{ padding: 40, textAlign: 'center', color: '#9CA3AF' }}>OS não encontrada</div>

  const jaEnviada = jaPreenchida && statusPreench === 'enviado'
  const formatarData = (d: string) => {
    if (!d) return ''
    const [y, m, day] = d.split('-')
    return `${day}/${m}/${y}`
  }

  return (
    <div>
      <Link href="/os" style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        color: '#C41E2A', fontSize: 15, fontWeight: 600,
        textDecoration: 'none', marginBottom: 16, padding: '8px 0',
      }}>
        <ArrowLeft size={20} /> Voltar
      </Link>

      {/* Header OS */}
      <div style={{
        background: 'linear-gradient(135deg, #C41E2A, #9B1520)', borderRadius: 18,
        padding: 20, color: '#fff', marginBottom: 20,
      }}>
        <div style={{ fontSize: 12, opacity: 0.7 }}>Ordem de Serviço</div>
        <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4 }}>{os.Id_Ordem}</div>
        <div style={{
          display: 'inline-block', marginTop: 10,
          background: 'rgba(255,255,255,0.2)', borderRadius: 8,
          padding: '4px 12px', fontSize: 12, fontWeight: 700,
        }}>
          {os.Status}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>

        {/* Client info card */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <User size={16} color="#C41E2A" />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#6B7280' }}>Cliente</span>
          </div>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#1F2937' }}>{os.Os_Cliente}</div>
          {os.Cnpj_Cliente && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: 13, color: '#6B7280' }}>
              <Hash size={14} /> {os.Cnpj_Cliente}
            </div>
          )}
          {cidade && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: 13, color: '#1E3A5F', fontWeight: 600 }}>
              <MapPin size={14} /> {cidade}
            </div>
          )}
          {os.Endereco_Cliente && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, fontSize: 13, color: '#6B7280' }}>
              <MapPin size={14} /> {os.Endereco_Cliente}
            </div>
          )}
        </div>

        {/* Service info card */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Briefcase size={16} color="#1E3A5F" />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#6B7280' }}>Serviço</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <div style={labelStyle}>Tipo de Serviço</div>
              <div style={valueStyle}>{os.Tipo_Servico || '-'}</div>
            </div>
            <div>
              <div style={labelStyle}>Projeto</div>
              <div style={valueStyle}>{os.Projeto || '-'}</div>
            </div>
          </div>

          {os.Serv_Solicitado && (
            <div>
              <div style={labelStyle}>Descrição do Serviço</div>
              <div style={{ fontSize: 14, lineHeight: 1.5, color: '#1F2937', marginTop: 2 }}>
                {os.Serv_Solicitado}
              </div>
            </div>
          )}
        </div>

        {/* Numbers row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <Clock size={14} color="#1E3A5F" />
              <span style={labelStyle}>Horas</span>
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#1E3A5F' }}>
              {os.Qtd_HR ?? '-'}
              {typeof os.Qtd_HR === 'number' && <span style={{ fontSize: 13, fontWeight: 500, color: '#6B7280' }}> h</span>}
            </div>
          </div>
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <Navigation size={14} color="#1E3A5F" />
              <span style={labelStyle}>Deslocamento</span>
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#1E3A5F' }}>
              {os.Qtd_KM ?? '-'}
              {typeof os.Qtd_KM === 'number' && <span style={{ fontSize: 13, fontWeight: 500, color: '#6B7280' }}> km</span>}
            </div>
          </div>
        </div>

        {/* PPV card */}
        {os.ID_PPV && (
          <div style={{
            ...cardStyle,
            borderLeft: '4px solid #1E3A5F',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <FileText size={16} color="#1E3A5F" />
              <div>
                <div style={labelStyle}>PPV</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#1E3A5F' }}>{os.ID_PPV}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========== REGISTRO DE HORÁRIOS (NOVO) ========== */}
      {!jaEnviada && (
        <div style={{
          background: '#fff', borderRadius: 16, padding: 18,
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginBottom: 20,
          border: horariosRegistrados ? '2px solid #10B981' : '2px solid #3B82F6',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Clock size={18} color={horariosRegistrados ? '#059669' : '#2563EB'} />
              <span style={{ fontSize: 16, fontWeight: 700, color: horariosRegistrados ? '#059669' : '#1E3A5F' }}>
                Registrar Horários
              </span>
            </div>
            {horariosRegistrados && (
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 8,
                background: '#D1FAE5', color: '#059669',
              }}>
                Salvo
              </span>
            )}
          </div>

          <p style={{ fontSize: 12, color: '#6B7280', marginBottom: 14 }}>
            Informe os horários de chegada e saída no cliente antes de preencher o relatório.
          </p>

          {/* Previsão de execução */}
          {os.Previsao_Execucao && (
            <div style={{
              background: '#F9FAFB', borderRadius: 10, padding: '10px 14px', marginBottom: 14,
              display: 'flex', alignItems: 'center', gap: 8, fontSize: 13,
            }}>
              <Clock size={14} color="#6B7280" />
              <span style={{ color: '#6B7280' }}>Previsão de execução:</span>
              <strong style={{ color: '#1E3A5F' }}>{formatarData(os.Previsao_Execucao)}</strong>
            </div>
          )}

          {/* Dias de visita */}
          {dias.map((dia, i) => (
            <div key={i} style={{
              background: '#F9FAFB', borderRadius: 12, padding: 14, marginBottom: 10,
              border: '1px solid #E5E7EB',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#6B7280' }}>
                  Dia {i + 1}
                </span>
                {i > 0 && (
                  <button type="button" onClick={() => {
                    setDias(prev => prev.filter((_, idx) => idx !== i))
                    setHorariosRegistrados(false)
                  }}
                    style={{ fontSize: 12, color: '#EF4444', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                    Remover
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div>
                  <label style={{ fontSize: 11, color: '#6B7280' }}>Data</label>
                  <input type="date" value={dia.data}
                    onChange={(e) => updateDia(i, 'data', e.target.value)}
                    style={inputStyle} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  <div>
                    <label style={{ fontSize: 11, color: '#6B7280' }}>Hora chegada</label>
                    <input type="time" value={dia.horaChegada}
                      onChange={(e) => updateDia(i, 'horaChegada', e.target.value)}
                      style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: '#6B7280' }}>Hora saída</label>
                    <input type="time" value={dia.horaSaida}
                      onChange={(e) => updateDia(i, 'horaSaida', e.target.value)}
                      style={inputStyle} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  <div>
                    <label style={{ fontSize: 11, color: '#6B7280' }}>KM início</label>
                    <input type="text" inputMode="numeric" value={dia.kmInicio}
                      onChange={(e) => updateDia(i, 'kmInicio', e.target.value)}
                      style={inputStyle} placeholder="0" />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: '#6B7280' }}>KM fim</label>
                    <input type="text" inputMode="numeric" value={dia.kmFim}
                      onChange={(e) => updateDia(i, 'kmFim', e.target.value)}
                      style={inputStyle} placeholder="0" />
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Botão adicionar dia */}
          {dias.length < 3 && (
            <button type="button" onClick={() => {
              setDias(prev => [...prev, { data: hoje(), horaChegada: '', horaSaida: '', kmInicio: '', kmFim: '' }])
              setHorariosRegistrados(false)
            }} style={{
              padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700,
              border: '2px dashed #E5E7EB', background: '#fff', color: '#6B7280', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 4, width: '100%', justifyContent: 'center',
              marginBottom: 10,
            }}>
              <Plus size={14} /> Adicionar mais um dia
            </button>
          )}

          {/* Totais */}
          {dias.some(d => d.horaChegada && d.horaSaida) && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
              <div style={{ background: '#DBEAFE', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: '#6B7280' }}>Total Horas</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#1E3A5F' }}>{calcTotalHoras() || '—'}</div>
              </div>
              <div style={{ background: '#DBEAFE', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: '#6B7280' }}>Total KM</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#1E3A5F' }}>{calcTotalKm() || '—'}</div>
              </div>
            </div>
          )}

          {/* Justificativa de atraso */}
          {precisaJustificar && (
            <div style={{
              background: '#FEF2F2', borderRadius: 12, padding: 14, marginBottom: 12,
              border: '2px solid #FECACA',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <AlertTriangle size={18} color="#DC2626" />
                <span style={{ fontSize: 14, fontWeight: 700, color: '#DC2626' }}>
                  Justificativa de Atraso
                </span>
              </div>
              <p style={{ fontSize: 12, color: '#991B1B', marginBottom: 8 }}>
                A data de início ({formatarData(dias[0].data)}) é posterior à previsão de execução ({formatarData(os.Previsao_Execucao)}).
                Explique o motivo do atraso.
              </p>
              <textarea
                value={justificativa}
                onChange={(e) => { setJustificativa(e.target.value); setHorariosRegistrados(false) }}
                placeholder="Ex: Aguardando peças, cliente indisponível..."
                rows={3}
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </div>
          )}

          {/* Botão salvar */}
          <button type="button" onClick={salvarHorarios} disabled={salvando} style={{
            width: '100%', padding: '14px 0', borderRadius: 12,
            background: salvando ? '#9CA3AF' : '#1E3A5F', color: '#fff',
            border: 'none', fontSize: 15, fontWeight: 700, cursor: salvando ? 'default' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            <Save size={18} />
            {salvando ? 'Salvando...' : 'Salvar Horários'}
          </button>
        </div>
      )}

      {/* Fill/edit button */}
      {jaEnviada ? (
        <div style={{
          background: '#D1FAE5', borderRadius: 16, padding: '20px 18px',
          display: 'flex', alignItems: 'center', gap: 14,
          border: '2px solid #6EE7B7',
        }}>
          <CheckCircle size={28} color="#059669" />
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#059669' }}>OS já enviada</div>
            <div style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>Esta OS técnica já foi preenchida e enviada.</div>
          </div>
        </div>
      ) : !horariosRegistrados ? (
        <div style={{
          background: '#F3F4F6', borderRadius: 16, padding: '20px 18px',
          display: 'flex', alignItems: 'center', gap: 14,
          border: '2px solid #E5E7EB',
        }}>
          <Clock size={28} color="#9CA3AF" />
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#6B7280' }}>Registre os horários primeiro</div>
            <div style={{ fontSize: 13, color: '#9CA3AF', marginTop: 2 }}>Salve os horários de chegada e saída para liberar o preenchimento do relatório.</div>
          </div>
        </div>
      ) : (
        <Link href={`/os/${os.Id_Ordem}/preencher`} style={{
          display: 'flex', alignItems: 'center', gap: 14,
          background: jaPreenchida ? '#1E3A5F' : 'linear-gradient(135deg, #C41E2A, #9B1520)',
          color: '#fff', borderRadius: 16, padding: '22px 20px',
          textDecoration: 'none',
          boxShadow: '0 6px 20px rgba(196,30,42,0.3)',
        }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14,
            background: 'rgba(255,255,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            {jaPreenchida ? <Wrench size={26} /> : <ClipboardEdit size={26} />}
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>
              {jaPreenchida ? 'Editar OS Técnica' : 'Preencher OS Técnica'}
            </div>
            <div style={{ fontSize: 13, opacity: 0.8, marginTop: 2 }}>
              {jaPreenchida ? 'Rascunho salvo — toque para continuar' : 'Horários registrados — preencha o relatório'}
            </div>
          </div>
        </Link>
      )}

      <div style={{ height: 20 }} />
    </div>
  )
}
