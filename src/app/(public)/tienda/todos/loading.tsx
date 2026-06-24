function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`animate-pulse rounded ${className ?? ''}`}
      style={{ background: 'var(--color-acero-claro)', ...style }}
    />
  )
}

export default function TodosLoading() {
  return (
    <div className="px-6 md:px-16 max-w-7xl mx-auto py-20 md:py-28" style={{ background: 'var(--background)' }}>
      <Skeleton className="mb-4" style={{ height: 14, width: 180 }} />
      <Skeleton className="mb-8" style={{ height: 44, width: 280 }} />
      <div className="md:flex md:gap-12">
        {/* Sidebar skeleton */}
        <div className="hidden md:flex flex-col gap-4 w-52 flex-shrink-0">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} style={{ height: 12, width: `${60 + i * 10}%` }} />
          ))}
        </div>
        {/* Grid skeleton */}
        <div className="flex-1 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-2">
              <Skeleton style={{ aspectRatio: '1', borderRadius: 4 }} />
              <Skeleton style={{ height: 14, width: '80%' }} />
              <Skeleton style={{ height: 12, width: '50%' }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
