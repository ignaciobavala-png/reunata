function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`animate-pulse rounded ${className ?? ''}`}
      style={{ background: 'var(--color-acero-claro)', ...style }}
    />
  )
}

export default function DashboardLoading() {
  return (
    <div className="p-8 max-w-5xl">
      <Skeleton className="mb-2" style={{ height: 28, width: 200 }} />
      <Skeleton className="mb-8" style={{ height: 16, width: 300 }} />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} style={{ height: 100, borderRadius: 12 }} />
        ))}
      </div>
      <div className="flex flex-col gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} style={{ height: 56, borderRadius: 10 }} />
        ))}
      </div>
    </div>
  )
}
