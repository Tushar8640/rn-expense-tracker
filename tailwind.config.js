/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#4B7A5B",
        "primary-light": "#E8F0EB",
        "primary-dark": "#3A5F47",
        accent: "#A8C5B5",
        danger: "#E85D5D",
        "danger-light": "#FDEAEA",
        dark: "#1A2B23",
        muted: "#7A8F84",
        light: "#F5F7F6",
        card: "#FFFFFF",
        sage: "#D4E4DA",
      },
    },
  },
  plugins: [],
};
