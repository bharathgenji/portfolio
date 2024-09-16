// src/components/About.jsx
import React from 'react';
import { Box, VStack, Text, Divider } from '@chakra-ui/react';
import ExperienceSection from './ExperienceSection';
import HonorsAwardsSection from './HonorsAwardsSection';
import PublicationsSection from './PublicationSection';


const About = () => {
  return (
    <Box py={8} px={4}>
      <Text fontSize="4xl" fontWeight="bold" mb={8} color="#f2c94c">About Me</Text>

      <Text fontSize="lg" color="#ffffff" mb={4}>
        I am a Data Scientist and Cloud Engineer based in Washington DC with expertise in developing and deploying data-driven solutions. 
        I specialize in cloud and data engineering, machine learning, and data analytics. 
        My experience spans from building AI/ML applications to modernizing data infrastructure and optimizing data workflows. 
        I am passionate about leveraging data to drive meaningful insights and create innovative solutions.
      </Text>

      <Divider my={8} />

      {/* Add Experience Section */}
      <ExperienceSection />

      <Divider my={8} />

      {/* Add Honors and Awards Section */}
      <HonorsAwardsSection />

      <Divider my={8} />

      {/* Add Publications Section */}
      <PublicationsSection />

    </Box>
  );
};

export default About;
