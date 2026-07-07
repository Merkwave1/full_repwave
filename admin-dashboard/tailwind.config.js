/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#FAFAFE',
          100: '#EDE7FF',
          200: '#C4A8F0',
          300: '#A78BFA',
          400: '#8B5FD6',
          500: '#7A52C2',
          600: '#6B46A8',
          700: '#5B3A8F',
          800: '#2D1B69',
          900: '#1E1145',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 40px -8px rgba(139, 95, 214, 0.45)',
        card: '0 4px 24px -4px rgba(45, 27, 105, 0.12)',
      },
    },
  },
  plugins: [],
};
