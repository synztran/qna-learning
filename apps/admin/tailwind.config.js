const basePreset = require('../../packages/ui/src/tailwind-preset.js');

/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [basePreset],
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: ['class', '[data-theme="dark"]'],
  plugins: [require('daisyui')],
};
