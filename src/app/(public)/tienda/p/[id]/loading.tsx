function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`animate-pulse rounded ${className ?? ''}`}
      style={{ background: 'var(--color-acero-claro)', ...style }}
    />
  )
}

export default function ProductoLoading() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--background)' }}>
      <div className="max-w-5xl mx-auto px-4 py-10">
        {/* Breadcrumb */}
        <div className="flex gap-2 mb-8">
          <Skeleton style={{ height: 14, width: 50 }} />
          <Skeleton style={{ height: 14, width: 8 }} />
          <Skeleton style={{ height: 14, width: 100 }} />
          <Skeleton style={{ height: 14, width: 8 }} />
          <Skeleton style={{ height: 14, width: 140 }} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {/* Galería */}
          <div className="flex flex-col gap-3">
            <Skeleton style={{ height: 420, borderRadius: 12 }} />
            <div className="flex gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} style={{ width: 70, height: 70, borderRadius: 8 }} />
              ))}
            </div>
          </div>

          {/* Info panel */}
          <div className="flex flex-col gap-4">
            <Skeleton style={{ height: 14, width: 80 }} />
            <Skeleton style={{ height: 28, width: '90%' }} />
            <Skeleton style={{ height: 28, width: '60%' }} />
            <Skeleton className="mt-2" style={{ height: 40, width: 140 }} />
            <div className="flex gap-2 mt-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} style={{ width: 28, height: 28, borderRadius: 999 }} />
              ))}
            </div>
            <Skeleton className="mt-4" style={{ height: 48, borderRadius: 10 }} />
          </div>
        </div>
      </div>
    </div>
  )
}
