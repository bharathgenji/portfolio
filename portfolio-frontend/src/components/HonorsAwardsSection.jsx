// src/components/HonorsAwardsSection.jsx
import React from 'react';
import { Box, Text, VStack, Flex } from '@chakra-ui/react';
import { motion } from 'framer-motion';

// Motion wrapper for Chakra UI components
const MotionFlex = motion(Flex);

const honorsAwards = [
  {
    title: "Global Leaders - Dean's Award",
    issuer: 'Columbian College of Arts and Sciences',
    date: 'Aug 2023',
    description: 'This award consists of a tuition fellowship totalling $17,000.',
  },
  {
    title: "1st Runner up Jury's choice",
    issuer: 'Infocepts',
    date: 'Apr 2023',
    description: 'Presented to the Employee 360 team for their outstanding booth and futuristic content.',
  },
];

const HonorsAwardsSection = () => (
  <Box>
    <Text fontSize="2xl" fontWeight="bold" color="#f2c94c" mb={4}>Honors & Awards</Text>
    <VStack align="start" spacing={4}>
      {honorsAwards.map((award, index) => (
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
            <Text fontSize="lg" fontWeight="bold" color="#f2c94c">{award.title}</Text>
            <Text color="#ffffff">{award.issuer} - {award.date}</Text>
            <Text color="#a0aec0">{award.description}</Text>
          </Box>
        </MotionFlex>
      ))}
    </VStack>
  </Box>
);

export default HonorsAwardsSection;
