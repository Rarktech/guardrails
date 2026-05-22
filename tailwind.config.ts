import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Plus Jakarta Sans", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
        scribble: ["Caveat", "cursive"],
      },
      colors: {
        ink: "#1f1a24",
        "ink-soft": "#5b5462",
        paper: "#fdf6ec",
        "paper-2": "#f6ecdc",
        line: "#e8ddc8",
        coral: "#ff7a59",
        "coral-deep": "#e8542e",
        mint: "#6fcfa0",
        "mint-deep": "#2f9e6a",
        sky: "#7bb8ff",
        butter: "#ffd66b",
        rose: "#ffc6b0",
      },
      boxShadow: {
        hard: "0 4px 0 rgba(31,26,36,0.9)",
        "hard-lg": "8px 8px 0 rgba(31,26,36,0.9)",
        soft: "0 2px 0 rgba(31,26,36,0.08), 0 12px 30px -12px rgba(31,26,36,0.18)",
      },
      borderRadius: {
        "2xl": "24px",
        "3xl": "28px",
      },
    },
  },
  plugins: [],
};

export default config;
