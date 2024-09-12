module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: '#FFD700', // Bold Yellow
        secondary: '#000000', // Black
        accent: '#FF0000', // Red for accents
        white: '#FFFFFF',
        gray: {
          light: '#f4f4f4',
          dark: '#333333',
        },
      },
      fontFamily: {
        sans: ['Helvetica', 'Arial', 'sans-serif'],
        display: ['Helvetica', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
