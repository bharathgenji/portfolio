import React from 'react';
import { Box, SimpleGrid, Text, Link } from '@chakra-ui/react';

const CallToActionCards = () => {
  return (
    <SimpleGrid
      columns={[1, 2, 3]}
      spacing={8}
      py={12}
      px={4}
      bg="secondary"
      color="white"
    >
      <Link href="/speaking" _hover={{ textDecoration: 'none' }}>
        <Box
          bg="gray.800"
          p={6}
          borderRadius="md"
          shadow="lg"
          _hover={{ shadow: 'xl', transform: 'translateY(-5px)', transition: 'all 0.3s' }}
        >
          <Text fontSize="xl" fontWeight="bold" color="blue.300">
            Speaking 🎤
          </Text>
          <Text mt={2}>Invite me to speak</Text>
          <Text mt={1}>
            I love sharing my journey and enjoy speaking on both personal and
            technical topics.
          </Text>
        </Box>
      </Link>
      <Link href="/mentoring" _hover={{ textDecoration: 'none' }}>
        <Box
          bg="gray.800"
          p={6}
          borderRadius="md"
          shadow="lg"
          _hover={{ shadow: 'xl', transform: 'translateY(-5px)', transition: 'all 0.3s' }}
        >
          <Text fontSize="xl" fontWeight="bold" color="red.300">
            Mentoring Call 📅
          </Text>
          <Text mt={2}>Book a mentoring call</Text>
          <Text mt={1}>
            I provide 1:1 mentoring calls for current and aspiring software
            engineers.
          </Text>
        </Box>
      </Link>
      <Link href="/subscribe" _hover={{ textDecoration: 'none' }}>
        <Box
          bg="gray.800"
          p={6}
          borderRadius="md"
          shadow="lg"
          _hover={{ shadow: 'xl', transform: 'translateY(-5px)', transition: 'all 0.3s' }}
        >
          <Text fontSize="xl" fontWeight="bold" color="purple.300">
            Newsletter 📧
          </Text>
          <Text mt={2}>Subscribe to my newsletter</Text>
          <Text mt={1}>
            In my newsletter, I share career learnings, advice, collaboration
            opportunities, and more.
          </Text>
        </Box>
      </Link>
    </SimpleGrid>
  );
};

export default CallToActionCards;
