import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#0c0c14",
        surface: "#14141f",
        primary: "#7c3aed",
      },
      fontFamily: {
        body: ["DM Sans", "sans-serif"],
        heading: ["Syne", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
