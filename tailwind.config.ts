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
        playfair: ["var(--font-playfair)", "Georgia", "serif"],
        cormorant: ["var(--font-cormorant)", "Georgia", "serif"],
        dancing: ["var(--font-dancing)", "cursive"],
      },
      colors: {
        mrk: {
          navy: "var(--primary)",
          "navy-deep": "var(--primary-deep)",
          "navy-light": "var(--primary-soft)",
          gold: "var(--gold)",
          "gold-muted": "var(--gold-muted)",
          "gold-dark": "var(--gold-dark)",
          cream: "var(--cream)",
          "cream-deep": "var(--cream-deep)",
          body: "var(--text)",
        },
      },
    },
  },
  plugins: [],
};
export default config;
