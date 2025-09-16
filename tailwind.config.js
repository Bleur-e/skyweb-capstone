/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
      "./src/app/*.{js,ts,jsx,tsx}", // ✅ Adjust if needed
      "./src/components/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
      extend: {},
    },
    plugins: [],
  }