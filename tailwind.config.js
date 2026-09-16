import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: '#F7F3EE',
        sand: '#E8DFD3',
        ink: '#2B2B2B',
        muted: '#6B6560',
        accent: '#B4532A',
      },
    },
  },
  plugins: [],
} satisfies Config;
