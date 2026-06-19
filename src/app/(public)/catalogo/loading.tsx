function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`animate-pulse rounded ${className ?? ''}`}
      style={{ background: 'var(--color-acero-claro)', ...style }}
    />
  )
}

export default function CatalogoLoading() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--background)' }}>
      <div className="max-w-4xl mx-auto px-4 py-16">
        <Skeleton className="mb-3" style={{ height: 32, width: 200 }} />
        <Skeleton className="mb-10" style={{ height: 16, width: 320 }} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} style={{ height: 120, borderRadius: 12 }} />
          ))}
        </div>
      </div>
    </div>
  )
}
