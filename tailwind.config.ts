import type { Config } from "tailwindcss";

// Ruhige, vertrauenswürdige Farbwelt. Farben als Hex-Werte: Tailwind v3 erzeugt daraus
// rgb()-Werte mit Deckkraft – ohne color-mix()/oklch(), die ältere Browser nicht kennen.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1b2430",
        muted: "#566373",
        line: "#d8dee5",
        canvas: "#f4f6f8",
        surface: "#ffffff",
        brand: { DEFAULT: "#1d4e6e", strong: "#153a52", soft: "#e7eff5" },
        urgent: { DEFAULT: "#8a3a12", soft: "#fdf1e8" },
        found: { DEFAULT: "#1f6b3d", soft: "#eaf6ee" },
        danger: { DEFAULT: "#a8261a", soft: "#fdeceb" },
        warn: { DEFAULT: "#7a5a00", soft: "#fff7df" },
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "-apple-system", '"Segoe UI"', "Roboto", '"Helvetica Neue"', "Arial", '"Noto Sans"', "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
