/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "src/**/*.vue",
    "src/**/*.ts",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Zen Kaku Gothic New"', "sans-serif"],
      },
    },
  },
  plugins: [],
};
