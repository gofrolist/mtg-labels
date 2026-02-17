/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        mtg: {
          bg: 'var(--mtg-bg)',
          'card-bg': 'var(--mtg-card-bg)',
          text: 'var(--mtg-text)',
          'text-muted': 'var(--mtg-text-muted)',
          border: 'var(--mtg-border)',
          accent: 'var(--mtg-accent)',
          'accent-hover': 'var(--mtg-accent-hover)',
          'nav-from': 'var(--mtg-nav-from)',
          'nav-to': 'var(--mtg-nav-to)',
          'section-bg': 'var(--mtg-section-bg)',
          'section-header-bg': 'var(--mtg-section-header-bg)',
          'input-bg': 'var(--mtg-input-bg)',
          'hover-bg': 'var(--mtg-hover-bg)',
        },
      },
    },
  },
  plugins: [],
}
