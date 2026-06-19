function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`animate-pulse rounded ${className ?? ''}`}
      style={{ background: 'var(--color-acero-claro)', ...style }}
    />
  )
}

export default function MultimediaLoading() {
  return (
    <div className="p-8 max-w-5xl">
      <Skeleton className="mb-8" style={{ height: 28, width: 200 }} />
      {/* Tabs */}
      <div className="flex gap-2 mb-8">
        <Skeleton style={{ height: 36, width: 100, borderRadius: 8 }} />
        <Skeleton style={{ height: 36, width: 100, borderRadius: 8 }} />
      </div>
      {/* Grid de assets */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} style={{ height: 160, borderRadius: 10 }} />
        ))}
      </div>
    </div>
  )
}
