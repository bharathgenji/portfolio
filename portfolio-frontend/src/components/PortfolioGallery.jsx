import React, { useRef, useEffect, useState } from 'react';
import { Box, Flex, Text, Image, VStack, Button, Link } from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { FaGithub } from 'react-icons/fa';
import Header from './Header'; // Import Header component
import Footer from './Footer'; // Import Footer component

// Project data with custom background images and relevant details
const projects = [
  {
    title: 'US Apartment Market Insights',
    description:
      'A comprehensive analysis of US apartment market data, leveraging machine learning and data visualization techniques to derive insights and trends for rental pricing and apartment attributes.',
    technologies: ['R', 'Machine Learning', 'Data Visualization'],
    githubLink: 'https://github.com/bharathgenji/US-Apartment-Market-Insights',
    backgroundImage: '/images/portfolio/houseprediction.webp',
  },
  {
    title: 'Performance Evaluation of SQL and NoSQL Databases',
    description:
      'A performance evaluation study comparing scalability and query performance between SQL and NoSQL databases, using PostgreSQL for SQL and MongoDB for NoSQL databases.',
    technologies: ['SQL', 'NoSQL', 'MongoDB', 'PostgreSQL', 'Python'],
    githubLink:
      'https://github.com/bharathgenji/Performance-Evaluation-of-Scalability-in-SQL-and-NoSQL-Data-Warehousing-Across-Two-Diverse-Databases',
    backgroundImage: '/images/portfolio/nosql.webp',
  },
  {
    title: 'AWS YouTube Analytics Pipeline',
    description:
      'An end-to-end analytics pipeline for YouTube data, leveraging various AWS services for data ingestion, processing, transformation, cataloging, and visualization.',
    technologies: ['AWS S3', 'AWS Lambda', 'AWS Glue', 'AWS Athena', 'AWS QuickSight', 'CloudWatch', 'IAM'],
    githubLink: 'https://github.com/bharathgenji/AWS-Youtube-Analytics-Pipeline',
    backgroundImage: '/images/portfolio/youtube.webp',
  },
  {
    title: 'binfin8App',
    description:
      'A mobile-first asset management platform leveraging blockchain technology, built with Flutter and Firebase, allowing users to manage and tokenize assets with integrated chatbot support.',
    technologies: ['Flutter', 'Firebase', 'Blockchain', 'Avalanche Fuji Testnet', 'Truffle'],
    githubLink: 'https://github.com/bharathgenji/binfin8App?tab=readme-ov-file',
    backgroundImage: '/images/portfolio/binfin.webp',
  },
  {
    title: 'Course Recommendation Engine',
    description:
      'A hybrid recommendation system that combines content-based and collaborative filtering methods to provide personalized course recommendations.',
    technologies: ['Python', 'Scikit-Learn', 'Pandas', 'Lasso', 'K-Nearest Neighbors (KNN)', 'Hybrid Filtering'],
    githubLink: 'https://github.com/Bharath-GM/Course-Recommendation-Engine',
    backgroundImage: '/images/portfolio/courserecommendation.webp',
  },
  {
    title: 'Prediction of Heart Attack Risk',
    description:
      'Predicting heart attack risk using global population data and various machine learning models with feature engineering and cross-validation.',
    technologies: ['Python', 'Scikit-learn', 'Pandas', 'Machine Learning'],
    githubLink: 'https://github.com/Bharath-GM/Prediction-of-Heart-Attack-Risk-in-Global-Populations',
    backgroundImage: '/images/portfolio/heartattackrisk.webp',
  },
  {
    title: 'Card Status Tracking Service',
    description:
      "A backend service designed to provide internal API endpoints for querying users' card status based on data aggregated from multiple partner companies.",
    technologies: ['Flask-RESTx', 'Snowflake', 'Gunicorn', 'Docker', 'Pandas', 'SQLAlchemy'],
    githubLink: 'https://github.com/Bharath-GM/BackendDev',
    backgroundImage: '/images/portfolio/cardstatus.jpg',
  },
];

const PortfolioGallery = () => {
  const [currentProject, setCurrentProject] = useState(0); // Track the current visible project
  const projectRefs = useRef([]); // Array of refs for each project section

  // Intersection Observer to detect scrolling into view
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setCurrentProject(Number(entry.target.dataset.index)); // Set the current project based on the index
          }
        });
      },
      { threshold: 0.5 } // Trigger when 50% of the element is in view
    );

    projectRefs.current.forEach((ref) => ref && observer.observe(ref));

    return () => {
      if (projectRefs.current) {
        projectRefs.current.forEach((ref) => ref && observer.unobserve(ref));
      }
    };
  }, []);

  return (
    <>
      <Header /> {/* Include Header at the top */}
      <Box width="100%" height="100vh" overflowY="scroll">
        {/* Full-screen scroll sections */}
        {projects.map((project, index) => (
          <motion.div
            key={index}
            ref={(el) => (projectRefs.current[index] = el)} // Assign ref to each section
            data-index={index} // Custom data attribute for tracking
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{
              opacity: currentProject === index ? 1 : 0.5,
              scale: currentProject === index ? 1 : 0.9,
            }}
            transition={{ duration: 0.6 }}
            style={{
              height: '100vh',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              position: 'relative',
              backgroundImage: `url(${project.backgroundImage})`, // Set background image
              backgroundSize: 'cover', // Cover the entire screen
              backgroundPosition: 'center', // Center the background
            }}
          >
            {/* Overlay to make the text readable */}
            <Box
              position="absolute"
              top={0}
              left={0}
              right={0}
              bottom={0}
              bg="rgba(0, 0, 0, 0.6)" // Semi-transparent overlay
              zIndex={1} // Ensure it sits below the content but above the background
            />
            {/* Project content */}
            <Flex direction="column" align="center" textAlign="center" zIndex={2}>
              {/* Project Details */}
              <VStack spacing={4}>
                <Text fontSize="3xl" fontWeight="bold" color="#FFD700">
                  {project.title}
                </Text>
                <Text fontSize="lg" color="#e0e0e0" maxWidth="700px">
                  {project.description}
                </Text>
                <VStack spacing={2}>
                  {project.technologies.map((tech, i) => (
                    <Box
                      key={i}
                      px={4}
                      py={1}
                      bg="#FFD700"
                      color="#1A1A1A"
                      fontSize="sm"
                      fontWeight="bold"
                      borderRadius="full"
                    >
                      {tech}
                    </Box>
                  ))}
                </VStack>
                <Link href={project.githubLink} isExternal>
                  <Button
                    leftIcon={<FaGithub />}
                    colorScheme="yellow"
                    variant="solid"
                    mt={4}
                  >
                    View on GitHub
                  </Button>
                </Link>
              </VStack>
            </Flex>
          </motion.div>
        ))}
      </Box>
      <Footer /> {/* Include Footer at the bottom */}
    </>
  );
};

export default PortfolioGallery;
