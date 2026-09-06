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
          50: '#f0f9ff',
          100: '#e0f2fe',
          500: '#0284c7',
          600: '#0369a1',
          900: '#0c4a6e',
        },
        risk: {
          safe: '#10b981',
          low: '#06b6d4',
          moderate: '#f59e0b',
          high: '#f97316',
          veryhigh: '#ef4444'
        }
      },
      fontFamily: {
        sans: ['Inter', 'Outfit', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow-red': 'glowRed 2s infinite alternate',
      },
      keyframes: {
        glowRed: {
          '0%': { boxShadow: '0 0 10px rgba(239, 68, 68, 0.5)' },
          '100%': { boxShadow: '0 0 25px rgba(239, 68, 68, 0.9)' },
        }
      }
    },
  },
  plugins: [],
}
