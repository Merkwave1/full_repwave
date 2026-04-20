/** @type {import('tailwindcss').Config} */
export default {
  // The 'content' array is crucial for Tailwind CSS to know which files
  // to scan for utility classes. This allows Tailwind to only generate
  // the CSS that your project actually uses, resulting in smaller bundle sizes.
  content: [
    // Look for Tailwind classes in all .html files in the root directory
    "./index.html",
    // Look for Tailwind classes in all .js and .jsx files within the src directory
    // and its subdirectories.
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      // You can extend Tailwind's default theme here.
      // For example, adding custom colors, fonts, spacing, etc.
      // colors: {
      //   'custom-blue': '#243c5a',
      // },
      fontFamily: {
        // Add Cairo as the primary sans-serif font. Keep Inter as fallback.
        cairo: ['Cairo', 'Inter', 'sans-serif'],
      },
    },
  },
  plugins: [
    // You can add Tailwind plugins here.
    // For example, @tailwindcss/forms for better form styling,
    // or @tailwindcss/typography for rich text styling.
    // require('@tailwindcss/forms'),
  ],
}
