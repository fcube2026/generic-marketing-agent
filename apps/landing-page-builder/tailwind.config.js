/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#7C3AED', light: '#EDE9FE', dark: '#6D28D9' },
        accent: { DEFAULT: '#0D9488', light: '#CCFBF1' },
      },
      boxShadow: {
        glow: '0 24px 80px rgba(124, 58, 237, 0.16)',
      },
    },
  },
  plugins: [],
};
