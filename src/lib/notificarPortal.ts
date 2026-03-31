import { supabase } from './supabase'

/**
 * Notifica usuários do portal que têm acesso ao módulo de requisições.
 * Insere em portal_notificacoes para admins + quem tem 'requisicoes' nos modulos_permitidos.
 */
export async function notificarPortalReq(titulo: string, descricao: string) {
  try {
    const { data: permissoes } = await supabase
      .from('portal_permissoes')
      .select('user_id, is_admin, modulos_permitidos')
    if (!permissoes || permissoes.length === 0) return
    const usuarios = permissoes.filter(
      (p: any) => p.is_admin || (p.modulos_permitidos && p.modulos_permitidos.includes('requisicoes'))
    )
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
