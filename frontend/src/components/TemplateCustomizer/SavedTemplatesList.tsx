import type { SavedCustomTemplate } from '../../types'

interface SavedTemplatesListProps {
  templates: SavedCustomTemplate[]
  onLoad: (id: string) => void
  onDelete: (id: string) => void
}

export function SavedTemplatesList({ templates, onLoad, onDelete }: SavedTemplatesListProps) {
  if (templates.length === 0) {
    return <p className="text-sm text-mtg-text-muted">No saved templates yet.</p>
  }

  return (
    <ul className="space-y-1">
      {templates.map(t => (
        <li
          key={t.id}
          className="flex items-center justify-between gap-2 px-2 py-1 rounded bg-mtg-card-bg border border-mtg-border text-sm"
        >
          <span className="text-mtg-text truncate">{t.name}</span>
          <div className="flex gap-1 shrink-0">
            <button
              onClick={() => onLoad(t.id)}
              className="px-2 py-1 text-xs bg-mtg-accent text-gray-900 rounded hover:bg-mtg-accent-hover transition-colors"
            >
              Load
            </button>
            <button
              onClick={() => onDelete(t.id)}
              className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            >
              Delete
            </button>
          </div>
        </li>
      ))}
    </ul>
  )
}
