/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#0D9488', light: '#CCFBF1', dark: '#0F766E' },
      },
    },
  },
  plugins: [],
};
