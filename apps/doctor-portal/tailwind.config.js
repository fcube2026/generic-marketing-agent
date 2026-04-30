/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#22C55E',
          light: '#DCFCE7',
          lighter: '#F0FDF4',
          dark: '#16A34A',
          foreground: '#ffffff',
        },
        teal: {
          DEFAULT: '#22C55E',
          light: '#DCFCE7',
          dark: '#14532D',
        },
        navy: {
          DEFAULT: '#14532D',
          light: '#166534',
          muted: '#15803D',
        },
        medical: {
          red: '#dc2626',
          amber: '#d97706',
          green: '#16A34A',
          blue: '#22C55E',
          purple: '#7c3aed',
        },
        surface: {
          DEFAULT: '#ffffff',
          muted: '#F0FDF4',
          border: '#BBF7D0',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px 0 rgb(34 197 94 / 0.08), 0 1px 2px -1px rgb(20 83 45 / 0.05)',
        'card-hover': '0 10px 24px -12px rgb(34 197 94 / 0.22), 0 4px 10px -4px rgb(20 83 45 / 0.10)',
        'sidebar': '2px 0 8px 0 rgb(0 0 0 / 0.08)',
      },
    },
  },
  plugins: [],
};
