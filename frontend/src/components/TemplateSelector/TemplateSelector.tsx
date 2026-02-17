import { LABEL_TEMPLATES } from '../../constants/templates'

interface TemplateSelectorProps {
  selectedTemplate: string
  onTemplateChange: (templateId: string) => void
}

export function TemplateSelector({ selectedTemplate, onTemplateChange }: TemplateSelectorProps) {
  return (
    <select
      id="template-select"
      value={selectedTemplate}
      onChange={(e) => onTemplateChange(e.target.value)}
      className="px-3 py-2 border border-mtg-border rounded bg-mtg-card-bg text-mtg-text focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm min-w-[200px] sm:min-w-[250px]"
      aria-label="Select label template"
    >
      {Object.values(LABEL_TEMPLATES).map((template) => (
        <option key={template.id} value={template.id}>
          {template.name} ({template.dimensions}) - {template.labels_per_page} labels/page
        </option>
      ))}
    </select>
  )
}
