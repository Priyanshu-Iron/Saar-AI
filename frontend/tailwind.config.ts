import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter"', "system-ui", "-apple-system", "sans-serif"],
      },
      colors: {
        primary: {
          50: "#eef2ff",
          100: "#dbe4ff",
          200: "#bfcfff",
          300: "#93adff",
          400: "#6384fc",
          500: "#3d5ef8",
          600: "#0d59f2",
          700: "#0b47d4",
          800: "#0f3aab",
          900: "#123486",
          950: "#0e2052",
        },
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [],
};

export default config;
