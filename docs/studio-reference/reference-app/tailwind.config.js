/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        urbanist: ['Urbanist', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['JetBrains Mono', 'SF Mono', 'monospace'],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
          foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Custom design system colors
        green: {
          DEFAULT: '#79F181',
          dark: '#3D943D',
          darker: '#0C3F09',
          light: '#A5F5AA',
          50: '#F0FDF0',
          100: '#DCFEDC',
          200: '#B8FDB8',
          300: '#79F181',
          400: '#3D943D',
          500: '#0C3F09',
        },
        dark: {
          DEFAULT: '#0A0A0A',
          50: '#1A1A1A',
          100: '#141414',
          200: '#1A1A1A',
          300: '#1E1E1E',
          400: '#0F0F0F',
          500: '#161616',
        },
        surface: {
          DEFAULT: '#1E1E1E',
          elevated: '#1A1A1A',
          card: '#141414',
        },
        text: {
          primary: '#D1D1D1',
          secondary: '#8A8A8A',
          muted: '#6A6A6A',
        },
        danger: '#E54D4D',
        warning: '#F5A623',
      },
      borderRadius: {
        '2xl': '18px',
        '3xl': '24px',
        xl: "calc(var(--radius) + 4px)",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xs: "calc(var(--radius) - 6px)",
        node: '14px',
        card: '12px',
        button: '8px',
        modal: '16px',
      },
      boxShadow: {
        xs: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
        glow: 
          '0 0 0 1px rgba(121, 241, 129, 0.4),' +
          '0 0 12px rgba(121, 241, 129, 0.15),' +
          '0 0 24px rgba(121, 241, 129, 0.05)',
        'glow-strong': 
          '0 0 4px rgba(121, 241, 129, 0.6),' +
          '0 0 16px rgba(121, 241, 129, 0.3),' +
          '0 0 32px rgba(121, 241, 129, 0.1)',
        'glow-intense': 
          '0 0 8px rgba(121, 241, 129, 0.8),' +
          '0 0 24px rgba(121, 241, 129, 0.4),' +
          '0 0 48px rgba(121, 241, 129, 0.2)',
        'glow-lg': '0 0 40px rgba(121, 241, 129, 0.4)',
        'dark-lg': '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "caret-blink": {
          "0%,70%,100%": { opacity: "1" },
          "20%,50%": { opacity: "0" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "fade-out": {
          from: { opacity: "1" },
          to: { opacity: "0" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(20px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-down": {
          from: { opacity: "0", transform: "translateY(-20px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-right": {
          from: { opacity: "0", transform: "translateX(-20px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        "slide-left": {
          from: { opacity: "0", transform: "translateX(20px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.95)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "scale-out": {
          from: { opacity: "1", transform: "scale(1)" },
          to: { opacity: "0", transform: "scale(0.95)" },
        },
        "pulse-glow": {
          "0%, 100%": { 
            boxShadow: 
              "0 0 0 1px rgba(121, 241, 129, 0.4)," +
              "0 0 12px rgba(121, 241, 129, 0.15)," +
              "0 0 24px rgba(121, 241, 129, 0.05)"
          },
          "50%": { 
            boxShadow: 
              "0 0 0 1px rgba(121, 241, 129, 0.6)," +
              "0 0 20px rgba(121, 241, 129, 0.3)," +
              "0 0 40px rgba(121, 241, 129, 0.1)"
          },
        },
        "pulse-glow-fast": {
          "0%, 100%": { 
            boxShadow: 
              "0 0 0 1px rgba(121, 241, 129, 0.5)," +
              "0 0 16px rgba(121, 241, 129, 0.2)," +
              "0 0 32px rgba(121, 241, 129, 0.1)"
          },
          "50%": { 
            boxShadow: 
              "0 0 0 1px rgba(121, 241, 129, 0.8)," +
              "0 0 24px rgba(121, 241, 129, 0.4)," +
              "0 0 48px rgba(121, 241, 129, 0.2)"
          },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-5px)" },
        },
        "spin-slow": {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(360deg)" },
        },
        "dash": {
          to: { strokeDashoffset: "-20" },
        },
        "shimmer": {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "node-appear": {
          from: { 
            opacity: "0",
            transform: "scale(0.9) translateY(10px)"
          },
          to: { 
            opacity: "1",
            transform: "scale(1) translateY(0)"
          },
        },
        "connection-draw": {
          from: { strokeDashoffset: "1000" },
          to: { strokeDashoffset: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "caret-blink": "caret-blink 1.25s ease-out infinite",
        "fade-in": "fade-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "fade-out": "fade-out 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "slide-up": "slide-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "slide-down": "slide-down 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "slide-right": "slide-right 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "slide-left": "slide-left 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "scale-in": "scale-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "scale-out": "scale-out 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "pulse-glow-fast": "pulse-glow-fast 1s ease-in-out infinite",
        "float": "float 3s ease-in-out infinite",
        "spin-slow": "spin-slow 3s linear infinite",
        "dash": "dash 1.5s linear infinite",
        "shimmer": "shimmer 1.5s linear infinite",
        "node-appear": "node-appear 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "connection-draw": "connection-draw 1s cubic-bezier(0.16, 1, 0.3, 1) forwards",
      },
      transitionTimingFunction: {
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'out-quart': 'cubic-bezier(0.25, 1, 0.5, 1)',
        'out-quint': 'cubic-bezier(0.22, 1, 0.36, 1)',
        'spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'out-back': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      transitionDuration: {
        'instant': '100ms',
        'fast': '150ms',
        'normal': '200ms',
        'moderate': '300ms',
        'slow': '400ms',
        'emphasis': '600ms',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
