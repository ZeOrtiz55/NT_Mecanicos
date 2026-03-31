'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { MecanicoProfile } from '@/lib/types'
import { User, Mail, Phone, Wrench, Calendar, AlertTriangle, Plus, X, UserPlus, ToggleLeft, ToggleRight } from 'lucide-react'

interface TecnicoComDados extends MecanicoProfile {
  osAbertas: number
  agendaHoje: number
  atrasos: number
}

export default function TecnicosPage() {
  const [tecnicos, setTecnicos] = useState<TecnicoComDados[]>([])
  const [loading, setLoading] = useState(true)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [mensagem, setMensagem] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null)

  // Form fields
  const [formNome, setFormNome] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formTelefone, setFormTelefone] = useState('')
  const [formSenha, setFormSenha] = useState('')

  const carregar = async () => {
    const hoje = new Date().toISOString().split('T')[0]

    const [{ data: tecData }, { data: osData }, { data: agendaData }, { data: atrasosData }] = await Promise.all([
      supabase.from('mecanico_usuarios').select('*').order('tecnico_nome'),
      supabase.from('Ordem_Servico').select('Os_Tecnico, Os_Tecnico2').not('Status', 'in', '("Concluida","Cancelada")'),
      supabase.from('agenda_tecnico').select('tecnico_nome').eq('data_agendada', hoje),
      supabase.from('agenda_tecnico').select('tecnico_nome').lt('data_agendada', hoje).in('status', ['agendado', 'em_andamento']),
    ])

    const tecList = (tecData || []) as MecanicoProfile[]
    const osList = osData || []
    const agendaList = agendaData || []
    const atrasosList = atrasosData || []

    const result: TecnicoComDados[] = tecList.map((t) => {
      const osCount = osList.filter((o) => o.Os_Tecnico === t.tecnico_nome || o.Os_Tecnico2 === t.tecnico_nome).length
      const agendaCount = agendaList.filter((a) => a.tecnico_nome === t.tecnico_nome).length
      const atrasosCount = atrasosList.filter((a) => a.tecnico_nome === t.tecnico_nome).length
      return { ...t, osAbertas: osCount, agendaHoje: agendaCount, atrasos: atrasosCount }
    })

    setTecnicos(result)
    setLoading(false)
  }

  useEffect(() => { carregar() }, [])

  const cadastrarTecnico = async (e: React.FormEvent) => {
    e.preventDefault()
    setSalvando(true)
    setMensagem(null)

    try {
      // 1. Criar usuário no Supabase Auth via admin (usa a API normal - o admin convida)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formEmail,
        password: formSenha,
      })

      if (authError || !authData.user) {
        setMensagem({ tipo: 'erro', texto: authError?.message || 'Erro ao criar usuário' })
        setSalvando(false)
        return
      }

      // 2. Inserir na tabela mecanico_usuarios
      const { error: insertError } = await supabase
        .from('mecanico_usuarios')
        .insert({
          id: authData.user.id,
          tecnico_nome: formNome,
          tecnico_email: formEmail,
          telefone: formTelefone || null,
          ativo: true,
        })

      if (insertError) {
        setMensagem({ tipo: 'erro', texto: 'Usuário criado mas erro ao salvar perfil: ' + insertError.message })
        setSalvando(false)
        return
      }

      setMensagem({ tipo: 'sucesso', texto: `Técnico "${formNome}" cadastrado com sucesso!` })
      setFormNome('')
      setFormEmail('')
      setFormTelefone('')
      setFormSenha('')
      setMostrarForm(false)
      await carregar()
    } catch {
      setMensagem({ tipo: 'erro', texto: 'Erro de conexão' })
    }
    setSalvando(false)
  }

  const toggleAtivo = async (tecnico: TecnicoComDados) => {
    const novoStatus = !tecnico.ativo
    const { error } = await supabase
      .from('mecanico_usuarios')
      .update({ ativo: novoStatus })
      .eq('id', tecnico.id)

    if (!error) {
      setTecnicos((prev) =>
        prev.map((t) => t.id === tecnico.id ? { ...t, ativo: novoStatus } : t)
      )
      setMensagem({
        tipo: 'sucesso',
        texto: `${tecnico.tecnico_nome} ${novoStatus ? 'ativado' : 'desativado'}.`,
      })
    }
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1E3A5F', margin: 0 }}>Técnicos</h1>
        <button
          onClick={() => setMostrarForm(!mostrarForm)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: mostrarForm ? '#6B7280' : '#1E3A5F', color: '#fff',
            border: 'none', borderRadius: 10, padding: '10px 16px',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}
        >
          {mostrarForm ? <><X size={16} /> Cancelar</> : <><UserPlus size={16} /> Cadastrar</>}
        </button>
      </div>

      {/* Mensagem de feedback */}
      {mensagem && (
        <div style={{
          padding: '10px 14px', borderRadius: 10, marginBottom: 16,
          fontSize: 13, textAlign: 'center',
          background: mensagem.tipo === 'sucesso' ? '#F0FDF4' : '#FEF2F2',
          color: mensagem.tipo === 'sucesso' ? '#16A34A' : '#DC2626',
        }}>
          {mensagem.texto}
        </div>
      )}

      {/* Form de cadastro */}
      {mostrarForm && (
        <form onSubmit={cadastrarTecnico} style={{
          background: '#fff', borderRadius: 14, padding: 20, marginBottom: 16,
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1E3A5F', marginBottom: 16, margin: '0 0 16px' }}>
            Novo Técnico
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>
                Nome completo *
              </label>
              <input
                type="text" value={formNome} onChange={(e) => setFormNome(e.target.value)}
                required placeholder="Ex: João Silva"
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 10,
                  border: '1.5px solid #E5E7EB', fontSize: 14, outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>
                E-mail *
              </label>
              <input
                type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)}
                required placeholder="tecnico@email.com"
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 10,
                  border: '1.5px solid #E5E7EB', fontSize: 14, outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>
                Telefone
              </label>
              <input
                type="tel" value={formTelefone} onChange={(e) => setFormTelefone(e.target.value)}
                placeholder="(XX) XXXXX-XXXX"
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 10,
                  border: '1.5px solid #E5E7EB', fontSize: 14, outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>
                Senha inicial *
              </label>
              <input
                type="text" value={formSenha} onChange={(e) => setFormSenha(e.target.value)}
                required placeholder="Mínimo 6 caracteres"
                minLength={6}
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 10,
                  border: '1.5px solid #E5E7EB', fontSize: 14, outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              <span style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2, display: 'block' }}>
                O técnico poderá trocar depois
              </span>
            </div>
          </div>

          <button
            type="submit" disabled={salvando}
            style={{
              width: '100%', padding: '12px 0', borderRadius: 10, marginTop: 16,
              background: salvando ? '#9CA3AF' : '#10B981', color: '#fff',
              fontSize: 14, fontWeight: 700, border: 'none',
              cursor: salvando ? 'default' : 'pointer',
            }}
          >
            {salvando ? 'Cadastrando...' : 'Cadastrar Técnico'}
          </button>
        </form>
      )}

      {/* Lista de técnicos */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {tecnicos.map((t) => (
          <div key={t.id} style={{
            background: '#fff', borderRadius: 14, padding: 16,
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
            opacity: t.ativo ? 1 : 0.5,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div style={{
                width: 48, height: 48, borderRadius: '50%',
                background: '#1E3A5F', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, fontWeight: 700,
              }}>
                {t.tecnico_nome?.charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#1E3A5F' }}>{t.tecnico_nome}</div>
                <div style={{ fontSize: 12, color: t.ativo ? '#10B981' : '#EF4444' }}>
                  {t.ativo ? 'Ativo' : 'Inativo'}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {t.atrasos > 0 && (
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '4px 8px', borderRadius: 6,
                    background: '#FEE2E2', color: '#DC2626',
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}>
                    <AlertTriangle size={10} /> {t.atrasos}
                  </span>
                )}
                <button
                  onClick={() => toggleAtivo(t)}
                  title={t.ativo ? 'Desativar' : 'Ativar'}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer', padding: 4,
                    display: 'flex', alignItems: 'center',
                  }}
                >
                  {t.ativo
                    ? <ToggleRight size={28} color="#10B981" />
                    : <ToggleLeft size={28} color="#9CA3AF" />
                  }
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: '#6B7280', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Mail size={12} /> {t.tecnico_email}
              </div>
              {t.telefone && (
                <div style={{ fontSize: 12, color: '#6B7280', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Phone size={12} /> {t.telefone}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 16, fontSize: 12 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#3B82F6' }}>
                <Calendar size={12} /> {t.agendaHoje} hoje
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#F59E0B' }}>
                <Wrench size={12} /> {t.osAbertas} OS
              </span>
              {t.atrasos > 0 && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#EF4444' }}>
                  <AlertTriangle size={12} /> {t.atrasos} atraso(s)
                </span>
              )}
            </div>
          </div>
        ))}

        {tecnicos.length === 0 && (
          <div style={{
            textAlign: 'center', padding: 40, color: '#9CA3AF', fontSize: 14,
          }}>
            <User size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
            <p>Nenhum técnico cadastrado</p>
            <p style={{ fontSize: 12 }}>Clique em &quot;Cadastrar&quot; para adicionar</p>
          </div>
        )}
      </div>
    </div>
  )
}
