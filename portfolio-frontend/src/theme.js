import { extendTheme } from '@chakra-ui/react';

const theme = extendTheme({
  colors: {
    primary: '#FFD700', // Bright Yellow
    secondary: '#1A1A1A', // Dark Grey/Black
    accent: '#F0EDE2', // Light Beige
    white: '#FFFFFF', // White for text/icons on dark backgrounds
  },
  fonts: {
    heading: `'Poppins', sans-serif`, // Bold sans-serif for headings
    body: `'Open Sans', sans-serif`,  // Clean sans-serif for body text
  },
});

export default theme;
