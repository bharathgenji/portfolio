import React from 'react';
import { Box, Flex, Heading, Text, Button, Image } from '@chakra-ui/react';
import Header from './Header'; 
import Footer from './Footer'; 
import RecentPosts from './RecentPosts';



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
              I’m a former Executive Cloud and Engineer at InfoCepts, passionate about leveraging data to drive meaningful insights and create innovative solutions.
            </Text>
            <Text fontSize={['0.9rem', '1rem', '1.2rem']} mt="1rem" color="#c0c0c0">
              2+ years of experience in software development and data science.
            </Text>
            {/* Download Resume Button */}
            <a href="/resume/Bharath Genji Resume (2).pdf" download>
              <Button
                mt="2rem"
                colorScheme="yellow"
                bg="#FFD700"
                color="black"
                _hover={{ bg: '#FFC107' }}
                borderRadius="full"
                px="2rem"
                boxShadow="lg"
              >
                Download Resume
              </Button>
            </a>
          </Box>

          {/* Right Section */}
          <Box flex="1" textAlign="center">
            <Image
              src="/images/bharath.jpg"
              alt="Bharath Genji"
              width={['200px', '250px', '300px']}
              height="auto"
              borderRadius="full"
              border="3px solid"
              borderColor="#FFFFFF"
              mx="auto"
            />
            <Text mt="1rem" fontSize="1.2rem">
              Data Science Grad Student at George Washington University
            </Text>
          </Box>
        </Flex>
      </Box>
      
      {/* Include Recent Posts Section */}
      <RecentPosts />
      
      <Footer />
    </>
  );
};

export default BioSection;
