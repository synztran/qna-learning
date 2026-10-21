/** Web-only Soft Sage & Cream theme. */
module.exports = {
  theme: {
    extend: {
      fontFamily: {
        display: ['Quicksand', 'Be Vietnam Pro', 'system-ui', 'sans-serif'],
        body: ['Be Vietnam Pro', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        brand: {
          burgundy: '#8B1E28',
          darkBurgundy: '#6B151F',
          rose: '#E07A82',
          gold: '#D9A875',
          goldSoft: '#FBF1E6',
          paper: '#FDF6F3',
          paperDark: '#1B1213',
          surfaceDark: '#251A1B',
          softLight: '#FBEAE6',
          softDark: '#33211F',
          lineLight: '#EBD8D2',
          lineDark: '#4A3432',
          success: '#3F8F5F',
          successDark: '#6CC490',
          error: '#C0392B',
          errorDark: '#F0705F',
        },
        sage: {
          cream: '#FDFBF7',
          lightSand: '#F3F1EC',
          sandBorder: '#E5E0D8',
          darkForest: '#1C2A23',
          mutedSage: '#52796F',
          softSage: '#84A98C',
          deepForest: '#141E19',
          forestBorder: '#2A3C32',
        },
      },
      boxShadow: {
        quiz: '0 6px 22px rgba(28, 42, 35, 0.06)',
        quizDark: '0 6px 22px rgba(0, 0, 0, 0.35)',
      },
    },
  },
  plugins: [require('daisyui')],
  daisyui: {
    themes: [
      {
        light: {
          'primary': '#52796F', // Muted Sage (Accent 10%)
          'primary-content': '#FFFFFF',
          'secondary': '#84A98C', // Soft Sage
          'secondary-content': '#1C2A23',
          'accent': '#52796F', // Muted Sage
          'accent-content': '#FFFFFF',
          'neutral': '#1C2A23', // Dark Forest (Text/Dark 10%)
          'neutral-content': '#FDFBF7',
          'base-100': '#FDFBF7', // Warm Cream (Background 60%)
          'base-200': '#F3F1EC', // Light Sand (Surface/Card 30%)
          'base-300': '#E5E0D8', // Sand Border
          'base-content': '#1C2A23', // Dark Forest (Text/Dark 10%)
          'info': '#4A7C9D',
          'success': '#2D6A4F', // Forest Green
          'success-content': '#FFFFFF',
          'warning': '#D4A373', // Warm Sand Gold
          'warning-content': '#1C2A23',
          'error': '#B74742', // Soft Crimson
          'error-content': '#FFFFFF',
          '--rounded-box': '1rem',
          '--rounded-btn': '0.75rem',
          '--rounded-badge': '1.9rem',
        },
        dark: {
          'primary': '#84A98C', // Soft Sage
          'primary-content': '#141E19',
          'secondary': '#52796F', // Muted Sage
          'secondary-content': '#F3F1EC',
          'accent': '#84A98C',
          'accent-content': '#141E19',
          'neutral': '#F3F1EC',
          'neutral-content': '#141E19',
          'base-100': '#141E19', // Deep Forest
          'base-200': '#1C2A23', // Dark Forest
          'base-300': '#2A3C32', // Forest Border
          'base-content': '#F3F1EC', // Light Sand Text
          'info': '#64B5F6',
          'success': '#52B788',
          'success-content': '#141E19',
          'warning': '#E9C46A',
          'warning-content': '#141E19',
          'error': '#E07A5F',
          'error-content': '#141E19',
          '--rounded-box': '1rem',
          '--rounded-btn': '0.75rem',
          '--rounded-badge': '1.9rem',
        },
      },
    ],
  },
};
