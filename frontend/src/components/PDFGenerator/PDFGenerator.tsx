import { useState, memo } from 'react'
import { generatePDF } from '../../services/api'
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
    <div className="space-y-4">
      {error && (
        <div className="px-4 py-3 bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-600 rounded-lg text-red-700 dark:text-red-200">
          {error}
        </div>
      )}

      <button
        onClick={handleGenerate}
        disabled={loading || (viewMode === 'sets' ? selectedSetIds.length === 0 : selectedCardTypeIds.length === 0)}
        className="w-full px-4 sm:px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 text-sm sm:text-base min-h-[44px] touch-manipulation"
      >
        {loading ? (
          <>
            <span className="animate-spin">⏳</span>
            <span>Generating PDF...</span>
          </>
        ) : (
          <span>Generate PDF</span>
        )}
      </button>
    </div>
  )
})
