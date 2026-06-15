import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { PDFGenerator } from './PDFGenerator'
import { generatePDF } from '../../api/client'

vi.mock('../../api/client')
globalThis.URL.createObjectURL = vi.fn(() => 'blob:mock')
globalThis.URL.revokeObjectURL = vi.fn()

describe('PDFGenerator alphabet letters', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('passes resolved letters to generatePDF', async () => {
    vi.mocked(generatePDF).mockResolvedValue(new Blob(['x'], { type: 'application/pdf' }))

    render(
      <PDFGenerator
        selectedSetIds={['set-1']}
        quantities={{}}
        useCustomQuantity={false}
        templateId="avery5160"
        placeholders={0}
        alphabet={{ mode: 'custom', customInput: 'A-C' }}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /pdf/i }))

    await waitFor(() => {
      expect(generatePDF).toHaveBeenCalledWith(
        expect.objectContaining({ letters: ['A', 'B', 'C'], viewMode: 'sets' }),
      )
    })
  })

  it('disables the button when the custom spec is invalid', () => {
    render(
      <PDFGenerator
        selectedSetIds={['set-1']}
        quantities={{}}
        useCustomQuantity={false}
        templateId="avery5160"
        placeholders={0}
        alphabet={{ mode: 'custom', customInput: 'Z-A' }}
      />,
    )
    expect(screen.getByRole('button', { name: /pdf/i })).toBeDisabled()
  })
})
