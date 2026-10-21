/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    extend: {
      fontFamily: {
        display: ['Quicksand', 'Be Vietnam Pro', 'system-ui', 'sans-serif'],
        body: ['Be Vietnam Pro', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        brand: {
          burgundy: '#8B1E28', darkBurgundy: '#6B151F', rose: '#E07A82',
          gold: '#D9A875', goldSoft: '#FBF1E6', paper: '#FDF6F3',
          paperDark: '#1B1213', surfaceDark: '#251A1B', softLight: '#FBEAE6',
          softDark: '#33211F', lineLight: '#EBD8D2', lineDark: '#4A3432',
          success: '#3F8F5F', successDark: '#6CC490', error: '#C0392B', errorDark: '#F0705F',
        },
      },
      boxShadow: {
        quiz: '0 6px 22px rgba(139, 30, 40, 0.08)',
        quizDark: '0 6px 22px rgba(0, 0, 0, 0.35)',
      },
    },
  },
  plugins: [require('daisyui')],
  daisyui: {
    themes: [{
      light: {
        primary: '#8B1E28', 'primary-content': '#FDF6F3',
        secondary: '#D9A875', 'secondary-content': '#3A2020',
        accent: '#A6712F', 'accent-content': '#FFFFFF',
        neutral: '#3A2020', 'neutral-content': '#FDF6F3',
        'base-100': '#FDF6F3', 'base-200': '#FBEAE6', 'base-300': '#EBD8D2',
        'base-content': '#3A2020', info: '#2563EB', success: '#3F8F5F',
        'success-content': '#FFFFFF', warning: '#D9A875', error: '#C0392B',
        'error-content': '#FFFFFF', '--rounded-box': '1rem',
        '--rounded-btn': '0.75rem', '--rounded-badge': '1.9rem',
      },
      dark: {
        primary: '#E07A82', 'primary-content': '#1B1213',
        secondary: '#D9A875', 'secondary-content': '#1B1213',
        accent: '#E0B783', 'accent-content': '#1B1213',
        neutral: '#F4E7E3', 'neutral-content': '#1B1213',
        'base-100': '#1B1213', 'base-200': '#251A1B', 'base-300': '#33211F',
        'base-content': '#F4E7E3', info: '#60A5FA', success: '#6CC490',
        'success-content': '#1B1213', warning: '#E0B783', error: '#F0705F',
        'error-content': '#1B1213', '--rounded-box': '1rem',
        '--rounded-btn': '0.75rem', '--rounded-badge': '1.9rem',
      },
    }],
  },
};
