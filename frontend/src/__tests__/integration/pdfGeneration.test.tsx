import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { PDFGenerator } from '../../components/PDFGenerator/PDFGenerator'
import { generatePDF } from '../../services/api'

vi.mock('../../services/api')

// Mock URL.createObjectURL and URL.revokeObjectURL
globalThis.URL.createObjectURL = vi.fn(() => 'blob:mock-url')
globalThis.URL.revokeObjectURL = vi.fn()

describe('PDF Generation Integration', () => {
  let mockClick: ReturnType<typeof vi.fn>
  let createElementSpy: ReturnType<typeof vi.spyOn>
  let appendChildSpy: ReturnType<typeof vi.spyOn>
  let removeChildSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    if (createElementSpy) createElementSpy.mockRestore()
    if (appendChildSpy) appendChildSpy.mockRestore()
    if (removeChildSpy) removeChildSpy.mockRestore()
  })

  it('completes full PDF generation flow', async () => {
    const mockBlob = new Blob(['pdf content'], { type: 'application/pdf' })
    vi.mocked(generatePDF).mockResolvedValue(mockBlob)

    const onGenerate = vi.fn()
    render(
      <PDFGenerator
        selectedSetIds={['set-1', 'set-2']}
        selectedCardTypeIds={[]}
        templateId="avery5160"
        placeholders={0}
        viewMode="sets"
        onGenerate={onGenerate}
      />
    )

    // Set up mocks after component has rendered
    mockClick = vi.fn()
    const originalCreateElement = document.createElement.bind(document)
    createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'a') {
        const link = originalCreateElement('a')
        link.click = mockClick as () => void
        return link
      }
      return originalCreateElement(tagName)
    })
    appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation((node: Node) => node)
    removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation((node: Node) => node)

    const button = screen.getByRole('button', { name: /generate pdf/i })
    fireEvent.click(button)

    await waitFor(() => {
      expect(generatePDF).toHaveBeenCalledWith(
        ['set-1', 'set-2'],
        null,
        'avery5160',
        0,
        'sets'
      )
    })

    await waitFor(() => {
      expect(createElementSpy).toHaveBeenCalledWith('a')
      expect(appendChildSpy).toHaveBeenCalled()
      expect(mockClick).toHaveBeenCalled()
      expect(removeChildSpy).toHaveBeenCalled()
    })
  })

  it('shows error when placeholders are invalid', async () => {
    // Don't set up DOM mocks for this test since we're just testing error display
    render(
      <PDFGenerator
        selectedSetIds={['set-1']}
        selectedCardTypeIds={[]}
        templateId="avery5160"
        placeholders={100}
        viewMode="sets"
        onGenerate={vi.fn()}
      />
    )

    const button = screen.getByRole('button', { name: /generate pdf/i })
    fireEvent.click(button)

    await waitFor(() => {
      expect(screen.getByText(/placeholders must be/i)).toBeInTheDocument()
    })
  })
})
