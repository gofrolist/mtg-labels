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
        },
      },
    },
  },
  plugins: [],
}
