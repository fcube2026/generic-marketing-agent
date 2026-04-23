/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1e40af',
          light: '#dbeafe',
          lighter: '#eff6ff',
          dark: '#1e3a8a',
          foreground: '#ffffff',
        },
        teal: {
          DEFAULT: '#0d9488',
          light: '#ccfbf1',
          dark: '#0f766e',
        },
        navy: {
          DEFAULT: '#0f172a',
          light: '#1e293b',
          muted: '#334155',
        },
        medical: {
          red: '#dc2626',
          amber: '#d97706',
          green: '#16a34a',
          blue: '#2563eb',
          purple: '#7c3aed',
        },
        surface: {
          DEFAULT: '#ffffff',
          muted: '#f8fafc',
          border: '#e2e8f0',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px 0 rgb(0 0 0 / 0.05), 0 1px 2px -1px rgb(0 0 0 / 0.05)',
        'card-hover': '0 4px 6px -1px rgb(0 0 0 / 0.08), 0 2px 4px -2px rgb(0 0 0 / 0.06)',
        'sidebar': '2px 0 8px 0 rgb(0 0 0 / 0.08)',
      },
    },
  },
  plugins: [],
};
