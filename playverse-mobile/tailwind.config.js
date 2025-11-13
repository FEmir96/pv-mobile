/** @type {import('tailwindcss').Config} */
const playverseColors = {
  background: '#0F2D3A',
  surface: '#103B49',
  surfaceBorder: '#1C4D5E',
  textPrimary: '#E6F4F1',
  textSecondary: '#A4C9D3',
  accent: '#F2B705',
  accentAlt: '#F28C0F',
  info: '#25C2D3',
  success: '#2ECC71',
  shadow: 'rgba(0,0,0,0.35)',
};

module.exports = {
  content: ['./App.tsx', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: playverseColors,
      spacing: {
        xs: '6px',
        sm: '10px',
        md: '14px',
        lg: '18px',
        xl: '24px',
        xxl: '32px',
      },
      borderRadius: {
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '20px',
        pill: '999px',
      },
      fontSize: {
        h1: ['28px', { lineHeight: '34px' }],
        h2: ['22px', { lineHeight: '28px' }],
        h3: ['18px', { lineHeight: '24px' }],
        body: ['14px', { lineHeight: '20px' }],
        caption: ['12px', { lineHeight: '16px' }],
      },
      boxShadow: {
        card: '0px 8px 24px rgba(0,0,0,0.35)',
      },
      screens: {
        xs: '360px',
        tablet: '768px',
        laptop: '1024px',
      },
    },
  },
  plugins: [],
};
