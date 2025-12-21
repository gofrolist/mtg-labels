import { memo } from 'react'
import { LABEL_TEMPLATES } from '../../constants/templates'

interface TemplateSelectorProps {
  selectedTemplate: string
  onTemplateChange: (templateId: string) => void
}

export const TemplateSelector = memo(function TemplateSelector({ selectedTemplate, onTemplateChange }: TemplateSelectorProps) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="template-select" className="text-sm font-medium text-mtg-text">
        Label Template:
      </label>
      <select
        id="template-select"
        value={selectedTemplate}
        onChange={(e) => onTemplateChange(e.target.value)}
        className="px-4 py-2 border border-mtg-border rounded-lg bg-mtg-card-bg text-mtg-text focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-label="Select label template"
      >
        {Object.values(LABEL_TEMPLATES).map((template) => (
          <option key={template.id} value={template.id}>
            {template.name} ({template.dimensions}) - {template.labels_per_page} labels/page
          </option>
        ))}
      </select>
    </div>
  )
})
