import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TemplateSelector } from './TemplateSelector'

describe('TemplateSelector', () => {
  it('renders template selector', () => {
    render(
      <TemplateSelector
        selectedTemplate="avery5160"
        onTemplateChange={vi.fn()}
      />
    )
    expect(screen.getByLabelText(/template/i)).toBeInTheDocument()
  })

  it('calls onTemplateChange when selection changes', () => {
    const onTemplateChange = vi.fn()
    render(
      <TemplateSelector
        selectedTemplate="avery5160"
        onTemplateChange={onTemplateChange}
      />
    )
    const select = screen.getByLabelText(/template/i)
    fireEvent.change(select, { target: { value: 'averyl7160' } })
    expect(onTemplateChange).toHaveBeenCalledWith('averyl7160')
  })

  it('displays selected template', () => {
    render(
      <TemplateSelector
        selectedTemplate="averyl7160"
        onTemplateChange={vi.fn()}
      />
    )
    const select = screen.getByLabelText(/template/i) as HTMLSelectElement
    expect(select.value).toBe('averyl7160')
  })
})
