/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        mono: ['"JetBrains Mono"', 'monospace'],
        display: ['"Syne"', 'sans-serif'],
      },
      colors: {
        geo: {
          bg: '#0a0c0f',
          panel: '#111418',
          border: '#1e2530',
          accent: '#00e5a0',
          accent2: '#0066ff',
          muted: '#3a4455',
          text: '#c8d4e0',
          dim: '#5a6a7a',
        },
      },
    },
  },
  plugins: [],
};