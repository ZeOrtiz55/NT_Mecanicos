'use client'
import { useRef, useEffect, useState } from 'react'
import { Eraser, Camera, Image as ImageIcon, Pen } from 'lucide-react'

interface SignaturePadProps {
  label: string
  value: string
  onSave: (dataUrl: string) => void
  allowPhoto?: boolean
}

export default function SignaturePad({ label, value, onSave, allowPhoto }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [drawing, setDrawing] = useState(false)
  const [hasDrawn, setHasDrawn] = useState(false)
  const [mode, setMode] = useState<'signature' | 'photo'>(value && !value.startsWith('data:image/png') ? 'photo' : 'signature')
  const [photoPreview, setPhotoPreview] = useState(value && !value.startsWith('data:image/png') ? value : '')

  useEffect(() => {
    if (mode !== 'signature') return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * 2
    canvas.height = rect.height * 2
    ctx.scale(2, 2)
    ctx.strokeStyle = '#1F2937'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    if (value && value.startsWith('data:image/png')) {
      const img = new Image()
      img.onload = () => {
        ctx.drawImage(img, 0, 0, rect.width, rect.height)
        setHasDrawn(true)
      }
      img.src = value
    }
  }, [mode])

  const getPos = (e: React.TouchEvent | React.MouseEvent) => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    if ('touches' in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top }
    }
    return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top }
  }

  const startDraw = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault()
    setDrawing(true)
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const pos = getPos(e)
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
  }

  const draw = (e: React.TouchEvent | React.MouseEvent) => {
    if (!drawing) return
    e.preventDefault()
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const pos = getPos(e)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
    setHasDrawn(true)
  }

  const endDraw = () => {
    setDrawing(false)
    if (hasDrawn && canvasRef.current) {
      onSave(canvasRef.current.toDataURL('image/png'))
    }
  }

  const limpar = () => {
    if (mode === 'photo') {
      setPhotoPreview('')
      onSave('')
      return
    }
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const rect = canvas.getBoundingClientRect()
    ctx.clearRect(0, 0, rect.width, rect.height)
    setHasDrawn(false)
    onSave('')
  }

  const handlePhoto = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string
      setPhotoPreview(dataUrl)
      onSave(dataUrl)
    }
    reader.readAsDataURL(file)
  }

  return (
    <div>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 8,
      }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: '#374151' }}>{label}</span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {allowPhoto && (
            <div style={{ display: 'flex', gap: 4, background: '#F3F4F6', borderRadius: 8, padding: 2 }}>
              <button type="button" onClick={() => { limpar(); setMode('signature') }}
                style={{
                  padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer',
                  background: mode === 'signature' ? '#fff' : 'transparent',
                  color: mode === 'signature' ? '#1F2937' : '#9CA3AF',
                  boxShadow: mode === 'signature' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  display: 'flex', alignItems: 'center', gap: 4,
                }}>
                <Pen size={12} /> Assinar
              </button>
              <button type="button" onClick={() => { limpar(); setMode('photo') }}
                style={{
                  padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer',
                  background: mode === 'photo' ? '#fff' : 'transparent',
                  color: mode === 'photo' ? '#1F2937' : '#9CA3AF',
                  boxShadow: mode === 'photo' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  display: 'flex', alignItems: 'center', gap: 4,
                }}>
                <Camera size={12} /> Foto
              </button>
            </div>
          )}
          <button
            type="button"
            onClick={limpar}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              fontSize: 12, color: '#EF4444', background: 'none',
              border: 'none', cursor: 'pointer', fontWeight: 600,
            }}
          >
            <Eraser size={14} /> Limpar
          </button>
        </div>
      </div>

      {mode === 'signature' ? (
        <canvas
          ref={canvasRef}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
          style={{
            width: '100%', height: 150, borderRadius: 12,
            border: '2px solid #E5E7EB', background: '#fff',
            touchAction: 'none', cursor: 'crosshair',
          }}
        />
      ) : (
        photoPreview ? (
          <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', border: '2px solid #E5E7EB' }}>
            <img src={photoPreview} alt={label} style={{ width: '100%', height: 150, objectFit: 'contain', background: '#fff' }} />
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 8, height: 150 }}>
            <label style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: 6, borderRadius: 12, cursor: 'pointer',
              border: '2px dashed #D1D5DB', background: '#FAFAFA',
            }}>
              <Camera size={28} color="#9CA3AF" />
              <span style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 600 }}>Tirar foto</span>
              <input type="file" accept="image/*" capture="environment"
                onChange={(e) => { if (e.target.files?.[0]) handlePhoto(e.target.files[0]) }}
                style={{ display: 'none' }} />
            </label>
            <label style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: 6, borderRadius: 12, cursor: 'pointer',
              border: '2px dashed #D1D5DB', background: '#FAFAFA',
            }}>
              <ImageIcon size={28} color="#9CA3AF" />
              <span style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 600 }}>Galeria</span>
              <input type="file" accept="image/*"
                onChange={(e) => { if (e.target.files?.[0]) handlePhoto(e.target.files[0]) }}
                style={{ display: 'none' }} />
            </label>
          </div>
        )
      )}
    </div>
  )
}
