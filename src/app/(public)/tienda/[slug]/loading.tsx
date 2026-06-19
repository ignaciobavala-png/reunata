function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`animate-pulse rounded ${className ?? ''}`}
      style={{ background: 'var(--color-acero-claro)', ...style }}
    />
  )
}

export default function CategoriaLoading() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--background)' }}>
      <div className="max-w-7xl mx-auto px-4 py-10">
        {/* Breadcrumb */}
        <div className="flex gap-2 mb-6">
          <Skeleton style={{ height: 14, width: 60 }} />
          <Skeleton style={{ height: 14, width: 8 }} />
          <Skeleton style={{ height: 14, width: 120 }} />
        </div>

        {/* Título */}
        <Skeleton className="mb-2" style={{ height: 32, width: 220 }} />
        <Skeleton className="mb-8" style={{ height: 16, width: 340 }} />

        {/* Grid de productos */}
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
