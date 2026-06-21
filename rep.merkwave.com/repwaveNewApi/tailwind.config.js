/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        cairo: ['Cairo', 'Inter', 'sans-serif'],
      },
      colors: {
        rw: {
          purple:     '#8B5FD6',
          'purple-light': '#C4A8F0',
          'purple-dark':  '#2D1B69',
          'purple-xdark': '#1A0F35',
          coral:      '#F97366',
          'coral-light':  '#FAB5AD',
        },
      },
      backgroundImage: {
        'rw-gradient': 'linear-gradient(135deg, #8B5FD6 0%, #F97366 100%)',
      },
    },
  },
  plugins: [],
}
