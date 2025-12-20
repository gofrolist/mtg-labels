import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SearchBar } from './SearchBar'

describe('SearchBar', () => {
  it('renders search input', () => {
    render(<SearchBar value="" onChange={vi.fn()} onClear={vi.fn()} />)
    const input = screen.getByPlaceholderText(/search/i)
    expect(input).toBeInTheDocument()
  })

  it('calls onChange when input value changes', () => {
    const onChange = vi.fn()
    render(<SearchBar value="" onChange={onChange} onClear={vi.fn()} />)
    const input = screen.getByPlaceholderText(/search/i)
    fireEvent.change(input, { target: { value: 'test' } })
    expect(onChange).toHaveBeenCalledWith('test')
  })

  it('shows clear button when value is not empty', () => {
    render(<SearchBar value="test" onChange={vi.fn()} onClear={vi.fn()} />)
    expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument()
  })

  it('hides clear button when value is empty', () => {
    render(<SearchBar value="" onChange={vi.fn()} onClear={vi.fn()} />)
    expect(screen.queryByRole('button', { name: /clear/i })).not.toBeInTheDocument()
  })

  it('calls onClear when clear button is clicked', () => {
    const onClear = vi.fn()
    render(<SearchBar value="test" onChange={vi.fn()} onClear={onClear} />)
    fireEvent.click(screen.getByRole('button', { name: /clear/i }))
    expect(onClear).toHaveBeenCalledTimes(1)
  })
})
