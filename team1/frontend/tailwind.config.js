/** @type {import('tailwindcss').Config} */
module.exports = {
  // Preflight OFF: this app has 48 hand-written CSS files. Tailwind's global
  // reset would visually break the not-yet-migrated screens. Utilities stay
  // available; the reset does not run. (Migrated surfaces opt into resets locally.)
  corePlugins: { preflight: false },
  content: ['./src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Clinical brand blue — full scale for "perfect color codes".
        brand: {
          50: '#EEF5FB', 100: '#D9E8F6', 200: '#B6D2EC', 300: '#86B3DD',
          400: '#5790CB', 500: '#2C6BAA', 600: '#235788', 700: '#1D496F',
          800: '#16304a', 900: '#0A2540',
        },
        // Vitality teal — the "alive/health" accent, used sparingly + boldly.
        teal: {
          50: '#E6F7F4', 100: '#C9F0EA', 200: '#9CE3D9', 300: '#6FD9CC',
          400: '#2FC4B4', 500: '#0FB5A6', 600: '#0B8C82', 700: '#0A6F68',
        },
        ink: { DEFAULT: '#0A2540', soft: '#46566B', muted: '#6B7A8D' },
        paper: '#F6F9FC',
        mist: '#EAF1F8',
        cream: '#FFF7EC',
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: { '4xl': '2rem', '5xl': '2.5rem' },
      boxShadow: {
        soft: '0 2px 8px rgba(10, 37, 64, 0.06)',
        card: '0 12px 32px -12px rgba(10, 37, 64, 0.18)',
        lift: '0 24px 60px -20px rgba(10, 37, 64, 0.28)',
        glow: '0 0 60px -12px rgba(15, 181, 166, 0.45)',
      },
      keyframes: {
        'fade-up': { '0%': { opacity: 0, transform: 'translateY(24px)' }, '100%': { opacity: 1, transform: 'translateY(0)' } },
        float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-10px)' } },
        'float-slow': { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-16px)' } },
      },
      animation: {
        'fade-up': 'fade-up 0.7s cubic-bezier(0.22, 1, 0.36, 1) both',
        float: 'float 5s ease-in-out infinite',
        'float-slow': 'float-slow 7s ease-in-out infinite',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
