import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx,html}'],
  theme: {
    extend: {
      colors: {
        shopify: {
          green: '#008060',
          'green-dark': '#004c3f',
          'green-light': '#b4fed2',
          surface: '#f6f6f7',
          text: '#202223',
          'text-secondary': '#6d7175',
          critical: '#d72c0d',
          warning: '#ffc453',
          success: '#008060',
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
