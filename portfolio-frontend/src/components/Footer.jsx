import React from 'react';
import { Box, Flex, Link, IconButton, Divider } from '@chakra-ui/react';
import { FaLinkedin, FaGithub, FaEnvelope } from 'react-icons/fa';

const Footer = () => {
  return (
    <Box bg="secondary" color="white" py={8}>
      {/* Centered Navigation Links */}
      <Flex justify="center" mb={4} fontSize="lg" fontWeight="medium">
        <Link href="/about" mx={4} _hover={{ color: 'primary' }}>About</Link>
        <Link href="/blog" mx={4} _hover={{ color: 'primary' }}>Blog</Link>
        <Link href="/contact" mx={4} _hover={{ color: 'primary' }}>Contact</Link>
        <Link href="/portfolio" mx={4} _hover={{ color: 'primary' }}>Portfolio</Link>
      </Flex>

      {/* Horizontal Divider */}
      <Divider borderColor="gray.600" mb={4} />

      {/* Social Media Icons and Newsletter */}
      <Flex maxW="1200px" mx="auto" align="center" justify="space-between">
        {/* Social Media Icons */}
        <Flex>
          <IconButton
            as={Link}
            href="https://www.linkedin.com/in/bharath-gm/"
            isExternal
            aria-label="LinkedIn"
            icon={<FaLinkedin />}
            colorScheme="whiteAlpha"
            variant="ghost"
            size="lg"
            mx={2}
          />
          <IconButton
            as={Link}
            href="https://github.com/Bharath-GM"
            isExternal
            aria-label="GitHub"
            icon={<FaGithub />}
            colorScheme="whiteAlpha"
            variant="ghost"
            size="lg"
            mx={2}
          />
          <IconButton
            as={Link}
            href="mailto:bharath.genjimohanaranga@gmail.com"
            aria-label="Email"
            icon={<FaEnvelope />}
            colorScheme="whiteAlpha"
            variant="ghost"
            size="lg"
            mx={2}
          />
        </Flex>
      </Flex>
    </Box>
  );
};

export default Footer;
