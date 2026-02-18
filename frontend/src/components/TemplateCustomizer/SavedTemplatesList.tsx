import type { SavedCustomTemplate } from '../../types'

interface SavedTemplatesListProps {
  templates: SavedCustomTemplate[]
  onLoad: (id: string) => void
  onDelete: (id: string) => void
}

export function SavedTemplatesList({ templates, onLoad, onDelete }: SavedTemplatesListProps) {
  if (templates.length === 0) {
    return null
  }

  return (
    <div className="flex flex-wrap gap-2">
      {templates.map(t => (
        <span
          key={t.id}
          className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-mtg-section-bg border border-mtg-border text-sm group"
        >
          <button
            onClick={() => onLoad(t.id)}
            className="text-mtg-text hover:text-mtg-accent transition-colors truncate max-w-[150px]"
            title={`Load "${t.name}"`}
          >
            {t.name}
          </button>
          <button
            onClick={() => onDelete(t.id)}
            className="text-gray-400 hover:text-red-500 transition-colors ml-0.5 text-xs leading-none"
            aria-label={`Delete "${t.name}"`}
          >
            ✕
          </button>
        </span>
      ))}
    </div>
  )
}
