import { useState } from 'react'
import { generatePDF } from '../../api/client'
import { LABEL_TEMPLATES } from '../../constants/templates'
import type { CustomTemplateDimensions } from '../../types'
import { customTemplateToBackendFormat } from '../../utils/unitConversion'

interface PDFGeneratorProps {
  selectedSetIds: string[]
  templateId: string
  placeholders: number
  customTemplate?: CustomTemplateDimensions | null
  useCustomTemplate?: boolean
  onGenerate?: () => void
}

export function PDFGenerator({
  selectedSetIds,
  templateId,
  placeholders,
  customTemplate,
  useCustomTemplate,
  onGenerate,
}: PDFGeneratorProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleGenerate = async () => {
    if (selectedSetIds.length === 0) {
      setError('Please select at least one set before generating the PDF.')
      return
    }

    const labelsPerPage =
      useCustomTemplate && customTemplate
        ? customTemplate.columns * customTemplate.rows
        : (LABEL_TEMPLATES[templateId] || LABEL_TEMPLATES.avery5160).labels_per_page

    if (placeholders < 0 || placeholders >= labelsPerPage) {
      setError(`Placeholders must be between 0 and ${labelsPerPage - 1}.`)
      return
    }

    setError(null)
    setLoading(true)

    try {
      const backendCustomTemplate =
        useCustomTemplate && customTemplate
          ? customTemplateToBackendFormat(customTemplate)
          : undefined

      const blob = await generatePDF(
        selectedSetIds,
        templateId,
        placeholders,
        backendCustomTemplate,
      )

      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'mtg_labels.pdf'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      onGenerate?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate PDF. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {error && (
        <div className="px-4 py-3 bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-600 rounded-lg text-red-700 dark:text-red-200 mb-2">
          {error}
        </div>
      )}

      <button
        onClick={handleGenerate}
        disabled={loading || selectedSetIds.length === 0}
        className="px-4 py-2 bg-mtg-accent text-gray-900 rounded-lg font-semibold hover:bg-mtg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
      >
        {loading ? (
          <>
            <span className="animate-spin">⏳</span>
            <span>Generating...</span>
          </>
        ) : (
          <>Generate PDF</>
        )}
      </button>
    </>
  )
}
