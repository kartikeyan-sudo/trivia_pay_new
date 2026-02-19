/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Pale green accent — replaces cyan
        cyan: {
          400: '#86efac',  // pale green-300
          500: '#4ade80',  // green-400
          600: '#22c55e',  // green-500
        },
        // Soft emerald — replaces purple
        purple: {
          400: '#6ee7b7',  // emerald-300
          500: '#34d399',  // emerald-400
          600: '#10b981',  // emerald-500
        },
        // Green-tinted dark surfaces
        surface: {
          950: '#030a06',
          900: '#071510',
          800: '#0c2017',
          700: '#132d21',
          600: '#1c3f2e',
          500: '#24513a',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        card:  '0 4px 32px rgba(0,0,0,0.35)',
        glow:  '0 0 24px rgba(74,222,128,0.25)',
        'glow-purple': '0 0 24px rgba(52,211,153,0.25)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in': {
          from: { transform: 'translateX(-100%)' },
          to:   { transform: 'translateX(0)' },
        },
      },
      animation: {
        'fade-in':  'fade-in 0.3s ease both',
        'slide-in': 'slide-in 0.25s ease both',
      },
    },
  },
  plugins: [],
}
