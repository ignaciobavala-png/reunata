function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`animate-pulse rounded ${className ?? ''}`}
      style={{ background: 'var(--color-acero-claro)', ...style }}
    />
  )
}

export default function TiendaLoading() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--background)' }}>
      {/* PromoTicker placeholder */}
      <Skeleton style={{ height: 36 }} />

      <div className="max-w-7xl mx-auto px-4 py-10">
        {/* Categorías */}
        <Skeleton className="mb-6" style={{ height: 24, width: 160 }} />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-12">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} style={{ height: 180, borderRadius: 12 }} />
          ))}
        </div>

        {/* Grid de productos */}
        <Skeleton className="mb-6" style={{ height: 24, width: 200 }} />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-2">
              <Skeleton style={{ height: 220, borderRadius: 10 }} />
              <Skeleton style={{ height: 14, width: '80%' }} />
              <Skeleton style={{ height: 14, width: '50%' }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
