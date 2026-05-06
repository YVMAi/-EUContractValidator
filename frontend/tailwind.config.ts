import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        navy: '#1e3a5f',
        success: '#16a34a',
        warning: '#d97706',
        danger: '#dc2626',
        hold: '#ea580c',
        partial: '#ca8a04',
        info: '#0369a1',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
