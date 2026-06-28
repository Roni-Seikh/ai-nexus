/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: { 50:'#f5f3ff',100:'#ede9fe',200:'#ddd6fe',300:'#c4b5fd',400:'#a78bfa',500:'#8b5cf6',600:'#7c3aed',700:'#6d28d9',800:'#5b21b6',900:'#4c1d95' },
        dark: { 900:'#050505',800:'#0a0a0a',700:'#111111',600:'#1a1a1a',500:'#222222',400:'#2a2a2a',300:'#333333',200:'#444444',100:'#555555' },
      },
      fontFamily: { sans: ['Inter','system-ui','sans-serif'], mono: ['JetBrains Mono','Fira Code','monospace'] },
      animation: { 'fade-in':'fadeIn 0.2s ease-out', 'slide-up':'slideUp 0.3s ease-out', 'pulse-slow':'pulse 3s ease-in-out infinite', 'spin-slow':'spin 3s linear infinite' },
      keyframes: { fadeIn:{from:{opacity:0},to:{opacity:1}}, slideUp:{from:{opacity:0,transform:'translateY(8px)'},to:{opacity:1,transform:'translateY(0)'}} },
      backgroundImage: { 'gradient-radial':'radial-gradient(var(--tw-gradient-stops))', 'gradient-brand':'linear-gradient(135deg, #7c3aed 0%, #4f46e5 50%, #0ea5e9 100%)' },
    },
  },
  plugins: [],
};
