/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        bg: {
          base: '#0A0A0A',
          surface: '#111111',
          card: '#1A1A1A',
          elevated: '#222222',
        },
        border: {
          DEFAULT: '#2C2C2C',
          subtle: '#1E1E1E',
          strong: '#3D3D3D',
        },
        text: {
          primary: '#FFFFFF',
          secondary: '#A3A3A3',
          muted: '#666666',
        },
        accent: {
          green: '#22C55E',
          'green-dim': '#16A34A',
          yellow: '#EAB308',
          'yellow-dim': '#CA8A04',
          red: '#EF4444',
          'red-dim': '#DC2626',
          blue: '#3B82F6',
          'blue-dim': '#2563EB',
        },
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'glow-green': 'glowGreen 2s ease-in-out infinite alternate',
        'glow-yellow': 'glowYellow 2s ease-in-out infinite alternate',
        'ticker': 'ticker 1s steps(1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        glowGreen: {
          '0%': { boxShadow: '0 0 5px rgba(34, 197, 94, 0.2)' },
          '100%': { boxShadow: '0 0 20px rgba(34, 197, 94, 0.5)' },
        },
        glowYellow: {
          '0%': { boxShadow: '0 0 5px rgba(234, 179, 8, 0.2)' },
          '100%': { boxShadow: '0 0 20px rgba(234, 179, 8, 0.5)' },
        },
        ticker: {
          '0%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'card-shine': 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0) 60%)',
      },
    },
  },
  plugins: [],
}
