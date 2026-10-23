/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-poppins)', 'Poppins', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        // Keep existing font-serif classes on Poppins so the whole app stays consistent
        serif: ['var(--font-poppins)', 'Poppins', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          accent: 'var(--qc-accent)',
          DEFAULT: 'var(--qc-primary)',
          bright: 'var(--qc-primary-bright)',
          dark: 'var(--qc-primary-dark)',
          soft: 'var(--qc-soft)',
          bg: 'var(--qc-bg)',
          surface: 'var(--qc-surface)',
          text: 'var(--qc-text)',
          muted: 'var(--qc-muted)',
          'muted-light': 'var(--qc-muted-light)',
          border: 'var(--qc-border)',
          warning: 'var(--qc-warning-text)',
          'warning-bg': 'var(--qc-warning-bg)',
        },
        // Remap leftover green-* utilities to the purple theme
        green: {
          50: '#f7f5fc',
          100: '#ebe6fa',
          200: '#d8d2ee',
          300: '#b5a8e8',
          400: '#8b74db',
          500: '#5332c9',
          600: '#5332c9',
          700: '#3d2599',
          800: '#2f1c7a',
          900: '#1a1433',
        },
      },
    },
  },
  plugins: [],
};
