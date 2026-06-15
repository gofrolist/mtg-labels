import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TemplateCustomizer } from './TemplateCustomizer'
import type { AlphabetSelection } from '../../types'

// jsdom has no ResizeObserver; the component observes its preview container on mount.
vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
)

function baseProps(alphabet: AlphabetSelection, onAlphabetChange = vi.fn()) {
  return {
    isOpen: true,
    customTemplate: null,
    useCustomTemplate: false,
    useCustomQuantity: false,
    templateId: 'avery5160',
    placeholders: 0,
    // Mirror the real CustomTemplatesApi shape ({ templates, saveTemplate, ... }) so
    // the component renders. The plan's draft used a different field set + `as never`,
    // which let the component crash on `savedTemplates.length` during render.
    customTemplatesApi: {
      templates: [],
      saveTemplate: vi.fn(),
      updateTemplate: vi.fn(),
      deleteTemplate: vi.fn(),
      loadTemplate: vi.fn(),
    } as never,
    alphabet,
    onAlphabetChange,
    onCustomTemplateChange: vi.fn(),
    onUseCustomTemplateChange: vi.fn(),
    onUseCustomQuantityChange: vi.fn(),
    onPlaceholdersChange: vi.fn(),
    onTemplateChange: vi.fn(),
  }
}

describe('TemplateCustomizer letters control', () => {
  it('hides the custom input unless in custom mode', () => {
    render(<TemplateCustomizer {...baseProps({ mode: 'off', customInput: '' })} />)
    expect(screen.queryByPlaceholderText(/A-F, H, L-Z/i)).not.toBeInTheDocument()
  })

  it('shows the custom input in custom mode', () => {
    render(<TemplateCustomizer {...baseProps({ mode: 'custom', customInput: '' })} />)
    expect(screen.getByPlaceholderText(/A-F, H, L-Z/i)).toBeInTheDocument()
  })

  it('shows an inline error for an invalid custom spec', () => {
    render(<TemplateCustomizer {...baseProps({ mode: 'custom', customInput: 'Z-A' })} />)
    expect(screen.getByText(/backwards/i)).toBeInTheDocument()
  })

  it('calls onAlphabetChange when typing in the custom input', () => {
    const onAlphabetChange = vi.fn()
    render(
      <TemplateCustomizer {...baseProps({ mode: 'custom', customInput: '' }, onAlphabetChange)} />
    )
    fireEvent.change(screen.getByPlaceholderText(/A-F, H, L-Z/i), {
      target: { value: 'A-C' },
    })
    expect(onAlphabetChange).toHaveBeenCalledWith({ mode: 'custom', customInput: 'A-C' })
  })

  it('associates the mode select and custom input with accessible labels', () => {
    render(<TemplateCustomizer {...baseProps({ mode: 'custom', customInput: '' })} />)
    expect(screen.getByLabelText(/alphabet divider letters/i)).toBeInTheDocument()
    expect(screen.getByLabelText('Custom divider letters')).toBeInTheDocument()
  })

  it('shows a neutral hint (not an error) for an empty custom field', () => {
    render(<TemplateCustomizer {...baseProps({ mode: 'custom', customInput: '' })} />)
    expect(screen.getByText(/enter letters and ranges/i)).toBeInTheDocument()
    expect(screen.queryByText(/enter at least one letter/i)).not.toBeInTheDocument()
  })
})
