// src/components/About.jsx
import React, { useRef } from 'react';
import { Box, Text, Flex, Button, Image } from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { FaUserAlt } from 'react-icons/fa';
import Header from './Header';
import Footer from './Footer';
import ExperienceSection from './ExperienceSection';
import EducationSection from './EducationSection';
import PublicationSection from './PublicationSection';
import CompanyLogoScroller from './CompanyLogoScroller';

// Motion-enabled components
const MotionBox = motion(Box);

const About = () => {
  const experienceRef = useRef(null);
  const educationRef = useRef(null);
  const publicationsRef = useRef(null);

  const scrollToSection = (section) => {
    if (section.current) {
      section.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <>
      <Header />

      {/* Full-Screen Intro Section */}
      <MotionBox
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
        bg="#1A1A1A"
        color="#FFFFFF"
        height="100vh"
        display="flex"
        alignItems="center"
        justifyContent="center"
        textAlign="left"
        px={[4, 8]}
      >
        <Flex maxW="1200px" align="center" justify="space-between">
          {/* Profile Image */}
          <Image
            src="/images/bharath2.jpg"
            alt="Your Name"
            borderRadius="full"
            boxSize="300px"
            objectFit="cover"
            mr={[4, 8]}
            boxShadow="0px 8px 15px rgba(0, 0, 0, 0.5)"
          />
          <Box maxW="600px">
            <Flex alignItems="center" mb={4}>
              <FaUserAlt size={28} color="#f2c94c" style={{ marginRight: '10px' }} />
              <Text fontSize={['3xl', '4xl']} fontWeight="bold" color="#f2c94c">
                About Me
              </Text>
            </Flex>
            <Text fontSize={['md', 'lg']} color="#e0e0e0" mb={6}>
              I'm a Data Scientist and Cloud Engineer with a passion for solving complex problems and turning data into actionable insights.
            </Text>

            <Button
              colorScheme="yellow"
              variant="outline"
              _hover={{ bg: '#f2c94c', color: '#1A1A1A' }}
              onClick={() => scrollToSection(experienceRef)}
            >
              Learn More
            </Button>
          </Box>
        </Flex>

      </MotionBox>
      {/* Add the ScrollingLogoScroller here */}
      <CompanyLogoScroller />

      {/* Experience Timeline Section */}
      <Box ref={experienceRef} py={12} px={[4, 8]} bg="#1A1A1A" color="#FFFFFF">
        <ExperienceSection />
      </Box>

      {/* Education Section */}
      <Box ref={educationRef} py={12} px={[4, 8]} bg="#1A1A1A" color="#FFFFFF">
        <EducationSection />
      </Box>

      {/* Publications Section */}
      <Box ref={publicationsRef} py={12} px={[4, 8]} bg="#1A1A1A" color="#FFFFFF">
        <PublicationSection />
      </Box>

      <Footer />
    </>
  );
};

export default About;
