import React from 'react';
import { Box, Flex, Text, Button, Link, Divider, IconButton } from '@chakra-ui/react';
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
          <Text fontSize="2xl" fontWeight="bold" color="primary" mr={6}>
            Bharath Genji
          </Text>
          <Divider orientation="vertical" height="30px" borderColor="gray.600" />
        </Flex>

        {/* Navigation Links */}
        <Flex align="center" gap={6} ml={6}>
          <Link href="/" _hover={{ color: 'primary' }}>About</Link>
          <Link href="/blog" _hover={{ color: 'primary' }}>Blog</Link>
          <Link href="/contact" _hover={{ color: 'primary' }}>Contact</Link>
          <Link href="/mentoring" _hover={{ color: 'primary' }}>Mentoring</Link>
          <Link href="/portfolio" _hover={{ color: 'primary' }}>Portfolio</Link>
          <Link href="/speaking" _hover={{ color: 'primary' }}>Speaking</Link>
        </Flex>

        {/* Action Buttons */}
        <Flex align="center" gap={4}>
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
          <Button
            variant="outline"
            color="primary"
            borderColor="primary"
            _hover={{ bg: 'primary', color: 'black' }}
            borderRadius="full"
            px={6}
            rightIcon={<Text as="span" ml={2}>→</Text>}
          >
            Mentoring
          </Button>

          {/* Search Icon Button */}
          <IconButton
            icon={<FaSearch />}
            aria-label="Search"
            color="white"
            variant="ghost"
            _hover={{ bg: 'gray.700' }}
            borderRadius="full"
            size="md"
          />
        </Flex>
      </Flex>
    </Box>
  );
};

export default Header;
