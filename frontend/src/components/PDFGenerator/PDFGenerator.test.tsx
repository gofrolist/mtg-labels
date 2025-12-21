import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { PDFGenerator } from './PDFGenerator'
import { generatePDF } from '../../services/api'

vi.mock('../../services/api')

describe('PDFGenerator', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders generate button', () => {
    render(
      <PDFGenerator
        selectedSetIds={[]}
        selectedCardTypeIds={[]}
        templateId="avery5160"
        placeholders={0}
        viewMode="sets"
        onGenerate={vi.fn()}
      />
    )
    expect(screen.getByRole('button', { name: /generate pdf/i })).toBeInTheDocument()
  })

  it('shows error when placeholders are invalid', async () => {
    const onGenerate = vi.fn()
    render(
      <PDFGenerator
        selectedSetIds={['set-1']}
        selectedCardTypeIds={[]}
        templateId="avery5160"
        placeholders={100}
        viewMode="sets"
        onGenerate={onGenerate}
      />
    )
    const button = screen.getByRole('button', { name: /generate pdf/i })
    fireEvent.click(button)
    await waitFor(() => {
      expect(screen.getByText(/placeholders must be/i)).toBeInTheDocument()
    })
  })

  it('calls generatePDF when sets are selected', async () => {
    const mockBlob = new Blob(['pdf content'], { type: 'application/pdf' })
    vi.mocked(generatePDF).mockResolvedValue(mockBlob)

    const onGenerate = vi.fn()
    render(
      <PDFGenerator
        selectedSetIds={['set-1']}
        selectedCardTypeIds={[]}
        templateId="avery5160"
        placeholders={0}
        viewMode="sets"
        onGenerate={onGenerate}
      />
    )

    const button = screen.getByRole('button', { name: /generate pdf/i })
    fireEvent.click(button)

    await waitFor(() => {
      expect(generatePDF).toHaveBeenCalledWith(
        ['set-1'],
        null,
        'avery5160',
        0,
        'sets'
      )
    })
  })

  it('shows loading state during generation', async () => {
    const mockBlob = new Blob(['pdf content'], { type: 'application/pdf' })
    let resolvePromise: (value: Blob) => void
    const promise = new Promise<Blob>((resolve) => {
      resolvePromise = resolve
    })
    vi.mocked(generatePDF).mockReturnValue(promise)

    render(
      <PDFGenerator
        selectedSetIds={['set-1']}
        selectedCardTypeIds={[]}
        templateId="avery5160"
        placeholders={0}
        viewMode="sets"
        onGenerate={vi.fn()}
      />
    )

    const button = screen.getByRole('button', { name: /generate pdf/i })
    fireEvent.click(button)

    await waitFor(() => {
      expect(screen.getByText(/generating/i)).toBeInTheDocument()
    })

    resolvePromise!(mockBlob)
    await waitFor(() => {
      expect(screen.queryByText(/generating/i)).not.toBeInTheDocument()
    })
  })
})
