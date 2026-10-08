/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#dc2626',
          600: '#b91c1c',
          700: '#991b1b',
          800: '#7f1d1d',
          900: '#450a0a',
        },
        // Tema renkleri CSS degiskenlerinden gelir (src/index.css):
        // :root = acik tema (varsayilan), .theme-dark = koyu tema (foto
        // uzerindeki hero alani, lightbox gibi bolgelerde kullanilir).
        // Isimler eski koyu temadaki rolleriyle ayni kaldi: dark-900 = sayfa
        // zemini, dark-800 = kart zemini, dark-700 = kenarlik, dark-400 = ikincil metin.
        dark: Object.fromEntries(
          [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950].map((k) => [
            k,
            `rgb(var(--c-dark-${k}) / <alpha-value>)`,
          ])
        ),
        ink: 'rgb(var(--c-ink) / <alpha-value>)',
      },
    },
  },
  plugins: [],
}
