import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      boxShadow: {
        glow: '0 24px 80px rgba(124, 58, 237, 0.18)',
      },
      backgroundImage: {
        'radial-soft': 'radial-gradient(circle at top, rgba(168, 85, 247, 0.28), transparent 30%), radial-gradient(circle at bottom right, rgba(59, 130, 246, 0.18), transparent 35%)',
      },
      colors: {
        panel: '#11121A',
        panel2: '#181B2A',
      },
    },
  },
  plugins: [],
}

export default config
