import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter"', "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        mono: ['ui-monospace', '"SF Mono"', "Menlo", "monospace"],
      },
      colors: {
        line: "rgba(255,255,255,0.08)",
        "line-strong": "rgba(255,255,255,0.16)",
        glass: "rgba(255,255,255,0.045)",
        "text-2": "rgba(255,255,255,0.62)",
        "text-3": "rgba(255,255,255,0.38)",
      },
      animation: {
        rise: "rise 0.35s ease-out both",
        pulse: "pulseDot 2.2s ease-out infinite",
      },
      keyframes: {
        rise: {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        pulseDot: {
          "0%":   { boxShadow: "0 0 0 0 rgba(255,255,255,0.45)" },
          "70%":  { boxShadow: "0 0 0 7px rgba(255,255,255,0)" },
          "100%": { boxShadow: "0 0 0 0 rgba(255,255,255,0)" },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
