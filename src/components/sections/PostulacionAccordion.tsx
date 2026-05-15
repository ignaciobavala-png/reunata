'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PostulacionForm } from './PostulacionForm'

const forms = [
  {
    tipo: 'fulltime' as const,
    titulo: 'Full Time',
    descripcion: 'Trabajá en nuestra empresa con un equipo dinámico. En las oficinas de nuestra empresa (Ciudad de Buenos Aires).',
  },
  {
    tipo: 'comisionista' as const,
    titulo: 'Comisionista',
    descripcion: 'Vendé visitando clientes por tu cuenta. Gestioná tu propio recorrido y ganá por comisión.',
  },
  {
    tipo: 'proveedor' as const,
    titulo: 'Sé nuestro proveedor',
    descripcion: 'Ofrecé tus productos o servicios a Reunata. Completá el formulario y te contactaremos.',
  },
]

export function PostulacionAccordion() {
  const [open, setOpen] = useState<string | null>(null)

  return (
    <div className="flex flex-col gap-2">
      {forms.map((f) => {
        const isOpen = open === f.tipo

        return (
          <div
            key={f.tipo}
            className="border-2 border-[var(--color-granito-claro)] rounded-xl overflow-hidden"
          >
            <button
              onClick={() => setOpen(isOpen ? null : f.tipo)}
              className="w-full flex items-center justify-between px-5 md:px-6 py-4 text-left transition-colors duration-200"
              style={{ background: 'var(--color-acero-brillo)' }}
            >
              <div className="flex-1">
                <h3 className="text-lg md:text-xl font-semibold" style={{ color: 'var(--color-granito-oscuro)' }}>
                  {f.titulo}
                </h3>
                <p className="text-sm mt-0.5" style={{ color: 'var(--color-acero-oscuro)' }}>
                  {f.descripcion}
                </p>
              </div>
              <motion.span
                className="text-2xl font-light flex-shrink-0 ml-4"
                style={{ color: 'var(--color-acero-oscuro)' }}
                animate={{ rotate: isOpen ? 45 : 0 }}
                transition={{ duration: 0.2 }}
              >
                +
              </motion.span>
            </button>

            <AnimatePresence>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className="overflow-hidden"
                >
                  <div className="px-5 md:px-6 pb-6 pt-2" style={{ background: 'var(--color-acero-brillo)' }}>
                    <div className="border-t border-[var(--color-granito-claro)] pt-4">
                      <PostulacionForm tipo={f.tipo} titulo="" descripcion="" />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )
      })}
    </div>
  )
}
