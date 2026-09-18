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
        clo: {
          bg: '#0f1115',
          panel: '#181a20',
          surface: '#22252c',
          border: '#2d313b',
          accent: '#3b82f6',
          accentHover: '#2563eb',
          text: '#f1f5f9',
          muted: '#94a3b8'
        }
      }
    },
  },
  plugins: [],
}
