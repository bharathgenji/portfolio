// src/components/EducationSection.jsx
import React from 'react';
import { Box, Text, VStack, Flex, Icon } from '@chakra-ui/react';
import { FaGraduationCap } from 'react-icons/fa';
import { motion } from 'framer-motion';

// Example data for education
const educationDetails = [
  {
    date: 'Aug 2023 - Present',
    degree: "Master's Degree, Data Science",
    institution: 'The George Washington University',
    location: 'Washington, DC, USA',
    details: 'Pursuing a Master’s degree in Data Science with a focus on advanced analytics, machine learning, and data-driven decision-making.',
    icon: '/images/gwu.png',
  },
  {
    date: '2017 - 2021',
    degree: 'Bachelor of Technology (BTech), Computer Science',
    institution: 'SRM Institute of Science and Technology (SRM IST)',
    location: 'Chennai, Tamil Nadu, India',
    details: 'Completed a Bachelor of Technology in Computer Science, focusing on software development, data structures, algorithms, and artificial intelligence.',
    icon: '/images/srmlogo.png',
  },
];

// Education Card component
const EducationCard = ({ education }) => (
  <Flex p={6} bg="#1a1a1a" borderRadius="md" shadow="md" mb={4}>
    <Icon as={FaGraduationCap} color="#f2c94c" boxSize={6} mr={4} />
    <Box>
      <Text fontSize="lg" fontWeight="bold" color="#f2c94c">
        {education.degree}
      </Text>
      <Text color="#ffffff">{education.institution}</Text>
      <Text color="#a0aec0">{education.location} | {education.date}</Text>
      <Text color="#a0aec0" mt={2}>{education.details}</Text>
    </Box>
  </Flex>
);

// Education Section
const EducationSection = () => {
  return (
    <Box py={12}>
      <Text fontSize="3xl" fontWeight="bold" color="#f2c94c" mb={8}>
        Education
      </Text>
      <VStack align="start" spacing={8}>
        {educationDetails.map((education, index) => (
          <EducationCard key={index} education={education} />
        ))}
      </VStack>
    </Box>
  );
};

export default EducationSection;
