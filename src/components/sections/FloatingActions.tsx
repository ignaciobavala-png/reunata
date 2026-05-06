'use client'

import { Clock, Flame, MessageCircle, X } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'

interface OfferItem {
  id: number
  titulo: string
  descuento: number
  precio: number
  antes: number
  img: string
}

type DrawerType = 'ofertas' | 'hotsale' | null

const OFERTAS: OfferItem[] = [
  { id: 1, titulo: 'Mate Imperial', descuento: 20, precio: 45, antes: 56, img: '/fotos/hero1.jpg' },
  { id: 2, titulo: 'Matera Classic', descuento: 15, precio: 32, antes: 38, img: '/fotos/hero1.jpg' },
  { id: 3, titulo: 'Combo Yerba', descuento: 10, precio: 18, antes: 20, img: '/fotos/hero1.jpg' },
]

const HOTSALE: OfferItem[] = [
  { id: 1, titulo: 'Mate Steel Pro', descuento: 30, precio: 42, antes: 60, img: '/fotos/hero1.jpg' },
  { id: 2, titulo: 'Termo Ultra', descuento: 25, precio: 75, antes: 100, img: '/fotos/hero1.jpg' },
  { id: 3, titulo: 'Kit Mate Premium', descuento: 40, precio: 90, antes: 150, img: '/fotos/hero1.jpg' },
]

function OfferDrawer({
  type,
  onClose,
}: {
  type: Exclude<DrawerType, null>
  onClose: () => void
}) {
  const items = type === 'ofertas' ? OFERTAS : HOTSALE
  const title = type === 'ofertas' ? 'Ofertas' : 'Hot Sale'
  const badgeColor = type === 'ofertas' ? 'bg-amber-500' : 'bg-red-500'

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-xl bg-white shadow-2xl flex flex-col"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {items.map(item => (
              <div
                key={item.id}
                className="border rounded-xl overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="aspect-square bg-gray-100 relative">
                  <Image
                    src={item.img}
                    alt={item.titulo}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, 50vw"
                  />
                  <span
                    className={`absolute top-2 right-2 text-white text-xs font-bold px-2 py-1 rounded-full ${badgeColor}`}
                  >
                    -{item.descuento}%
                  </span>
                </div>
                <div className="p-3">
                  <h3 className="text-sm font-medium mb-1">{item.titulo}</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold">${item.precio}</span>
                    <span className="text-xs text-gray-400 line-through">${item.antes}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </>
  )
}

export function FloatingActions() {
  const pathname = usePathname()
  const [drawer, setDrawer] = useState<DrawerType>(null)

  if (pathname.startsWith('/dashboard')) return null

  return (
    <>
      <div className="fixed bottom-6 right-6 z-40 flex flex-col gap-3">
        <a
          href="https://wa.me/5491132720974"
          target="_blank"
          rel="noopener noreferrer"
          className="w-12 h-12 rounded-full flex items-center justify-center transition-transform duration-200 hover:scale-110"
          style={{ background: '#25D366' }}
          title="Escribinos por WhatsApp"
        >
          <MessageCircle size={24} className="text-white" />
        </a>

        <button
          onClick={() => setDrawer('ofertas')}
          className="w-12 h-12 rounded-full flex items-center justify-center transition-transform duration-200 hover:scale-110"
          style={{ background: '#F59E0B' }}
          title="Ofertas"
        >
          <Clock size={22} className="text-white" />
        </button>

        <button
          onClick={() => setDrawer('hotsale')}
          className="w-12 h-12 rounded-full flex items-center justify-center transition-transform duration-200 hover:scale-110"
          style={{ background: '#EF4444' }}
          title="Hot Sale"
        >
          <Flame size={22} className="text-white" />
        </button>
      </div>

      <AnimatePresence>
        {drawer && (
          <OfferDrawer type={drawer} onClose={() => setDrawer(null)} />
        )}
      </AnimatePresence>
    </>
  )
}
