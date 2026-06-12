export interface Variante {
  nombre: string
  stock: number
}

export interface ProductoFull {
  id: number
  codigo_interno: string | null
  titulo: string
  categoria: string | null
  stock: number | null
  precio_lista1: number | null
  precio_lista2: number | null
  precio_lista3: number | null
  precio_lista4: number | null
  precio_lista5: number | null
  activo: boolean
  ultima_sync: string | null
}

export interface ProductoLite {
  id: number
  codigo_interno: string
  titulo: string
  categoria: string | null
}

export interface Canal {
  id: number
  slug: string
  nombre: string
}
