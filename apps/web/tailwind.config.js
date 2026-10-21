const basePreset = require('../../packages/ui/src/tailwind-preset.js');
const webPreset = require('./theme-preset.js');

/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [basePreset, webPreset],
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: ['class', '[data-theme="dark"]'],
  plugins: [require('daisyui')],
  daisyui: webPreset.daisyui,
};
