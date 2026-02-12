/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./{!(dist|node_modules)/**/*,*}.{vue,js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}

