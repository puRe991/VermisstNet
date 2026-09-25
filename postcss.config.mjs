// Tailwind v3 + Autoprefixer: Zielbrowser siehe "browserslist" in package.json
// (bewusst niedrig gewählt, damit auch ältere Windows-Systeme mit Chrome/Edge 109 oder Firefox ESR 115 unterstützt werden)
const config = {
  plugins: { tailwindcss: {}, autoprefixer: {} },
};
export default config;
