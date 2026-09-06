import type { Config } from "tailwindcss";

// Core colors are stored as "r g b" channel triplets in CSS variables so
// Tailwind's /alpha modifier works: bg-violet/25 -> rgb(var(--violet) / 0.25).
const channel = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: ["selector", '[data-theme="dark"]'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Anek Devanagari"', '"Noto Sans Devanagari"', "system-ui", "sans-serif"],
      },
      colors: {
        ground: channel("ground"),
        surface: channel("surface"),
        raised: channel("raised"),
        ink: channel("ink"),
        cyan: channel("cyan"),
        violet: channel("violet"),
        gold: channel("gold"),
        danger: channel("danger"),
        "ink-2": "var(--ink-2)",
        line: "var(--line)",
        grid: "var(--grid)",
      },
      borderRadius: {
        panel: "12px",
        control: "6px",
      },
      maxWidth: {
        prose: "70ch",
        canvas: "1280px",
      },
      backgroundImage: {
        thread: "var(--thread)",
      },
    },
  },
  plugins: [],
};

export default config;
