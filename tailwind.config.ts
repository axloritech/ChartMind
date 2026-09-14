import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#060913",
          900: "#0a0f1e",
          800: "#101728",
          700: "#1a2338",
          600: "#263149",
        },
        accent: {
          DEFAULT: "#22d3ee",
          dim: "#0e7490",
        },
        bull: "#34d399",
        bear: "#f87171",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "scan": "scan 2.2s ease-in-out infinite",
      },
      keyframes: {
        scan: {
          "0%, 100%": { transform: "translateY(-30%)", opacity: "0.2" },
          "50%": { transform: "translateY(30%)", opacity: "0.9" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
