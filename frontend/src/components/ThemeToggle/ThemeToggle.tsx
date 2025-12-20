import { memo } from 'react'
import { useTheme } from '../../hooks/useTheme'

export const ThemeToggle = memo(function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  return (
    <button
      onClick={toggleTheme}
      className="px-4 py-2 rounded-lg bg-mtg-card-bg border border-mtg-border hover:bg-opacity-80 transition-colors"
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
    >
      {theme === 'light' ? '🌙' : '☀️'}
    </button>
  )
})
