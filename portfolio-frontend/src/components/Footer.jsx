import React from 'react';
import { Box, Flex, Link, IconButton, Input, Button, Divider } from '@chakra-ui/react';
import { FaLinkedin, FaGithub, FaEnvelope, FaReddit, FaDiscord, FaPatreon, FaYoutube, FaInstagram } from 'react-icons/fa';

const Footer = () => {
  return (
    <Box bg="secondary" color="white" py={8}>
      {/* Navigation Links Centered */}
      <Flex justify="center" mb={4}>
        <Link href="/" mx={4} _hover={{ color: 'primary' }}>About</Link>
        <Link href="/blog" mx={4} _hover={{ color: 'primary' }}>Blog</Link>
        <Link href="/contact" mx={4} _hover={{ color: 'primary' }}>Contact</Link>
        <Link href="/mentoring" mx={4} _hover={{ color: 'primary' }}>Mentoring</Link>
        <Link href="/portfolio" mx={4} _hover={{ color: 'primary' }}>Portfolio</Link>
        <Link href="/speaking" mx={4} _hover={{ color: 'primary' }}>Speaking</Link>
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
            mx={1}
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
            mx={1}
          />
          <IconButton
            as={Link}
            href="mailto:bharath.genjimohanaranga@gmail.com"
            aria-label="Email"
            icon={<FaEnvelope />}
            colorScheme="whiteAlpha"
            variant="ghost"
            size="lg"
            mx={1}
          />
          <IconButton
            as={Link}
            href="https://reddit.com"
            isExternal
            aria-label="Reddit"
            icon={<FaReddit />}
            colorScheme="whiteAlpha"
            variant="ghost"
            size="lg"
            mx={1}
          />
          <IconButton
            as={Link}
            href="https://discord.com"
            isExternal
            aria-label="Discord"
            icon={<FaDiscord />}
            colorScheme="whiteAlpha"
            variant="ghost"
            size="lg"
            mx={1}
          />
          <IconButton
            as={Link}
            href="https://patreon.com"
            isExternal
            aria-label="Patreon"
            icon={<FaPatreon />}
            colorScheme="whiteAlpha"
            variant="ghost"
            size="lg"
            mx={1}
          />
          <IconButton
            as={Link}
            href="https://youtube.com"
            isExternal
            aria-label="YouTube"
            icon={<FaYoutube />}
            colorScheme="whiteAlpha"
            variant="ghost"
            size="lg"
            mx={1}
          />
          <IconButton
            as={Link}
            href="https://instagram.com"
            isExternal
            aria-label="Instagram"
            icon={<FaInstagram />}
            colorScheme="whiteAlpha"
            variant="ghost"
            size="lg"
            mx={1}
          />
        </Flex>

        {/* Newsletter Subscription Form */}
        <Flex as="form" align="center">
          <Input
            placeholder="Enter your email"
            size="md"
            variant="filled"
            bg="gray.100"
            color="black"
            _hover={{ bg: 'white' }}
            borderRadius="full"
            mr={2}
          />
          <Button bg="primary" color="black" _hover={{ bg: 'yellow.400' }} borderRadius="full">
            Subscribe
          </Button>
        </Flex>
      </Flex>
    </Box>
  );
};

export default Footer;
