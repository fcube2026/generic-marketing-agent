/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1FB79A',
          light: '#8FE3D3',
          lighter: '#DFF7F1',
          dark: '#0F8F79',
          foreground: '#ffffff',
        },
        teal: {
          DEFAULT: '#1FB79A',
          light: '#8FE3D3',
          dark: '#0D7664',
        },
        navy: {
          DEFAULT: '#0F5A4D',
          light: '#0F8F79',
          muted: '#1FB79A',
        },
        medical: {
          red: '#dc2626',
          amber: '#d97706',
          green: '#0F8F79',
          blue: '#1FB79A',
          purple: '#7c3aed',
        },
        surface: {
          DEFAULT: '#ffffff',
          muted: '#F2FBF8',
          border: '#B8EBE0',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px 0 rgb(31 183 154 / 0.10), 0 1px 2px -1px rgb(15 90 77 / 0.06)',
        'card-hover': '0 10px 24px -12px rgb(31 183 154 / 0.24), 0 4px 10px -4px rgb(15 90 77 / 0.12)',
        'sidebar': '2px 0 8px 0 rgb(0 0 0 / 0.08)',
      },
    },
  },
  plugins: [],
};
