/**
 * Roles de `profiles.rol`.
 *
 * El rol de un cliente ES el slug de su canal de venta, y los canales se crean
 * desde el panel (Emprendedores, Pool de Compras, Fabricantes…). Por eso nunca
 * hay que enumerar los roles de cliente a mano: cada canal nuevo quedaría afuera
 * del registro, del catálogo, de la cuenta y de los listados del admin.
 *
 * La única lista fija es la de usuarios internos. Todo lo demás es cliente, y
 * todo cliente que no sea `consumidor_final` es mayorista.
 */

export const ROLES_INTERNOS = ['master', 'empleado', 'comisionista'] as const
export const ROL_MINORISTA = 'consumidor_final'

export function esRolInterno(rol?: string | null): boolean {
  return !!rol && (ROLES_INTERNOS as readonly string[]).includes(rol)
}

/** Cualquier tipo de cliente (minorista o mayorista). */
export function esRolCliente(rol?: string | null): boolean {
  return !!rol && !esRolInterno(rol)
}

/** Cliente con canal mayorista/especial — todo cliente que no sea consumidor final. */
export function esRolMayorista(rol?: string | null): boolean {
  return esRolCliente(rol) && rol !== ROL_MINORISTA
}

/** Filtros PostgREST: `.not('rol', 'in', FILTRO_ROL_CLIENTE)` */
export const FILTRO_ROL_CLIENTE = `(${ROLES_INTERNOS.join(',')})`
export const FILTRO_ROL_MAYORISTA = `(${[...ROLES_INTERNOS, ROL_MINORISTA].join(',')})`

const LABEL_ROL: Record<string, string> = {
  master: 'Master',
  empleado: 'Empleado',
  comisionista: 'Comisionista',
  consumidor_final: 'Consumidor',
  distribuidor: 'Distribuidor',
  local: 'Local',
  mercha: 'Merchandising',
}

/** Etiqueta legible. Para canales nuevos, prettifica el slug (pool_de_compras → Pool De Compras). */
export function labelRol(rol?: string | null): string {
  if (!rol) return '—'
  return LABEL_ROL[rol] ?? rol.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

const COLOR_ROL: Record<string, string> = {
  consumidor_final: '#6366f1',
  distribuidor:     '#0ea5e9',
  local:            '#10b981',
  mercha:           '#f59e0b',
}

const PALETA_ROL = ['#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#3b82f6', '#84cc16']

/** Color estable por rol. Los canales nuevos toman un color de la paleta según su slug. */
export function colorRol(rol?: string | null): string {
  if (!rol) return '#888'
  if (COLOR_ROL[rol]) return COLOR_ROL[rol]
  let h = 0
  for (const c of rol) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return PALETA_ROL[h % PALETA_ROL.length]
}
