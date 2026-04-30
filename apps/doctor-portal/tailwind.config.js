/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#3CB371',
          light: '#D4F1E0',
          lighter: '#EBF9F4',
          dark: '#2D8659',
          foreground: '#ffffff',
        },
        teal: {
          DEFAULT: '#3CB371',
          light: '#D4F1E0',
          dark: '#1F5C3F',
        },
        navy: {
          DEFAULT: '#1F5C3F',
          light: '#2D8659',
          muted: '#3CB371',
        },
        medical: {
          red: '#dc2626',
          amber: '#d97706',
          green: '#2D8659',
          blue: '#3CB371',
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
