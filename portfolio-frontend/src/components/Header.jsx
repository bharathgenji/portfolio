import React from 'react';
import { Box, Flex, Text, Button, Divider, IconButton, Link } from '@chakra-ui/react';
import { NavLink } from 'react-router-dom'; // Use NavLink for internal routing
import { FaSearch } from 'react-icons/fa';

const Header = () => {
  return (
    <Box as="header" bg="secondary" p={4}>
      <Flex
        maxW="1200px"
        mx="auto"
        align="center"
        justify="space-between"
        color="white"
      >
        {/* Logo and Title */}
        <Flex align="center">
          {/* Wrap the name in a NavLink to make it clickable */}
          <NavLink to="/">
            <Text fontSize="2xl" fontWeight="bold" color="primary" mr={6} _hover={{ color: 'yellow' }}>
              Bharath Genji
            </Text>
          </NavLink>
          <Divider orientation="vertical" height="30px" borderColor="gray.600" />
        </Flex>

        {/* Navigation Links */}
        <Flex align="center" gap={6} ml={6}>
          <NavLink to="/about" style={({ isActive }) => ({ color: isActive ? 'yellow' : 'white' })}>About</NavLink>
          <NavLink to="/blog" style={({ isActive }) => ({ color: isActive ? 'yellow' : 'white' })}>Blog</NavLink>
          <NavLink to="/contact" style={({ isActive }) => ({ color: isActive ? 'yellow' : 'white' })}>Contact</NavLink>
          <NavLink to="/portfolio" style={({ isActive }) => ({ color: isActive ? 'yellow' : 'white' })}>Portfolio</NavLink>
        </Flex>

        {/* Action Buttons */}
        <Flex align="center" gap={4}>
          {/* Use Link for external routing to Calendly */}
          <Link href="https://calendly.com/bharath-genjimohanaranga-gwmail/30min" isExternal>
            <Button
              bg="primary"
              color="black"
              _hover={{ bg: 'yellow.600' }}
              borderRadius="full"
              px={6}
              rightIcon={<Text as="span" ml={2}>→</Text>}
            >
              Hire Me to Speak
            </Button>
          </Link>

        </Flex>
      </Flex>
    </Box>
  );
};

export default Header;
