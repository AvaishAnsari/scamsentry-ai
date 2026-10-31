/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#1B2230',
          muted: '#556070',
        },
        surface: {
          DEFAULT: '#F5F6F8',
          card: '#FFFFFF',
        },
        line: {
          DEFAULT: '#E2E5EA',
        },
        brand: {
          DEFAULT: '#1F4FC4',
          hover: '#183FA0',
          tint: '#E8EEFB',
        },
        risk: {
          red: '#B42318',
          'red-tint': '#FDEDEB',
          amber: '#8F5300',
          'amber-tint': '#FFF3DD',
          green: '#17692F',
          'green-tint': '#E7F4EA',
        },
      },
      borderRadius: {
        btn: '6px',
        card: '10px',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

