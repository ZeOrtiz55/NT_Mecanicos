/**
 * Tokens de design — fonte única de verdade para cores, espaçamento, radius, sombras.
 * Importe a partir de qualquer componente para manter consistência visual.
 */

export const colors = {
  // Marca
  primary: '#C41E2A',
  primaryDark: '#9B1723',
  primaryBg: '#FEF2F2',
  primaryBorder: '#FECACA',

  // Acento
  accent: '#1E3A5F',
  accentBg: '#EFF6FF',
  accentBorder: '#BFDBFE',

  // Status
  success: '#059669',
  successBg: '#ECFDF5',
  successBorder: '#A7F3D0',

  warning: '#D97706',
  warningBg: '#FFF7ED',
  warningBorder: '#FED7AA',

  danger: '#DC2626',
  dangerBg: '#FEF2F2',
  dangerBorder: '#FECACA',

  info: '#2563EB',
  infoBg: '#EFF6FF',
  infoBorder: '#BFDBFE',

  // Neutros
  text: '#1F2937',
  textMuted: '#6B7280',
  textSubtle: '#9CA3AF',
  textGhost: '#D1D5DB',

  surface: '#FFFFFF',
  surfaceAlt: '#F9FAFB',
  border: '#F3F4F6',
  borderStrong: '#E5E7EB',
} as const

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
} as const

export const radius = {
  sm: 8,
  md: 12,
  lg: 14,
  xl: 16,
  pill: 999,
} as const

export const shadow = {
  none: 'none',
  sm: '0 1px 3px rgba(0,0,0,0.06)',
  md: '0 2px 8px rgba(0,0,0,0.08)',
  lg: '0 4px 16px rgba(0,0,0,0.1)',
  primary: '0 2px 8px rgba(196,30,42,0.25)',
  accent: '0 2px 8px rgba(30,58,95,0.2)',
  success: '0 2px 8px rgba(5,150,105,0.25)',
} as const

export const text = {
  // Títulos
  h1: { fontSize: 24, fontWeight: 800, color: colors.text, margin: 0 },
  h2: { fontSize: 18, fontWeight: 700, color: colors.text, margin: 0 },
  h3: { fontSize: 15, fontWeight: 700, color: colors.text, margin: 0 },

  // Corpo
  body: { fontSize: 14, color: colors.text },
  bodyMuted: { fontSize: 14, color: colors.textMuted },
  small: { fontSize: 12, color: colors.textMuted },
  tiny: { fontSize: 11, color: colors.textSubtle },

  // Label de seção (UPPERCASE)
  sectionLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: colors.textSubtle,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.8,
  },
} as const

// Mapa de status de requisição → cor
export const statusStyle: Record<string, { label: string; bg: string; color: string; border: string }> = {
  pedido: { label: 'Pedido', bg: colors.warningBg, color: colors.warning, border: colors.warningBorder },
  completa: { label: 'Atualizada', bg: colors.successBg, color: colors.success, border: colors.successBorder },
  cancelada: { label: 'Cancelada', bg: colors.dangerBg, color: colors.danger, border: colors.dangerBorder },
  cancelar: { label: 'Cancelamento', bg: colors.dangerBg, color: colors.danger, border: colors.dangerBorder },
  aguardando: { label: 'Aguardando', bg: colors.infoBg, color: colors.info, border: colors.infoBorder },
  financeiro: { label: 'Financeiro', bg: '#F5F3FF', color: '#7C3AED', border: '#DDD6FE' },
  pendente: { label: 'Pendente', bg: colors.warningBg, color: colors.warning, border: colors.warningBorder },
  preenchida: { label: 'Preenchida', bg: colors.accentBg, color: colors.accent, border: colors.accentBorder },
  enviada: { label: 'Enviada', bg: colors.successBg, color: colors.success, border: colors.successBorder },
  atrasada: { label: 'Atrasada', bg: colors.dangerBg, color: colors.danger, border: colors.dangerBorder },
}

export function getStatus(key: string) {
  return statusStyle[key] || { label: key, bg: colors.border, color: colors.textMuted, border: colors.borderStrong }
}
