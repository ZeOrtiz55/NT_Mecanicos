import { supabase } from './supabase'

/**
 * Busca usuários do portal que devem receber notificação.
 */
async function getUsuariosPortal(modulo?: string) {
  const { data: permissoes } = await supabase
    .from('portal_permissoes')
    .select('user_id, is_admin, modulos_permitidos')
  if (!permissoes || permissoes.length === 0) return []
  return permissoes.filter(
    (p: any) => p.is_admin || (modulo && p.modulos_permitidos && p.modulos_permitidos.includes(modulo))
  )
}

/**
 * Notifica usuários do portal que têm acesso ao módulo de requisições.
 */
export async function notificarPortalReq(titulo: string, descricao: string) {
  try {
    const usuarios = await getUsuariosPortal('requisicoes')
    if (usuarios.length === 0) return
    await supabase.from('portal_notificacoes').insert(
      usuarios.map((u: any) => ({
        user_id: u.user_id,
        tipo: 'requisicao',
        titulo,
        descricao,
        link: '/requisicoes',
      }))
    )
  } catch (err) {
    console.error('Erro ao notificar portal:', err)
  }
}

/**
 * Notifica portal quando técnico envia uma OS (relatório técnico).
 */
export async function notificarPortalOS(ordemServico: string, tecnico: string, cliente: string) {
  try {
    const usuarios = await getUsuariosPortal('pos')
    if (usuarios.length === 0) return
    await supabase.from('portal_notificacoes').insert(
      usuarios.map((u: any) => ({
        user_id: u.user_id,
        tipo: 'os_tecnico',
        titulo: `OS ${ordemServico} enviada`,
        descricao: `${tecnico} enviou o relatório técnico da OS ${ordemServico} (${cliente})`,
        link: `/pos/ordens/${ordemServico}`,
      }))
    )
  } catch (err) {
    console.error('Erro ao notificar portal (OS):', err)
  }
}
