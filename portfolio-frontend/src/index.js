import React from 'react';
import ReactDOM from 'react-dom';
import { ChakraProvider, extendTheme } from '@chakra-ui/react';
import App from './App';

// Extend the default Chakra theme for a minimalistic look
const theme = extendTheme({
  colors: {
    primary: '#F2C94C', // Updated custom yellow shade
    secondary: '#000000f0', // Black
    accent: '#FF0000',  // Red for accents
    gray: {
      100: '#f4f4f4',
      800: '#333333',
    },
  },
  fonts: {
    heading: 'Helvetica, Arial, sans-serif',
    body: 'Helvetica, Arial, sans-serif',
  },
});

ReactDOM.render(
  <React.StrictMode>
    <ChakraProvider theme={theme}>
      <App />
    </ChakraProvider>
  </React.StrictMode>,
  document.getElementById('root')
);
