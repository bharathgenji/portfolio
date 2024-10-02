import React from 'react';
import { Box, Flex, Text, VStack, Link, Button, useMediaQuery } from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { FaGithub } from 'react-icons/fa';
import Header from './Header'; // Import your Header component
import Footer from './Footer'; // Import your Footer component

const MotionBox = motion(Box);

const SetUpCallWithMe = () => {
  const [isLargerThan768] = useMediaQuery("(min-width: 768px)");

  return (
    <Box bg="#1A1A1A" color="#f0e7db" minHeight="100vh">
      {/* Header */}
      <Header />

      <Flex
        width="100%"
        maxWidth="1200px"
        direction={['column', 'column', 'row']}
        alignItems="center"
        mx="auto"
        px={[4, 8]}
        py={8}
      >
        {/* Left Section - Animated Text */}
        <VStack
          alignItems="flex-start"
          spacing={6}
          width={['100%', '100%', '50%']}
          pr={[0, 0, 8]}
        >
          <MotionBox
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7 }}
          >
            <Text
              fontSize={['3xl', '4xl', '5xl']}
              fontWeight="bold"
              color="#FFD700"
              _hover={{ color: '#FFC107', transition: 'color 0.3s ease' }}
            >
              Set up a Call with Me
            </Text>
          </MotionBox>

          {/* Additional Text Introduction */}
          <MotionBox
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <Text fontSize="lg" color="#e0e0e0">
              Whether you're looking to collaborate on a project or need expert advice on data science, AI, or cloud engineering, 
              I'm here to help. Book a call with me to discuss how we can work together to achieve your goals.
            </Text>
          </MotionBox>

          {/* Contact Information */}
          <MotionBox
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            <VStack alignItems="flex-start" spacing={4}>
              <Text fontSize="lg" color="#e0e0e0">Address</Text>
              <Text color="#c0c0c0">Washington DC</Text>

              <Text fontSize="lg" color="#e0e0e0">Email</Text>
              <Link
                href="mailto:bharath.genjimohanaranga@gwu.edu"
                color="#FFD700"
                _hover={{ textDecoration: 'underline', color: '#FFC107', transition: 'color 0.3s ease' }}
              >
                bharath.genjimohanaranga@gwu.edu
              </Link>

              <Text fontSize="lg" color="#e0e0e0">Phone</Text>
              <Text color="#c0c0c0">(571) 259 4792</Text>

              {/* Calendly Link with Hover Effect */}
              <Text fontSize="lg" color="#e0e0e0">Book a Session</Text>
              <Link
                href="https://calendly.com/bharath-genjimohanaranga-gwmail/30min"
                isExternal
                color="#FFD700"
                _hover={{ textDecoration: 'underline', color: '#FFC107', transition: 'color 0.3s ease' }}
                fontSize="lg"
              >
                Click here to set up a call
              </Link>
            </VStack>
          </MotionBox>
        </VStack>

        {/* Right Section - Interactive Image */}
        <MotionBox
          width={['100%', '100%', '50%']}
          mt={['8', '8', '0']}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          whileHover={{ scale: 1.05, transition: { duration: 0.4 } }}
        >
          <MotionBox
            borderRadius="md"
            bg="rgba(0, 0, 0, 0.6)"
            boxShadow="0px 8px 15px rgba(0, 0, 0, 0.5)"
            backgroundImage="url('/images/portfolio/setupcall.jpg')" // Replace with actual image path
            backgroundSize="cover"
            backgroundPosition="center"
            height="300px"
          />
        </MotionBox>
      </Flex>

      {/* Footer */}
      <Footer />
    </Box>
  );
};

export default SetUpCallWithMe;
