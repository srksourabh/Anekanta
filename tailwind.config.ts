import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        stone: {
          50: '#fafaf9', 100: '#f5f5f4', 200: '#e7e5e4',
          300: '#a8a29e', 400: '#78716c', 500: '#57534e',
          600: '#44403c', 700: '#373531', 800: '#292524', 900: '#1c1917',
        },
        lotus: { 50: '#fdf2f8', 100: '#fce7f3', 200: '#fbcfe8', 300: '#f9a8d4', 400: '#f472b6', 500: '#ec4899', 600: '#db2777', 700: '#be185d', 800: '#9d174d', 900: '#831843' },
        teal: { 50: '#f0fdfa', 100: '#ccfbf1', 200: '#99f6e4', 300: '#5eead4', 400: '#2dd4bf', 500: '#14b8a6', 600: '#0d9488', 700: '#0f766e', 800: '#115e59', 900: '#134e4a' },
        pro: '#16a34a',
        con: '#dc2626',
      },
      fontFamily: {
        heading: ['"Cormorant Garamond"', '"Tiro Bangla"', 'Georgia', 'serif'],
        body: ['"Noto Sans"', '"Noto Sans Bengali"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
