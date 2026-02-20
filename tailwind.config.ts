import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        saffron: { 50: '#fff8ed', 100: '#ffeed4', 200: '#ffd9a8', 300: '#ffbe70', 400: '#ff9736', 500: '#ff7a0f', 600: '#f06006', 700: '#c74707', 800: '#9e380e', 900: '#7f300f' },
        earth: { 50: '#faf6f1', 100: '#f0e8da', 200: '#e0cfb3', 300: '#ccaf85', 400: '#b88f5e', 500: '#a97847', 600: '#96633c', 700: '#7b4d33', 800: '#66402f', 900: '#553629' },
        lotus: { 50: '#fdf2f8', 100: '#fce7f3', 200: '#fbcfe8', 300: '#f9a8d4', 400: '#f472b6', 500: '#ec4899', 600: '#db2777', 700: '#be185d', 800: '#9d174d', 900: '#831843' },
        teal: { 50: '#f0fdfa', 100: '#ccfbf1', 200: '#99f6e4', 300: '#5eead4', 400: '#2dd4bf', 500: '#14b8a6', 600: '#0d9488', 700: '#0f766e', 800: '#115e59', 900: '#134e4a' },
        pro: '#16a34a',
        con: '#dc2626',
      },
      fontFamily: {
        heading: ['"Cormorant Garamond"', '"Tiro Bangla"', '"Tiro Devanagari Hindi"', 'Georgia', 'serif'],
        body: ['"Noto Sans"', '"Noto Sans Bengali"', '"Noto Sans Devanagari"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
