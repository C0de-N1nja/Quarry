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
        page: 'var(--page-bg)',
        canvas: 'var(--page-bg)',
        card: {
          DEFAULT: 'var(--card-bg)',
          border: 'var(--card-border)',
        },
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-tertiary': 'var(--text-tertiary)',
        brand: {
          DEFAULT: 'var(--brand-solid)',
          hover: 'var(--brand-solid-hover)',
          solid: 'var(--brand-solid)',
          'solid-hover': 'var(--brand-solid-hover)',
          tint: {
            bg: 'var(--brand-tint-bg)',
            text: 'var(--brand-tint-text)',
            border: 'var(--brand-tint-border)',
          },
          glow: 'rgba(79, 70, 229, 0.25)',
        },
        tint: {
          success: {
            bg: 'var(--tint-success-bg)',
            text: 'var(--tint-success-text)',
            border: 'var(--tint-success-border)',
          },
          warning: {
            bg: 'var(--tint-warning-bg)',
            text: 'var(--tint-warning-text)',
            border: 'var(--tint-warning-border)',
          },
          danger: {
            bg: 'var(--tint-danger-bg)',
            text: 'var(--tint-danger-text)',
            border: 'var(--tint-danger-border)',
          },
          info: {
            bg: 'var(--tint-info-bg)',
            text: 'var(--tint-info-text)',
            border: 'var(--tint-info-border)',
          },
          violet: {
            bg: 'var(--tint-violet-bg)',
            text: 'var(--tint-violet-text)',
            border: 'var(--tint-violet-border)',
          },
          neutral: {
            bg: 'var(--tint-neutral-bg)',
            text: 'var(--tint-neutral-text)',
            border: 'var(--tint-neutral-border)',
          },
          rose: {
            bg: 'var(--tint-rose-bg)',
            text: 'var(--tint-rose-text)',
            border: 'var(--tint-rose-border)',
          },
        },
        surface: {
          0: 'var(--surface-0)',
          1: 'var(--surface-1)',
          2: 'var(--surface-2)',
          3: 'var(--surface-3)',
          4: 'var(--surface-4)',
        },
        border: {
          subtle: 'var(--card-border)',
          hover: 'var(--border-hover)',
        },
        accent: {
          blue: '#3b82f6',
          purple: '#8b5cf6',
          emerald: '#10b981',
          amber: '#f59e0b',
          rose: '#f43f5e'
        }
      },
      boxShadow: {
        'card': '0 1px 2px 0 rgba(0, 0, 0, 0.05), 0 1px 3px 0 rgba(0, 0, 0, 0.1)',
        'dropdown': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'sidebar': '0 1px 12px 0 rgba(0, 0, 0, 0.06), 0 0 1px 0 rgba(0, 0, 0, 0.3)',
        'nav-selected': '0 0 0 1px var(--brand-solid), inset 0 1px 0 0 rgba(255, 255, 255, 0.25)'
      },
      borderRadius: {
        '2lg': '10px',
        '2-5xl': '20px'
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace']
      }
    },
  },
  plugins: [],
}
