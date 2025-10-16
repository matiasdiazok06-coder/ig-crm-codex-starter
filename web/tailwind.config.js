/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        night: '#0f0f10',
        slateNight: '#121214',
        royalBlue: '#1e3a8a',
        charcoal: '#2a2b31',
        violetAccent: '#833AB4',
      },
      boxShadow: {
        glow: '0 10px 45px rgba(131, 58, 180, 0.35)',
      },
    },
  },
  plugins: [],
};
