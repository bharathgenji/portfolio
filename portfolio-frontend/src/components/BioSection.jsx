import React from 'react';
import { Box, Flex, Heading, Text, Button, Image } from '@chakra-ui/react';
import Header from './Header'; 
import Footer from './Footer'; 

const BioSection = () => {
  return (
    <>
      <Header />
      <Box bg="#1A1A1A" color="#f0e7db" py="5rem" px="2rem" textAlign="center">
        <Flex
          alignItems="center"
          justifyContent="space-between"
          maxWidth="1200px"
          mx="auto"
          direction={['column', 'column', 'row']}
          gap="2rem"
        >
          {/* Left Section */}
          <Box flex="1" textAlign={['center', 'center', 'left']} pr={['0', '0', '4rem']}>
            <Heading as="h1" fontSize={['2.5rem', '3rem', '4rem']} fontWeight="bold" color="#FFD700">
              NICE TO MEET YOU! I’M BHARATH 👋
            </Heading>
            <Text fontSize={['1rem', '1.2rem', '1.5rem']} mt="1.5rem" lineHeight="1.8" color="#e0e0e0">
              I’m a Data Scientist and Cloud Engineer at XYZ Company, passionate about leveraging data to drive meaningful insights and create innovative solutions.
            </Text>
            <Text fontSize={['0.9rem', '1rem', '1.2rem']} mt="1rem" color="#c0c0c0">
              7+ years of experience in software development and data science.
            </Text>
            <Button
              mt="2rem"
              colorScheme="yellow"
              bg="#FFD700"
              color="black"
              _hover={{ bg: '#FFC107' }}
              borderRadius="full"
              px="2rem"
              boxShadow="lg"
              onClick={() => window.open('/resume/Bharath_Genji_Resume.pdf')}
            >
              Download Resume
            </Button>
          </Box>

{/* Right Section - Enlarged Image */}
<Box flex="1" textAlign="center">
          <Image
            src="/images/bharath.jpg"
            alt="Bharath Genji"
            boxSize="350px" // Adjusted size to 350px for better balance
            borderRadius="full"
            border="5px solid" // Adjusted border width for better visual balance
            borderColor="white.400" // Keeping the border color consistent
            mx="auto"
          />
          <Text mt="1rem" fontSize="1.2rem">
            Data Scientist and Cloud Engineer at XYZ Company
          </Text>
        </Box>
      </Flex>
    </Box>
      <Footer />
    </>
  );
};

export default BioSection;