const defaultTheme = require('tailwindcss/defaultTheme')

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.tsx',
  ],
  darkMode: 'class',
  theme: {
    extend: {},
    fontFamily: {
      sans: [
        ['Inter', ...defaultTheme.fontFamily.sans],
        {
          fontFeatureSettings: '"cv02", "cv03", "cv04", "cv11"',
        },
      ],
      mono: [
        ['Inter', ...defaultTheme.fontFamily.mono],
        {
          fontFeatureSettings: '"cv02", "cv03", "cv04", "cv11"',
        },
      ],
    },
  },
  plugins: [
    require('rippleui'),
  ],
}
