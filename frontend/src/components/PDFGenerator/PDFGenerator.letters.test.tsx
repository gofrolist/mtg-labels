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
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /pdf/i }))

    await waitFor(() => {
      expect(generatePDF).toHaveBeenCalledWith(
        expect.objectContaining({ letters: ['A', 'B', 'C'], viewMode: 'sets' })
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
      />
    )
    expect(screen.getByRole('button', { name: /pdf/i })).toBeDisabled()
  })

  it('does not block the types view when the custom spec is invalid', () => {
    render(
      <PDFGenerator
        selectedSetIds={[]}
        selectedTypeIds={['White:Creature']}
        viewMode="types"
        quantities={{}}
        useCustomQuantity={false}
        templateId="avery5160"
        placeholders={0}
        alphabet={{ mode: 'custom', customInput: 'Z-A' }}
      />
    )
    expect(screen.getByRole('button', { name: /pdf/i })).toBeEnabled()
  })

  it('disables the button and explains when sets x letters exceed the cap', () => {
    // 200 sets x 3 letters = 600 label items, over the 500 maximum.
    const manySets = Array.from({ length: 200 }, (_, i) => `set-${i}`)
    render(
      <PDFGenerator
        selectedSetIds={manySets}
        quantities={{}}
        useCustomQuantity={false}
        templateId="avery5160"
        placeholders={0}
        alphabet={{ mode: 'custom', customInput: 'A-C' }}
      />
    )
    expect(screen.getByRole('button', { name: /pdf/i })).toBeDisabled()
    expect(screen.getByText(/600 labels, over the 500 maximum/i)).toBeInTheDocument()
  })

  it('does not call generatePDF when over the label cap', () => {
    const manySets = Array.from({ length: 200 }, (_, i) => `set-${i}`)
    render(
      <PDFGenerator
        selectedSetIds={manySets}
        quantities={{}}
        useCustomQuantity={false}
        templateId="avery5160"
        placeholders={0}
        alphabet={{ mode: 'all', customInput: '' }}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /pdf/i }))
    expect(generatePDF).not.toHaveBeenCalled()
  })

  it('allows a selection of exactly the maximum label count', () => {
    // 100 sets x 5 letters (A-E) = 500 = the maximum, so still allowed.
    const sets = Array.from({ length: 100 }, (_, i) => `set-${i}`)
    render(
      <PDFGenerator
        selectedSetIds={sets}
        quantities={{}}
        useCustomQuantity={false}
        templateId="avery5160"
        placeholders={0}
        alphabet={{ mode: 'custom', customInput: 'A-E' }}
      />
    )
    expect(screen.getByRole('button', { name: /pdf/i })).toBeEnabled()
  })
})
