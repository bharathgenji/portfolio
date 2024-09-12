import React, { useEffect, useState } from 'react';
import { Box, Flex, Text, Button, Image, Link } from '@chakra-ui/react';
import axios from 'axios';

const BioSection = () => {
  const [bio, setBio] = useState({});

  useEffect(() => {
    axios
      .get('http://localhost:5000/api/bio')
      .then((response) => setBio(response.data))
      .catch((error) => console.error('Error fetching bio:', error));
  }, []);

  return (
    <Flex
      direction={['column', 'row']}
      align="center"
      justify="space-between"
      bg="secondary"
      color="white"
      p={12}
    >
      {/* Profile Image Section */}
      <Box textAlign="center" mt={[8, 0]} mr={[0, 8]}>
        <Image
          src="/images/bharath.jpg" // Correct path for the image file in the public folder
          alt="Bharath Genji"
          boxSize={['150px', '200px']} // Responsive size for smaller and larger screens
          borderRadius="full"
          objectFit="cover"
          borderWidth="4px"
          borderColor="#F2C94C" // Custom yellow shade
          shadow="lg"
        />
        <Text fontSize="lg" fontWeight="bold" color="#F2C94C" mt={4}>
          Data Scientist and Cloud Engineer at XYZ Company
        </Text>
      </Box>

      {/* Bio Text Section */}
      <Box maxW="lg" textAlign={['center', 'left']}>
        <Text fontSize="5xl" fontWeight="extrabold" color="#F2C94C" mb={4}>
          {bio.name}
        </Text>
        <Text fontSize="lg" mb={4}>
          {bio.intro}
        </Text>
        <Text fontSize="md" mb={4}>
          {bio.professional_summary}
        </Text>
        <Button
          as={Link}
          href="/resume/Bharath Genji Resume.pdf" // Correct path for the resume file in the public folder
          download="Bharath_Genji_Resume.pdf"
          mt={4}
          bg="#F2C94C"
          color="black"
          _hover={{ bg: 'yellow.400' }}
          shadow="lg"
        >
          Download Resume
        </Button>
      </Box>
    </Flex>
  );
};

export default BioSection;
