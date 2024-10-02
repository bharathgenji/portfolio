// src/components/ScrollingLogoScroller.jsx
import React from 'react';
import { Box, Flex, Image, keyframes } from '@chakra-ui/react';
import { motion } from 'framer-motion';

const companyLogos = [
    '/images/infotrend_inc_logo.jpeg',
    '/images/Infocepts-Data-AI.png',
    '/images/gwu.png',
    '/images/dowell.jpeg',
    'images/chuchutv.jpeg',
    'images/takenminds.jpeg'
  ];


  // Define the scrolling animation for infinite loop
const animationSettings = {
  animate: { x: [0, -2000] }, // Adjust this value based on the total width of the logos
  transition: { repeat: Infinity, duration: 25, ease: 'linear' }, // Continuous loop with smooth scrolling
};

const CompanyLogoScroller = () => {
  return (
    <Box overflow="hidden" bg="#1A1A1A" py={6}>
      <motion.div {...animationSettings}>
        <Flex justify="space-around" align="center" minW="200%" gap={10}>
          {companyLogos.map((logo, index) => (
            <Image
              key={index}
              src={logo}
              alt="Company Logo"
              boxSize="100px"
              borderRadius="full" // Makes the images rounded
              mx={4}
              border="2px solid white" // Optional border for better visibility
            />
          ))}
        </Flex>
      </motion.div>
    </Box>
  );
};

export default CompanyLogoScroller;