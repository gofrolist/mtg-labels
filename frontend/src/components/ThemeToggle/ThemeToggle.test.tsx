import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ThemeToggle } from './ThemeToggle'
import { useTheme } from '../../hooks/useTheme'

vi.mock('../../hooks/useTheme')

describe('ThemeToggle', () => {
  it('renders theme toggle button', () => {
    vi.mocked(useTheme).mockReturnValue({
      theme: 'light',
      toggleTheme: vi.fn(),
      setTheme: vi.fn(),
    })

    render(<ThemeToggle />)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('calls toggleTheme when clicked', () => {
    const toggleTheme = vi.fn()
    vi.mocked(useTheme).mockReturnValue({
      theme: 'light',
      toggleTheme,
      setTheme: vi.fn(),
    })

    render(<ThemeToggle />)
    fireEvent.click(screen.getByRole('button'))
    expect(toggleTheme).toHaveBeenCalledTimes(1)
  })

  it('shows moon icon for light theme', () => {
    vi.mocked(useTheme).mockReturnValue({
      theme: 'light',
      toggleTheme: vi.fn(),
      setTheme: vi.fn(),
    })

    render(<ThemeToggle />)
    expect(screen.getByText('🌙')).toBeInTheDocument()
  })

  it('shows sun icon for dark theme', () => {
    vi.mocked(useTheme).mockReturnValue({
      theme: 'dark',
      toggleTheme: vi.fn(),
      setTheme: vi.fn(),
    })

    render(<ThemeToggle />)
    expect(screen.getByText('☀️')).toBeInTheDocument()
  })
})
