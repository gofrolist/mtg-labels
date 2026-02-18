import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { PDFGenerator } from './PDFGenerator'
import { generatePDF } from '../../api/client'

vi.mock('../../api/client')

describe('PDFGenerator', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders generate button', () => {
    render(
      <PDFGenerator
        selectedSetIds={[]}
        quantities={{}}
        useCustomQuantity={false}
        templateId="avery5160"
        placeholders={0}
      />
    )
    expect(screen.getByRole('button', { name: /pdf/i })).toBeInTheDocument()
  })

  it('shows error when placeholders are invalid', async () => {
    render(
      <PDFGenerator
        selectedSetIds={['set-1']}
        quantities={{}}
        useCustomQuantity={false}
        templateId="avery5160"
        placeholders={100}
      />
    )
    const button = screen.getByRole('button', { name: /pdf/i })
    fireEvent.click(button)
    await waitFor(() => {
      expect(screen.getByText(/placeholders must be/i)).toBeInTheDocument()
    })
  })

  it('calls generatePDF when sets are selected', async () => {
    const mockBlob = new Blob(['pdf content'], { type: 'application/pdf' })
    vi.mocked(generatePDF).mockResolvedValue(mockBlob)

    render(
      <PDFGenerator
        selectedSetIds={['set-1']}
        quantities={{}}
        useCustomQuantity={false}
        templateId="avery5160"
        placeholders={0}
      />
    )

    const button = screen.getByRole('button', { name: /pdf/i })
    fireEvent.click(button)

    await waitFor(() => {
      expect(generatePDF).toHaveBeenCalledWith(
        ['set-1'],
        'avery5160',
        0,
        undefined,
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
        quantities={{}}
        useCustomQuantity={false}
        templateId="avery5160"
        placeholders={0}
      />
    )

    const button = screen.getByRole('button', { name: /pdf/i })
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
