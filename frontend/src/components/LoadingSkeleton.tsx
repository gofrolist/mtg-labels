export function LoadingSkeleton() {
  return (
    <div className="space-y-3 py-4" aria-label="Loading sets...">
      {Array.from({ length: 3 }).map((_, groupIdx) => (
        <div key={groupIdx} className="border border-mtg-border rounded-lg overflow-hidden">
          <div className="px-4 py-3 bg-mtg-section-bg">
            <div className="h-5 w-32 rounded bg-mtg-border animate-pulse" />
          </div>
          <div className="px-4 py-2 bg-mtg-card-bg border-t border-mtg-border">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2 px-1 py-1">
                  <div className="w-4 h-4 rounded bg-mtg-border animate-pulse shrink-0" />
                  <div className="w-5 h-5 rounded bg-mtg-border animate-pulse shrink-0" />
                  <div className="h-4 flex-1 rounded bg-mtg-border animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
