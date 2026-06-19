function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`animate-pulse rounded ${className ?? ''}`}
      style={{ background: 'var(--color-acero-claro)', ...style }}
    />
  )
}

export default function ProductosAdminLoading() {
  return (
    <div className="p-8 max-w-6xl">
      <Skeleton className="mb-2" style={{ height: 28, width: 180 }} />
      <Skeleton className="mb-8" style={{ height: 16, width: 260 }} />
      {/* Filtros */}
      <div className="flex gap-3 mb-6">
        <Skeleton style={{ height: 36, width: 200, borderRadius: 8 }} />
        <Skeleton style={{ height: 36, width: 140, borderRadius: 8 }} />
        <Skeleton style={{ height: 36, width: 120, borderRadius: 8 }} />
      </div>
      {/* Tabla */}
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--color-acero-claro)' }}>
        <Skeleton style={{ height: 44, borderRadius: 0 }} />
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="flex gap-4 px-4 py-3 border-t" style={{ borderColor: 'var(--color-acero-claro)' }}>
            <Skeleton style={{ width: 48, height: 48, borderRadius: 6, flexShrink: 0 }} />
            <div className="flex-1 flex flex-col gap-1.5 justify-center">
              <Skeleton style={{ height: 13, width: '60%' }} />
              <Skeleton style={{ height: 13, width: '35%' }} />
            </div>
            <Skeleton style={{ height: 13, width: 80, alignSelf: 'center' }} />
            <Skeleton style={{ height: 13, width: 60, alignSelf: 'center' }} />
          </div>
        ))}
      </div>
    </div>
  )
}
