import { useState, memo } from 'react'
import { generatePDF } from '../../api/client'
import { LABEL_TEMPLATES } from '../../constants/templates'

interface PDFGeneratorProps {
  selectedSetIds: string[]
  selectedCardTypeIds: string[]
  templateId: string
  placeholders: number
  viewMode: 'sets' | 'types'
  onGenerate?: () => void
}

export const PDFGenerator = memo(function PDFGenerator({
  selectedSetIds,
  selectedCardTypeIds,
  templateId,
  placeholders,
  viewMode,
  onGenerate,
}: PDFGeneratorProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleGenerate = async () => {
    // Validate selection
    if (viewMode === 'sets' && selectedSetIds.length === 0) {
      setError('Please select at least one set before generating the PDF.')
      return
    }
    if (viewMode === 'types' && selectedCardTypeIds.length === 0) {
      setError('Please select at least one card type before generating the PDF.')
      return
    }

    // Validate placeholders
    const template = LABEL_TEMPLATES[templateId] || LABEL_TEMPLATES.avery5160
    if (placeholders < 0 || placeholders >= template.labels_per_page) {
      setError(`Placeholders must be between 0 and ${template.labels_per_page - 1}.`)
      return
    }

    setError(null)
    setLoading(true)

    try {
      const blob = await generatePDF(
        viewMode === 'sets' ? selectedSetIds : null,
        viewMode === 'types' ? selectedCardTypeIds : null,
        templateId,
        placeholders,
        viewMode
      )

      // Create download link
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
        disabled={loading || (viewMode === 'sets' ? selectedSetIds.length === 0 : selectedCardTypeIds.length === 0)}
        className="px-3 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm"
      >
        {loading ? (
          <>
            <span className="animate-spin">⏳</span>
            <span>Generating...</span>
          </>
        ) : (
          <>📄 Generate PDF</>
        )}
      </button>
    </>
  )
})
