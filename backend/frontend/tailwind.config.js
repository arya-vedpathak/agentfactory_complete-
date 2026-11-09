/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: { extend: { colors: { forge: { ink: '#151a2d', violet: '#7566e8', mint: '#55c6a0' } }, fontFamily: { sans: ['Inter', 'sans-serif'] } } },
  plugins: [],
}
