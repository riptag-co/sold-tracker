import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        // SF stack: native on Apple devices, falls back to Segoe UI on
        // Windows and Inter Variable / system-ui everywhere else.
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          '"SF Pro Text"',
          '"SF Pro Display"',
          '"Segoe UI"',
          '"Helvetica Neue"',
          "system-ui",
          "sans-serif",
        ],
        display: [
          '"SF Pro Display"',
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "system-ui",
          "sans-serif",
        ],
        // Rounded variant — iOS Fitness / Activity vibe for hero numbers.
        rounded: [
          '"SF Pro Rounded"',
          '"SF Pro Display"',
          "-apple-system",
          "BlinkMacSystemFont",
          "system-ui",
          "sans-serif",
        ],
        mono: ['"SF Mono"', "ui-monospace", "Menlo", "monospace"],
      },
      colors: {
        ink: "#0A0A0B",
        "ink-2": "#101012",
        "text-2": "rgba(255,255,255,0.62)",
        "text-3": "rgba(255,255,255,0.38)",
        line: "rgba(255,255,255,0.06)",
        "line-strong": "rgba(255,255,255,0.12)",
      },
      animation: {
        "fade-up": "fadeUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) both",
        "fade-in": "fadeIn 0.4s ease-out both",
        "scale-in": "scaleIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) both",
        "live-pulse": "livePulse 2.2s ease-out infinite",
        shimmer: "shimmer 2s linear infinite",
      },
      keyframes: {
        fadeUp: {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        scaleIn: {
          from: { opacity: "0", transform: "scale(0.96)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        livePulse: {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.55", transform: "scale(0.85)" },
        },
        shimmer: {
          from: { backgroundPosition: "200% 0" },
          to: { backgroundPosition: "-200% 0" },
        },
      },
      transitionTimingFunction: {
        "ios-spring": "cubic-bezier(0.16, 1, 0.3, 1)",
      },
    },
  },
  plugins: [],
} satisfies Config;
