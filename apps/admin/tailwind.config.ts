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
        admin: {
          primary: "#7C3AED",   // Purple for admin branding
          secondary: "#6366F1",
        },
      },
    },
  },
  plugins: [],
};

export default config;
