import React, { useState } from 'react';
import { Box, Flex, Text, Button, Image, Link, Icon } from '@chakra-ui/react';
import { FaLinkedin } from 'react-icons/fa';
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

const recentPosts = [
  {
    id: 1,
    title: "Farewell to Infocepts",
    date: "July 28, 2023",
    content: "Reflecting on my time at Infocepts fills me with a blend of emotions - an eagerness for the uncharted path ahead, and a nostalgic fondness for the moments that have woven themselves into my story.",
    images: [
      "/images/infocepts1.jpeg", // Replace with actual image URLs
      "/images/infocepts2.jpeg",
      "/images/infocepts3.jpeg"
    ],
    link: "https://www.linkedin.com/posts/bharath-gm_my-linkedin-network-as-the-pages-of-my-activity-7101718262878507008-XZV-?utm_source=share&utm_medium=member_desktop"
  },
  {
    id: 2,
    title: "Exciting Internship Announcement!",
    date: "August 5, 2023",
    content: "I'm thrilled to announce that I have started an internship at Infotrend Inc., focusing on empowering AI developers by developing applications using CTPO (CUDA, TensorFlow, PyTorch, OpenCV).",
    images: ["/images/infoTrend.gif"], // Replace with actual image URL or placeholder
    link: "https://www.linkedin.com/posts/bharath-gm_ai-machinelearning-computervision-activity-7209584688854642688-0E0g?utm_source=share&utm_medium=member_desktop"
  },
  // Add more posts as needed...
];

const RecentPosts = () => {
    const settings = {
      dots: true,
      infinite: true,
      speed: 500,
      slidesToShow: 1,
      slidesToScroll: 1,
      arrows: true,
      swipeToSlide: true,
      draggable: true
    };
  
    return (
      <Box bg="#1A1A1A" color="#f0e7db" py="5rem" px="2rem">
        <Box textAlign="left" mb="3rem" ml="1rem">
          <Text fontSize="2.5rem" fontWeight="bold" color="#FFFFFF">Latest Posts</Text>
          <Link href="https://www.linkedin.com/in/bharath-gm/" isExternal color="#0073b1">
            Browse All Posts →
          </Link>
        </Box>
        <Flex
          justifyContent="flex-start"
          flexWrap="wrap"
          maxWidth="1200px"
          mx="auto"
          gap="2rem"
        >
          {recentPosts.map(post => (
            <Box
              key={post.id}
              bg="#2E2E2E"
              borderRadius="md"
              p="1.5rem"
              maxW="350px"
              textAlign="left"
              _hover={{ boxShadow: 'lg', transform: 'scale(1.05)' }}
              transition="all 0.3s ease"
            >
              {post.images.length > 1 ? (
                <Slider {...settings}>
                  {post.images.map((image, index) => (
                    <Image
                      key={index}
                      src={image}
                      alt={`${post.title} - Image ${index + 1}`}
                      borderRadius="md"
                      mb="1rem"
                      boxShadow="sm"
                      objectFit="cover"
                      maxH="200px"
                    />
                  ))}
                </Slider>
              ) : (
                <Image
                  src={post.images[0]}
                  alt={post.title}
                  borderRadius="md"
                  mb="1rem"
                  boxShadow="sm"
                  objectFit="cover"
                  maxH="200px"
                />
              )}
              <Text fontSize="1.3rem" fontWeight="bold" color="#FFFFFF" mb="0.5rem">{post.title}</Text>
              <Text fontSize="0.9rem" color="#e0e0e0" mb="1rem">{post.date}</Text>
              <Text fontSize="1rem" color="#c0c0c0" mb="1.5rem">{post.content}</Text>
              <Link href={post.link} isExternal>
                <Button
                  colorScheme="yellow"
                  bg="#0073b1"
                  color="white"
                  _hover={{ bg: '#005582' }}
                  borderRadius="full"
                  boxShadow="md"
                  leftIcon={<Icon as={FaLinkedin} />}
                >
                  Read More on LinkedIn
                </Button>
              </Link>
            </Box>
          ))}
        </Flex>
      </Box>
    );
  };
  
  export default RecentPosts;