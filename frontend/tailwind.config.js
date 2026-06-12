/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["'Playfair Display'", "Georgia", "serif"],
        body: ["'DM Sans'", "system-ui", "sans-serif"],
      },
      colors: {
        saffron:  "#E8871E",
        turmeric: "#F5C842",
        leaf:     "#3D7A4F",
        clay:     "#C25B3F",
        cream:    "#FDF6EC",
        charcoal: "#1E1E1E",
        mist:     "#F0EDE8",
      },
    },
  },
  plugins: [],
};
