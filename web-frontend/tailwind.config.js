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
        // Remap Tailwind green-* to the theme so admin/customer/rider stay in sync
        green: {
          50: '#eef8f8',
          100: '#d9f0f0',
          200: '#b3e0e1',
          300: '#7ec9cb',
          400: '#41abae',
          500: '#3b9a9c',
          600: '#3b9a9c',
          700: '#2d7577',
          800: '#245643',
          900: '#1a3f32',
        },
      },
    },
  },
  plugins: [],
};
