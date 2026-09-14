import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // brand: mostly white surfaces, red used sparingly as the accent
        accent: {
          DEFAULT: "#dc2626", // red-600
          dim: "#991b1b",
        },
        bull: "#059669", // emerald-600
        bear: "#dc2626", // red-600
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
          "0%, 100%": { transform: "translateY(-30%)", opacity: "0.15" },
          "50%": { transform: "translateY(30%)", opacity: "0.7" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
