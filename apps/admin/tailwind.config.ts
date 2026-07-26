import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        sidebar: {
          DEFAULT: '#0f172a',
          muted: '#1e293b',
          border: '#334155',
          text: '#cbd5e1',
          active: '#38bdf8',
        },
        brand: {
          DEFAULT: '#0d9488',
          dark: '#0f766e',
          light: '#14b8a6',
        },
      },
      fontFamily: {
        sans: ['"DM Sans"', 'Segoe UI', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
