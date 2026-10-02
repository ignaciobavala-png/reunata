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

/**
 * Cómo se elige el rol de un usuario interno desde Empleados.
 *
 * Administración y Depósito son las dos áreas de `empleado` (columna
 * `profiles.area`), no roles nuevos: para la base y las policies los dos siguen
 * siendo `empleado`. Ver la migración 20261002000001_profiles_area_interna.sql.
 */
export type AreaInterna = 'administracion' | 'deposito'

export const OPCIONES_ROL_INTERNO = [
  { valor: 'master',         label: 'Master',         rol: 'master',       area: null },
  { valor: 'administracion', label: 'Administración', rol: 'empleado',     area: 'administracion' },
  { valor: 'deposito',       label: 'Depósito',       rol: 'empleado',     area: 'deposito' },
  { valor: 'comisionista',   label: 'Comisionista',   rol: 'comisionista', area: null },
] as const satisfies readonly { valor: string; label: string; rol: string; area: AreaInterna | null }[]

export type OpcionRolInterno = (typeof OPCIONES_ROL_INTERNO)[number]['valor']

/** La opción del selector que corresponde a un perfil. Empleado sin área = Administración. */
export function opcionRolInterno(rol: string, area?: string | null): OpcionRolInterno | null {
  if (rol === 'empleado') return area === 'deposito' ? 'deposito' : 'administracion'
  if (rol === 'master' || rol === 'comisionista') return rol
  return null
}

export function labelRolInterno(rol: string, area?: string | null): string {
  const op = opcionRolInterno(rol, area)
  return OPCIONES_ROL_INTERNO.find(o => o.valor === op)?.label ?? labelRol(rol)
}

/**
 * Secciones del panel que ve Depósito. Permisos fijos por ahora: la sección para
 * editarlos desde el panel queda para cuando Gastón defina qué ve cada rol.
 * Lo usan el Sidebar (qué links muestra) y el proxy (qué URLs deja abrir).
 */
const SECCIONES_DEPOSITO = ['/dashboard/admin/pedidos', '/dashboard/admin/containers']

export function depositoPuedeVer(pathname: string): boolean {
  if (pathname === '/dashboard/admin') return true
  return SECCIONES_DEPOSITO.some(s => pathname === s || pathname.startsWith(s + '/'))
}
