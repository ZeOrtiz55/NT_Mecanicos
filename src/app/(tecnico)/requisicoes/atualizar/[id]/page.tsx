'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { use } from 'react'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useFormBackup } from '@/hooks/useFormBackup'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Upload, CheckCircle, Store } from 'lucide-react'
import Link from 'next/link'
import { notificarPortalReq } from '@/lib/notificarPortal'

interface Fornecedor {
  id: number
  nome: string
  numero: string | null
  'cpf/cnpj': string | null
  descricao: string | null
}

interface RequisicaoInfo {
  id: number
  titulo: string
  tipo: string
  data: string
  obs: string | null
  fornecedor: string | null
  valor_despeza: string | null
}

export default function AtualizarRequisicao({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { user } = useCurrentUser()
  const router = useRouter()

  const [req, setReq] = useState<RequisicaoInfo | null>(null)
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [sucesso, setSucesso] = useState(false)
  const [filtroFornecedor, setFiltroFornecedor] = useState('')
  const [showFornecedores, setShowFornecedores] = useState(false)

  const [form, setForm] = useState({
    valor: '',
    fornecedor: '',
    foto: null as File | null,
    fotoPreview: '',
  })

  // Backup automático do formulário
  const getFormData = useCallback(() => ({
    valor: form.valor, fornecedor: form.fornecedor,
  }), [form.valor, form.fornecedor])

  const setFormData = useCallback((data: Record<string, unknown>) => {
    setForm(prev => ({
      ...prev,
      valor: (data.valor as string) || prev.valor,
      fornecedor: (data.fornecedor as string) || prev.fornecedor,
    }))
  }, [])

  const { clear: clearBackup, restore: restoreBackup } = useFormBackup(`req-atualizar-${id}`, getFormData, setFormData)

  const restoredRef = useRef(false)
  useEffect(() => {
    if (!loading && !restoredRef.current) {
      restoredRef.current = true
      restoreBackup()
    }
  }, [loading, restoreBackup])

  useEffect(() => {
    const carregar = async () => {
      const [{ data: reqData }, { data: fornData }] = await Promise.all([
        supabase.from('Requisicao').select('id, titulo, tipo, data, obs, fornecedor, valor_despeza').eq('id', id).single(),
        supabase.from('Fornecedores').select('*').order('nome'),
      ])
      if (reqData) setReq(reqData as RequisicaoInfo)
      if (fornData) setFornecedores(fornData as Fornecedor[])
      setLoading(false)
    }
    carregar()
  }, [id])

  const handleFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setForm({
      ...form,
      foto: file,
      fotoPreview: URL.createObjectURL(file),
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!req || !form.valor.trim() || !form.fornecedor.trim()) return
    setSaving(true)

    let fotoUrl: string | null = null

    // Upload da foto se tiver
    if (form.foto) {
      const ext = form.foto.name.split('.').pop()
      const path = `comprovantes/${req.id}_${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('requisicoes')
        .upload(path, form.foto)

      if (!uploadError) {
        const { data: urlData } = supabase.storage.from('requisicoes').getPublicUrl(path)
        fotoUrl = urlData.publicUrl
      }
    }

    // Atualiza a Requisicao com fornecedor e valor
    await supabase.from('Requisicao')
      .update({
        fornecedor: form.fornecedor.toUpperCase(),
        valor_despeza: form.valor,
        recibo_fornecedor: fotoUrl,
        status: 'completa',
      })
      .eq('id', req.id)

    // Insere na tabela Supa-AtualizarReq para o portal receber em tempo real
    await supabase.from('Supa-AtualizarReq').insert({
      ReqREF: String(req.id),
      ReqValor: form.valor,
      ReqFotoNota: fotoUrl,
    })

    // Notifica portal (bell icon)
    const nomeTecnico = user?.nome_pos || user?.tecnico_nome || 'Técnico'
    notificarPortalReq(
      'Requisição Atualizada',
      `${nomeTecnico} atualizou a requisição #${req.id} — ${req.titulo} (R$ ${form.valor})`
    )

    setSaving(false)
    setSucesso(true)
    clearBackup()
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
  if (!req) return <div style={{ padding: 40, textAlign: 'center', color: '#9CA3AF' }}>Requisição não encontrada</div>

  if (sucesso) {
    return (
      <div style={{
        minHeight: '60vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 20,
      }}>
        <div style={{
          width: 80, height: 80, borderRadius: '50%', background: '#D1FAE5',
          display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20,
        }}>
          <CheckCircle size={40} color="#10B981" />
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1F2937', marginBottom: 8 }}>
          Requisição Atualizada!
        </h2>
        <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 24 }}>
          Os dados foram enviados com sucesso.
        </p>
        <Link href="/requisicoes" style={{
          background: '#C41E2A', color: '#fff', borderRadius: 12,
          padding: '14px 32px', fontSize: 15, fontWeight: 700,
          textDecoration: 'none',
        }}>
          Voltar às Requisições
        </Link>
      </div>
    )
  }

  const fornecedoresFiltrados = fornecedores.filter((f) =>
    f.nome.toLowerCase().includes(filtroFornecedor.toLowerCase())
  )

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '14px 16px', borderRadius: 12,
    border: '1.5px solid #E5E7EB', fontSize: 15, outline: 'none',
    background: '#fff',
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 13, fontWeight: 600, color: '#374151',
    display: 'block', marginBottom: 6,
  }

  return (
    <div>
      <Link href="/requisicoes" style={{
        display: 'flex', alignItems: 'center', gap: 6,
        color: '#C41E2A', fontSize: 14, fontWeight: 600,
        textDecoration: 'none', marginBottom: 16,
      }}>
        <ArrowLeft size={18} /> Voltar
      </Link>

      {/* Info da requisição */}
      <div style={{
        background: '#1E3A5F', borderRadius: 16, padding: 18, color: '#fff', marginBottom: 20,
      }}>
        <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>Requisição #{req.id}</div>
        <div style={{ fontSize: 17, fontWeight: 700 }}>{req.titulo}</div>
        <div style={{ fontSize: 13, opacity: 0.8, marginTop: 6 }}>
          {req.tipo} • {new Date(req.data).toLocaleDateString('pt-BR')}
        </div>
      </div>

      <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1F2937', marginBottom: 16 }}>
        Atualizar Dados
      </h2>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Valor */}
        <div>
          <label style={labelStyle}>Valor do Serviço / Material *</label>
          <input
            type="text"
            value={form.valor}
            onChange={(e) => setForm({ ...form, valor: e.target.value })}
            required
            placeholder="Ex: 150,00"
            style={inputStyle}
            inputMode="decimal"
          />
        </div>

        {/* Fornecedor */}
        <div>
          <label style={labelStyle}>Fornecedor *</label>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              value={form.fornecedor}
              onChange={(e) => {
                setForm({ ...form, fornecedor: e.target.value })
                setFiltroFornecedor(e.target.value)
                setShowFornecedores(true)
              }}
              onFocus={() => { setFiltroFornecedor(form.fornecedor); setShowFornecedores(true) }}
              required
              placeholder="Digite ou selecione o fornecedor..."
              style={inputStyle}
            />
            {showFornecedores && filtroFornecedor.length >= 0 && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20,
                background: '#fff', borderRadius: 12, marginTop: 4,
                boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                maxHeight: 200, overflowY: 'auto',
                border: '1px solid #E5E7EB',
              }}>
                {fornecedoresFiltrados.length === 0 ? (
                  <div style={{ padding: 14, fontSize: 13, color: '#9CA3AF', textAlign: 'center' }}>
                    Nenhum fornecedor encontrado
                  </div>
                ) : fornecedoresFiltrados.slice(0, 10).map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => {
                      setForm({ ...form, fornecedor: f.nome })
                      setShowFornecedores(false)
                    }}
                    style={{
                      width: '100%', padding: '12px 16px', border: 'none',
                      background: 'transparent', cursor: 'pointer',
                      textAlign: 'left', borderBottom: '1px solid #F3F4F6',
                      display: 'flex', alignItems: 'center', gap: 10,
                    }}
                  >
                    <Store size={16} color="#C41E2A" />
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#1F2937' }}>{f.nome}</div>
                      {f.descricao && <div style={{ fontSize: 11, color: '#9CA3AF' }}>{f.descricao}</div>}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Foto do comprovante */}
        <div>
          <label style={labelStyle}>Foto do Comprovante</label>
          <label style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
            background: '#fff', borderRadius: 14, padding: form.fotoPreview ? 8 : 32,
            border: '2px dashed #E5E7EB', cursor: 'pointer',
            textAlign: 'center',
          }}>
            {form.fotoPreview ? (
              <img
                src={form.fotoPreview}
                alt="Comprovante"
                style={{ width: '100%', maxHeight: 300, objectFit: 'contain', borderRadius: 10 }}
              />
            ) : (
              <>
                <Upload size={32} color="#9CA3AF" />
                <span style={{ fontSize: 14, color: '#6B7280' }}>
                  Toque para tirar foto ou selecionar
                </span>
              </>
            )}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFoto}
              style={{ display: 'none' }}
            />
          </label>
          {form.fotoPreview && (
            <button
              type="button"
              onClick={() => setForm({ ...form, foto: null, fotoPreview: '' })}
              style={{
                marginTop: 8, fontSize: 13, color: '#EF4444', background: 'none',
                border: 'none', cursor: 'pointer', fontWeight: 600,
              }}
            >
              Remover foto
            </button>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={saving || !form.valor.trim() || !form.fornecedor.trim()}
          style={{
            width: '100%', padding: '16px 0', borderRadius: 14,
            background: saving ? '#9CA3AF' : '#1E3A5F', color: '#fff',
            fontSize: 16, fontWeight: 700, border: 'none',
            cursor: saving ? 'default' : 'pointer',
            marginTop: 8, display: 'flex', alignItems: 'center',
            justifyContent: 'center', gap: 8,
          }}
        >
          <CheckCircle size={18} />
          {saving ? 'Enviando...' : 'Confirmar Atualização'}
        </button>
      </form>

      {/* Overlay para fechar dropdown */}
      {showFornecedores && (
        <div
          onClick={() => setShowFornecedores(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 10 }}
        />
      )}

      <div style={{ height: 20 }} />
    </div>
  )
}
