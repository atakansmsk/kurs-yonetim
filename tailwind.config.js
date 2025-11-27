/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Override Indigo to map to CSS variables
        indigo: {
          50: 'var(--c-50)',
          100: 'var(--c-100)',
          200: 'var(--c-200)',
          300: 'var(--c-300)',
          400: 'var(--c-400)',
          500: 'var(--c-500)',
          600: 'var(--c-600)',
          700: 'var(--c-700)',
          800: 'var(--c-800)',
          900: 'var(--c-900)',
          950: 'var(--c-950)',
        },
        primary: '#4F46E5', // Keep for compatibility if used explicitly
        primaryDark: '#3730A3',
        secondary: '#8B5CF6', 
        background: '#F8FAFC', 
        surface: '#FFFFFF',
        success: '#10B981', 
        error: '#EF4444', 
        textMain: '#0F172A', 
        textMuted: '#64748B', 
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 10px 40px -10px rgba(0,0,0,0.05)',
        'card': '0 4px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px -1px rgba(0, 0, 0, 0.02)',
        'glow': '0 0 20px rgba(79, 70, 229, 0.15)',
        'glow-colored': '0 8px 20px -6px var(--tw-shadow-color)',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'slide-up': 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'scale-in': 'scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: 0 },
          '100%': { transform: 'translateY(0)', opacity: 1 },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: 0 },
          '100%': { transform: 'scale(1)', opacity: 1 },
        }
      }
    },
  },
  plugins: [],
}