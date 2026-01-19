/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        void: "#0a0a0b",
        surface: "#111113",
        elevated: "#18181b",
        hover: "#1f1f23",
        "border-dim": "#27272a",
        "border-active": "#3f3f46",
        gold: {
          DEFAULT: "#fbbf24",
          dim: "rgba(251, 191, 36, 0.15)",
        },
        emerald: {
          DEFAULT: "#34d399",
          dim: "rgba(52, 211, 153, 0.15)",
        },
        rose: {
          DEFAULT: "#fb7185",
          dim: "rgba(251, 113, 133, 0.15)",
        },
        violet: {
          DEFAULT: "#a78bfa",
          dim: "rgba(167, 139, 250, 0.15)",
        },
        cyan: {
          DEFAULT: "#22d3ee",
          dim: "rgba(34, 211, 238, 0.15)",
        },
      },
      fontFamily: {
        sans: ["Outfit", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
};
