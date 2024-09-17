import React from 'react';
import { Box, VStack, Text, Divider, Flex, Icon, useDisclosure, Button } from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { FaBriefcase, FaGraduationCap, FaTrophy, FaBook } from 'react-icons/fa';
import ExperienceSection from './ExperienceSection'; // Import Experience Section
import HonorsAwardsSection from './HonorsAwardsSection'; // Import Honors and Awards Section
import PublicationSection from './PublicationSection'; // Import Publications Section


// Motion-enabled components
const MotionBox = motion(Box);


const About = () => {
  const { isOpen, onOpen, onClose } = useDisclosure();

  return (
    <Box py={12} px={[4, 8]} bg="#1A1A1A" color="#FFFFFF">
      {/* Introduction Section */}
      <MotionBox
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        mb={12}
        textAlign="center"
      >
        <Text fontSize={['3xl', '4xl']} fontWeight="bold" color="#f2c94c">About Me</Text>
        <Text fontSize={['md', 'lg']} mt={4} mb={8} color="#e0e0e0">
          I am a Data Scientist and Cloud Engineer based in Washington DC with expertise in developing and deploying data-driven solutions.
          I specialize in cloud and data engineering, machine learning, and data analytics. I am passionate about leveraging data to drive meaningful insights and create innovative solutions.
        </Text>
        <Button onClick={onOpen} colorScheme="yellow" variant="outline" _hover={{ bg: '#f2c94c', color: '#1A1A1A' }}>
          Learn More
        </Button>
      </MotionBox>

      {/* Experience Section */}
      <MotionBox
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        mb={12}
      >
        <Flex align="center" mb={4}>
          <Icon as={FaBriefcase} w={6} h={6} color="#f2c94c" mr={2} />
          <Text fontSize="2xl" fontWeight="bold" color="#f2c94c">Experience</Text>
        </Flex>
        <ExperienceSection />
      </MotionBox>

      <Divider my={8} borderColor="#333" />

      {/* Honors & Awards Section */}
      <MotionBox
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        mb={12}
      >
        <Flex align="center" mb={4}>
          <Icon as={FaTrophy} w={6} h={6} color="#f2c94c" mr={2} />
          <Text fontSize="2xl" fontWeight="bold" color="#f2c94c">Honors & Awards</Text>
        </Flex>
        <HonorsAwardsSection />
      </MotionBox>

      <Divider my={8} borderColor="#333" />

      {/* Publications Section */}
      <MotionBox
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        mb={12}
      >
        <Flex align="center" mb={4}>
          <Icon as={FaBook} w={6} h={6} color="#f2c94c" mr={2} />
          <Text fontSize="2xl" fontWeight="bold" color="#f2c94c">Publications</Text>
        </Flex>
        <PublicationSection />
      </MotionBox>
    </Box>
  );
};

export default About;
