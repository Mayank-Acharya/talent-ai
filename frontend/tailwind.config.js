/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
        slate: {
          850: '#172033',
          950: '#020617',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Consolas', 'monospace'],
      },
      spacing: {
        '4.5': '1.125rem',
        '5.5': '1.375rem',
      },
      animation: {
        'fade-in-up':  'fadeInUp 0.5s ease-out forwards',
        'fade-in':     'fadeIn 0.3s ease-out forwards',
        'spin-slow':   'spinSlow 8s linear infinite',
        'float':       'float 4s ease-in-out infinite',
        'pulse-gentle':'pulse-gentle 3s infinite ease-in-out',
        'slide-down':  'slideDown 0.25s ease-out forwards',
      },
      keyframes: {
        fadeInUp:  { from:{opacity:'0',transform:'translateY(16px)'}, to:{opacity:'1',transform:'translateY(0)'} },
        fadeIn:    { from:{opacity:'0'}, to:{opacity:'1'} },
        spinSlow:  { to:{transform:'rotate(360deg)'} },
        float:     { '0%,100%':{transform:'translateY(0)'}, '50%':{transform:'translateY(-8px)'} },
        'pulse-gentle': { '0%,100%':{opacity:'1',transform:'scale(1)'}, '50%':{opacity:'.8',transform:'scale(.97)'} },
        slideDown: { from:{opacity:'0',transform:'translateY(-8px)'}, to:{opacity:'1',transform:'translateY(0)'} },
      },
      boxShadow: {
        glow:    '0 0 40px -10px rgba(37,99,235,0.4)',
        'glow-sm':'0 0 20px -6px rgba(37,99,235,0.35)',
        card:    '0 4px 24px -4px rgba(0,0,0,0.4)',
      },
    },
  },
  plugins: [],
}
