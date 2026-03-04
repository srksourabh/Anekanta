import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        saffron: { 50: '#fdf6ee', 100: '#f8e8d0', 200: '#f0d0a3', 300: '#e4b06e', 400: '#d4903f', 500: '#c47a2e', 600: '#b06824', 700: '#924f1e', 800: '#76401c', 900: '#62351b' },
        earth: { 50: '#faf6f1', 100: '#f0e8da', 200: '#e0cfb3', 300: '#ccaf85', 400: '#b88f5e', 500: '#a97847', 600: '#96633c', 700: '#7b4d33', 800: '#66402f', 900: '#553629' },
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
