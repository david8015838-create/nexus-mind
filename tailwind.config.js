/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        "primary": "var(--primary-color)",
        "primary-dark": "var(--primary-dark)",
        "background-light": "#f6f6f8",
        "background-dark": "#06060a",
        "nexus": {
          "void": "#06060a",
          "deep": "#0d0d14",
          "surface": "#14141f",
          "elevated": "#1c1c2e",
          "interactive": "#22223a",
          "primary": "#7c6dff",
          "primary-light": "#a89bff",
          "primary-dark": "#5b4ee6",
          "gold": "#f0b429",
          "success": "#34d399",
          "warning": "#fbbf24",
          "danger": "#f87171",
          "info": "#60a5fa",
          "text": "#f0f0ff",
          "secondary": "#9898c0",
          "muted": "#5a5a80",
        }
      },
      fontFamily: {
        "display": ["Manrope", "sans-serif"],
        "sans": ["Manrope", "sans-serif"],
      },
      borderRadius: {
        "DEFAULT": "0.25rem",
        "lg": "0.5rem",
        "xl": "0.75rem",
        "2xl": "1rem",
        "3xl": "1.5rem",
        "full": "9999px"
      },
      animation: {
        "nexus-pulse": "nexusPulse 2s ease-in-out infinite",
        "glow-breath": "glowBreath 3s ease-in-out infinite",
        "slide-up-fade": "slideUpFade 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "nav-indicator": "navIndicator 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "orbital-ring": "orbitalRing 8s linear infinite",
      },
      keyframes: {
        nexusPulse: {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.6", transform: "scale(0.96)" },
        },
        glowBreath: {
          "0%, 100%": { boxShadow: "0 0 20px rgba(124,109,255,0.2)" },
          "50%": { boxShadow: "0 0 30px rgba(124,109,255,0.4), 0 0 60px rgba(124,109,255,0.15)" },
        },
        slideUpFade: {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        navIndicator: {
          from: { width: "0", opacity: "0" },
          to: { width: "20px", opacity: "1" },
        },
        orbitalRing: {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(360deg)" },
        },
      },
      boxShadow: {
        "nexus-card": "0 1px 2px rgba(0,0,0,0.4), 0 4px 16px rgba(0,0,0,0.3), 0 0 0 1px rgba(124, 109, 255, 0.06)",
        "nexus-elevated": "0 2px 4px rgba(0,0,0,0.5), 0 8px 32px rgba(0,0,0,0.4), 0 0 20px rgba(124, 109, 255, 0.12)",
        "nexus-glow": "0 4px 12px rgba(0,0,0,0.4), 0 0 20px rgba(124, 109, 255, 0.3), 0 0 40px rgba(124, 109, 255, 0.15)",
      },
    },
  },
  plugins: [],
}
