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
        abyss: "#04141F",
        deep: "#062B3D",
        ocean: "#0B5C73",
        aqua: "#3DD6D0",
        foam: "#CFF5F2",
        gold: "#FF8A1F",
        ok: "#3DDC97",
        warn: "#FFC145",
        danger: "#FF4D5E",
        ink: "#E8F7F6",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        display: ["var(--font-fraunces)", "Fraunces", "Georgia", "serif"],
        serif: ["var(--font-fraunces)", "Fraunces", "Georgia", "serif"],
      },
      boxShadow: {
        "aqua-glow": "0 0 25px rgba(61, 214, 208, 0.25)",
        "gold-glow": "0 0 25px rgba(255, 138, 31, 0.3)",
      },
    },
  },
  plugins: [],
};
export default config;
