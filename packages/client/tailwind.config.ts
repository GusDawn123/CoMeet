import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          50: '#fafafa',
          100: '#171717',
          200: '#141414',
          300: '#111111',
          400: '#0a0a0a',
          500: '#080808',
          600: '#050505',
          700: '#030303',
          800: '#1a1a1a',
          900: '#0e0e0e',
          950: '#000000'
        }
      }
    }
  },
  plugins: []
} satisfies Config
