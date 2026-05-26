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
        // "Money green" — vibrant emerald, reads as cash on dark BG.
        money: "#34D399",
        "money-soft": "rgba(52, 211, 153, 0.85)",
      },
      animation: {
        "fade-up": "fadeUp 0.42s cubic-bezier(0.32, 0.72, 0, 1) both",
        "fade-in": "fadeIn 0.3s ease-out both",
        "scale-in": "scaleIn 0.22s cubic-bezier(0.32, 0.72, 0, 1) both",
        "dropdown-in": "dropdownIn 0.18s cubic-bezier(0.32, 0.72, 0, 1) both",
        "page-in": "pageIn 0.32s cubic-bezier(0.32, 0.72, 0, 1) both",
        "route-fade": "routeFade 0.14s ease-out both",
        "sheet-up": "sheetUp 0.32s cubic-bezier(0.32, 0.72, 0, 1) both",
        "ring-draw": "ringDraw 1.1s cubic-bezier(0.16, 1, 0.3, 1) both",
        "bar-fill": "barFill 1s cubic-bezier(0.16, 1, 0.3, 1) both",
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
        pageIn: {
          from: { opacity: "0", transform: "translateX(14px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        dropdownIn: {
          from: { opacity: "0", transform: "translateY(-4px) scale(0.97)" },
          to: { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        routeFade: {
          from: { opacity: "0.4" },
          to: { opacity: "1" },
        },
        sheetUp: {
          from: { opacity: "0", transform: "translateY(40px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        ringDraw: {
          from: { strokeDashoffset: "var(--circ)" },
          to: { strokeDashoffset: "var(--target)" },
        },
        barFill: {
          from: { transform: "scaleX(0)" },
          to: { transform: "scaleX(var(--p, 1))" },
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
        "ios-sharp": "cubic-bezier(0.32, 0.72, 0, 1)",
      },
    },
  },
  plugins: [],
} satisfies Config;
