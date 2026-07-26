import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './providers/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        leaf: {
          50: 'var(--color-leaf-50)',
          100: 'var(--color-leaf-100)',
          200: 'var(--color-leaf-200)',
          300: 'var(--color-leaf-300)',
          400: 'var(--color-leaf-400)',
          500: 'var(--color-leaf-500)',
          600: 'var(--color-leaf-600)',
          700: 'var(--color-leaf-700)',
          800: 'var(--color-leaf-800)',
          900: 'var(--color-leaf-900)',
        },
        citrus: {
          400: 'var(--color-citrus-400)',
          500: 'var(--color-citrus-500)',
          600: 'var(--color-citrus-600)',
        },
        mist: 'var(--color-mist)',
        ink: 'var(--color-ink)',
        muted: 'var(--color-muted)',
        heading: 'var(--color-heading)',
        surface: 'var(--color-surface)',
        'surface-2': 'var(--color-surface-2)',
        line: 'var(--color-border)',
      },
      fontFamily: {
        display: ['var(--font-display)', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'market-glow':
          'radial-gradient(ellipse 80% 50% at 20% 0%, var(--color-leaf-100), transparent), radial-gradient(ellipse 60% 40% at 90% 10%, rgba(255, 196, 84, 0.25), transparent)',
      },
    },
  },
  plugins: [],
};

export default config;
