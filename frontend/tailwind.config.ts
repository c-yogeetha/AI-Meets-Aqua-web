import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        abyss: "var(--abyss)",
        trench: "var(--trench)",
        deep: "var(--deep)",
        current: "var(--current)",
        lagoon: "var(--lagoon)",
        aqua: "var(--aqua)",
        foam: "var(--foam)",
        paper: "var(--paper)",
        gold: "var(--gold)",
        ink: "var(--ink)",
        "ink-2": "var(--ink-2)",
        "ink-3": "var(--ink-3)",
        ok: "var(--ok)",
        warn: "var(--warn)",
        danger: "var(--danger)",
        hair: "var(--hair)",
        "hair-strong": "var(--hair-strong)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        display: ["var(--font-fraunces)", "Fraunces", "Georgia", "serif"],
        serif: ["var(--font-fraunces)", "Fraunces", "Georgia", "serif"],
        mono: ["var(--font-jetbrains-mono)", "JetBrains Mono", "monospace"],
      },
      borderRadius: {
        DEFAULT: "var(--radius)",
        lg: "var(--radius-lg)",
      },
      boxShadow: {
        "aqua-glow": "0 0 25px rgba(79, 209, 197, 0.25)",
        "gold-glow": "0 0 25px rgba(232, 162, 58, 0.35)",
      },
    },
  },
  plugins: [],
};
export default config;
