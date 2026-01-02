/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      keyframes: {
        'slide-in': {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '20%': { transform: 'translateX(0)', opacity: '1' },
          '80%': { transform: 'translateX(0)', opacity: '1' },
          '100%': { transform: 'translateX(100%)', opacity: '0' },
        }
      },
      animation: {
        'slide-in': 'slide-in 3s ease-out',
      }
    },
  },
  plugins: [
    require('@tailwindcss/aspect-ratio'),
    require('tailwind-scrollbar'),
  ],
}
