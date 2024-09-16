// src/components/PublicationsSection.jsx
import React from 'react';
import { Box, Text, VStack, Flex } from '@chakra-ui/react';
import { motion } from 'framer-motion';

// Motion wrapper for Chakra UI components
const MotionFlex = motion(Flex);

const publications = [
  {
    title: 'Course Recommendation System in Social Learning Network (SLN) Using Hybrid Filtering',
    conference: '2021 5th International Conference on Electronics, Communication and Aerospace Technology (ICECA)',
    date: 'Dec 2, 2021',
    description: 'Developed a hybrid recommendation system integrating content-based and collaborative-based filtering strategies.',
    link: 'https://ieeexplore.ieee.org/document/9675992',
  },
];

const PublicationSection = () => (
  <Box>
    <Text fontSize="2xl" fontWeight="bold" color="#f2c94c" mb={4}>Publications</Text>
    <VStack align="start" spacing={4}>
      {publications.map((publication, index) => (
        <MotionFlex
          key={index}
          p={4}
          bg="#1a1a1a"
          borderRadius="md"
          shadow="md"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <Box>
            <Text fontSize="lg" fontWeight="bold" color="#f2c94c">
              <a href={publication.link} target="_blank" rel="noopener noreferrer">{publication.title}</a>
            </Text>
            <Text color="#ffffff">{publication.conference} - {publication.date}</Text>
            <Text color="#a0aec0">{publication.description}</Text>
          </Box>
        </MotionFlex>
      ))}
    </VStack>
  </Box>
);

export default PublicationSection;
