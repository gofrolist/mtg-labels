import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { PDFGenerator } from './PDFGenerator'
import { generatePDF } from '../../api/client'

vi.mock('../../api/client')
globalThis.URL.createObjectURL = vi.fn(() => 'blob:mock')
globalThis.URL.revokeObjectURL = vi.fn()

describe('PDFGenerator matrix axes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('passes resolved letters to generatePDF', async () => {
    vi.mocked(generatePDF).mockResolvedValue(new Blob(['x'], { type: 'application/pdf' }))

    render(
      <PDFGenerator
        selectedSetIds={['set-1']}
        viewMode="matrix"
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

  it('passes divider types to generatePDF', async () => {
    vi.mocked(generatePDF).mockResolvedValue(new Blob(['x'], { type: 'application/pdf' }))

    render(
      <PDFGenerator
        selectedSetIds={['set-1']}
        viewMode="matrix"
        quantities={{}}
        useCustomQuantity={false}
        templateId="avery5160"
        placeholders={0}
        selectedTypeIds={['White:Creature', 'Blue:Instant']}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /pdf/i }))

    await waitFor(() => {
      expect(generatePDF).toHaveBeenCalledWith(
        expect.objectContaining({
          dividerTypes: ['White:Creature', 'Blue:Instant'],
          viewMode: 'sets',
        })
      )
    })
  })

  it('expands the matrix sets by their custom quantities', async () => {
    // The matrix prints set labels, so `quantities` is keyed by set id here —
    // not by the "Color:Type" ids the divider axis uses.
    vi.mocked(generatePDF).mockResolvedValue(new Blob(['x'], { type: 'application/pdf' }))

    render(
      <PDFGenerator
        selectedSetIds={['set-1', 'set-2']}
        viewMode="matrix"
        quantities={{ 'set-1': 3 }}
        useCustomQuantity={true}
        templateId="avery5160"
        placeholders={0}
        selectedTypeIds={['White:Creature']}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /pdf/i }))

    await waitFor(() => {
      expect(generatePDF).toHaveBeenCalledWith(
        expect.objectContaining({ setIds: ['set-1', 'set-1', 'set-1', 'set-2'] })
      )
    })
  })

  it('counts custom set quantities against the label cap', () => {
    // 1 set at quantity 200 x 3 letters = 600 items, over the cap. A map that
    // does not resolve the set id would count 3 and wave this through.
    render(
      <PDFGenerator
        selectedSetIds={['set-1']}
        viewMode="matrix"
        quantities={{ 'set-1': 200 }}
        useCustomQuantity={true}
        templateId="avery5160"
        placeholders={0}
        alphabet={{ mode: 'custom', customInput: 'A-C' }}
      />
    )
    expect(screen.getByRole('button', { name: /pdf/i })).toBeDisabled()
    expect(screen.getByText(/600 labels, over the 500 maximum/i)).toBeInTheDocument()
  })

  it('omits the divider axes in the plain sets view', async () => {
    vi.mocked(generatePDF).mockResolvedValue(new Blob(['x'], { type: 'application/pdf' }))

    render(
      <PDFGenerator
        selectedSetIds={['set-1']}
        viewMode="sets"
        quantities={{}}
        useCustomQuantity={false}
        templateId="avery5160"
        placeholders={0}
        alphabet={{ mode: 'all', customInput: '' }}
        selectedTypeIds={['White:Creature']}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /pdf/i }))

    await waitFor(() => {
      expect(generatePDF).toHaveBeenCalledWith(
        expect.objectContaining({ letters: undefined, dividerTypes: undefined })
      )
    })
  })

  it('disables the button when the custom spec is invalid', () => {
    render(
      <PDFGenerator
        selectedSetIds={['set-1']}
        viewMode="matrix"
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

  it('disables the button and explains when the matrix exceeds the cap', () => {
    // 100 sets x 3 letters x 2 types = 600 label items, over the 500 maximum.
    const manySets = Array.from({ length: 100 }, (_, i) => `set-${i}`)
    render(
      <PDFGenerator
        selectedSetIds={manySets}
        viewMode="matrix"
        quantities={{}}
        useCustomQuantity={false}
        templateId="avery5160"
        placeholders={0}
        alphabet={{ mode: 'custom', customInput: 'A-C' }}
        selectedTypeIds={['White:Creature', 'Blue:Instant']}
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
        viewMode="matrix"
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
        viewMode="matrix"
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
