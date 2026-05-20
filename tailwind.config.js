/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        uno: {
          red: '#E53935',
          yellow: '#FDD835',
          blue: '#1E88E5',
          green: '#43A047',
          dark: '#1a3a1a',
          darker: '#0d1f0d',
        },
      },
      fontFamily: {
        game: ['"Fredoka One"', 'cursive', 'sans-serif'],
      },
      animation: {
        'card-play': 'cardPlay 0.4s ease-out',
        'uno-pulse': 'unoPulse 0.6s ease-in-out infinite',
        'fade-in': 'fadeIn 0.3s ease-out',
      },
      keyframes: {
        cardPlay: {
          '0%': { transform: 'translateY(0) scale(1)', opacity: '1' },
          '50%': { transform: 'translateY(-30px) scale(1.1)', opacity: '0.8' },
          '100%': { transform: 'translateY(0) scale(1)', opacity: '1' },
        },
        unoPulse: {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.2)', opacity: '0.8' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
