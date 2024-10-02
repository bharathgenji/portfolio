import React, { useState } from 'react';
import { Box, Text, Button, Link, Image } from '@chakra-ui/react';
import Header from './Header';
import Footer from './Footer';

const Blog = () => {
  const [showSneakPeek, setShowSneakPeek] = useState(false); // State to toggle image

  const handleButtonClick = () => {
    setShowSneakPeek(true); // Show the sneak peek image when the button is clicked
  };

  return (
    <>
      <Header />
      <Box
        textAlign="center"
        py={12}
        bg="#1A1A1A"
        minHeight="100vh"
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
      >
        <Text fontSize="4xl" fontWeight="bold" color="#FFD700">
          Blog Coming Soon!
        </Text>
        <Text mt={4} fontSize="xl" color="#e0e0e0">
          I'm currently working on some amazing blog content for you. Please stay tuned!
        </Text>

        <Button
          mt={8}
          colorScheme="yellow"
          size="lg"
          px={8}
          py={6}
          onClick={handleButtonClick} // Call the function to show the image
        >
          Check Out What's Coming!
        </Button>

        {/* Conditionally render the sneak peek image */}
        {showSneakPeek && (
          <Box mt={8}>
            <Text fontSize="2xl" color="#e0e0e0" mb={4}>
              Sneak Peek of What's Coming:
            </Text>
            <Image
              src="/images/portfolio/journalai.webp" 
              alt="Sneak Peek"
              maxW="600px"
              borderRadius="md"
              boxShadow="0px 8px 15px rgba(0, 0, 0, 0.5)"
            />
          </Box>
        )}
      </Box>
      <Footer />
    </>
  );
};

export default Blog;
