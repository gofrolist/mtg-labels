import { useState } from 'react'
import { generatePDF } from '../../api/client'
import { MAX_LABEL_ITEMS } from '../../constants/limits'
import { LABEL_TEMPLATES } from '../../constants/templates'
import type { AlphabetSelection, CustomTemplateDimensions } from '../../types'
import { countLabelItems } from '../../utils/labelCount'
import { parseLetterSpec, resolveLetters } from '../../utils/letters'
import { customTemplateToBackendFormat } from '../../utils/unitConversion'
import { ErrorDisplay } from '../ErrorDisplay'

interface PDFGeneratorProps {
  selectedSetIds: string[]
  selectedTypeIds?: string[]
  viewMode?: 'sets' | 'types'
  quantities: Record<string, number>
  useCustomQuantity: boolean
  templateId: string | null
  placeholders: number
  customTemplate?: CustomTemplateDimensions | null
  useCustomTemplate?: boolean
  alphabet?: AlphabetSelection
  onSuccess?: () => void
}

export function PDFGenerator({
  selectedSetIds,
  selectedTypeIds = [],
  viewMode = 'sets',
  quantities,
  useCustomQuantity,
  templateId,
  placeholders,
  customTemplate,
  useCustomTemplate,
  alphabet = { mode: 'off', customInput: '' },
  onSuccess,
}: PDFGeneratorProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Alphabet letters apply to the sets view only, so an invalid custom spec
  // must not block generating card-type labels.
  const alphabetInvalid =
    viewMode === 'sets' && alphabet.mode === 'custom' && !parseLetterSpec(alphabet.customInput).ok
  const letters = resolveLetters(alphabet)

  // Mirror the backend cap up front: one label per set, or per set x divider
  // letter. Going over would 400, so block and explain instead of failing late.
  const selectedIds = viewMode === 'sets' ? selectedSetIds : selectedTypeIds
  const labelItemCount = countLabelItems(
    selectedIds,
    quantities,
    useCustomQuantity,
    viewMode === 'sets' ? letters.length : 0
  )
  const overLimit = labelItemCount > MAX_LABEL_ITEMS
  const overLimitMessage = overLimit
    ? `This selection makes ${labelItemCount.toLocaleString()} labels, over the ${MAX_LABEL_ITEMS} maximum. ` +
      `Reduce the number of ${viewMode === 'sets' ? 'sets or divider letters' : 'types'}.`
    : null

  const handleGenerate = async () => {
    const hasSelection =
      viewMode === 'sets' ? selectedSetIds.length > 0 : selectedTypeIds.length > 0
    if (!hasSelection) {
      setError(
        `Please select at least one ${viewMode === 'sets' ? 'set' : 'type'} before generating the PDF.`
      )
      return
    }

    if (overLimitMessage) {
      setError(overLimitMessage)
      return
    }

    const labelsPerPage =
      useCustomTemplate && customTemplate
        ? customTemplate.columns * customTemplate.rows
        : (templateId && LABEL_TEMPLATES[templateId]
            ? LABEL_TEMPLATES[templateId]
            : LABEL_TEMPLATES.avery5160
          ).labels_per_page

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

      const backendTemplateId = templateId && LABEL_TEMPLATES[templateId] ? templateId : 'avery5160'

      let blob: Blob

      if (viewMode === 'sets') {
        const expandedSetIds: string[] = []
        for (const id of selectedSetIds) {
          const qty = useCustomQuantity ? (quantities[id] ?? 1) : 1
          for (let i = 0; i < qty; i++) {
            expandedSetIds.push(id)
          }
        }

        blob = await generatePDF({
          setIds: expandedSetIds,
          template: backendTemplateId,
          placeholders,
          customTemplate: backendCustomTemplate,
          viewMode: 'sets',
          letters: letters.length > 0 ? letters : undefined,
        })
      } else {
        const expandedTypeIds: string[] = []
        for (const id of selectedTypeIds) {
          const qty = useCustomQuantity ? (quantities[id] ?? 1) : 1
          for (let i = 0; i < qty; i++) {
            expandedTypeIds.push(id)
          }
        }

        blob = await generatePDF({
          cardTypeIds: expandedTypeIds,
          template: backendTemplateId,
          placeholders,
          customTemplate: backendCustomTemplate,
          viewMode: 'types',
        })
      }

      onSuccess?.()

      // Delay download so the donate modal renders before mobile navigates away
      const url = URL.createObjectURL(blob)
      setTimeout(() => {
        const link = document.createElement('a')
        link.href = url
        link.download = 'mtg_labels.pdf'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        // Delay revoke so mobile browser can finish opening the file
        setTimeout(() => URL.revokeObjectURL(url), 5000)
      }, 300)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate PDF. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Show a click-triggered error, or proactively explain the disabled button
  // when the selection is over the label cap.
  const displayMessage = error ?? overLimitMessage

  return (
    <>
      {displayMessage && <ErrorDisplay message={displayMessage} />}

      <button
        onClick={handleGenerate}
        disabled={
          loading ||
          alphabetInvalid ||
          overLimit ||
          (viewMode === 'sets' ? selectedSetIds.length === 0 : selectedTypeIds.length === 0)
        }
        className="h-9 px-4 py-0 flex items-center gap-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
      >
        {loading ? (
          <>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="animate-spin"
              aria-hidden="true"
            >
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
            <span>Generating PDF...</span>
          </>
        ) : (
          <>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              fill="currentColor"
              viewBox="0 0 16 16"
              aria-hidden
            >
              <path d="M14 14V4.5L9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2zM9.5 3A1.5 1.5 0 0 0 11 4.5h2V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h5.5z" />
              <path d="M4.603 14.087a.8.8 0 0 1-.438-.42c-.195-.388-.13-.776.08-1.102.198-.307.526-.568.897-.787a7.7 7.7 0 0 1 1.482-.645 20 20 0 0 0 1.062-2.227 7.3 7.3 0 0 1-.43-1.295c-.086-.4-.119-.796-.046-1.136.075-.354.274-.672.65-.823.192-.077.4-.12.602-.077a.7.7 0 0 1 .477.365c.088.164.12.356.127.538.007.188-.012.396-.047.614-.084.51-.27 1.134-.52 1.794a11 11 0 0 0 .98 1.686 5.8 5.8 0 0 1 1.334.05c.364.066.734.195.96.465.12.144.193.32.2.518.007.192-.047.382-.138.563a1.04 1.04 0 0 1-.354.416.86.86 0 0 1-.51.138c-.331-.014-.654-.196-.933-.417a5.7 5.7 0 0 1-.911-.95 11.7 11.7 0 0 0-1.997.406 11.3 11.3 0 0 1-1.02 1.51c-.292.35-.609.656-.927.787a.8.8 0 0 1-.58.029m1.379-1.901q-.25.115-.459.238c-.328.194-.541.383-.647.547-.094.145-.096.25-.04.361q.016.032.026.044l.035-.012c.137-.056.355-.235.635-.572a8 8 0 0 0 .45-.606m1.64-1.33a13 13 0 0 1 1.01-.193 12 12 0 0 1-.51-.858 21 21 0 0 1-.5 1.05zm2.446.45q.226.245.435.41c.24.19.407.253.498.256a.1.1 0 0 0 .07-.015.3.3 0 0 0 .094-.125.44.44 0 0 0 .059-.2.1.1 0 0 0-.026-.063c-.052-.062-.2-.152-.518-.209a4 4 0 0 0-.612-.053zM8.078 7.8a7 7 0 0 0 .2-.828q.046-.282.038-.465a.6.6 0 0 0-.032-.198.5.5 0 0 0-.145.04c-.087.035-.158.106-.196.283-.04.192-.03.469.046.822q.036.167.09.346z" />
            </svg>
            PDF
          </>
        )}
      </button>
    </>
  )
}
