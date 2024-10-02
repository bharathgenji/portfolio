import React from 'react';
import { Box, Flex, Image, Text, VStack, HStack, Divider, UnorderedList, ListItem } from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { FaMapMarkerAlt, FaCalendarAlt } from 'react-icons/fa';


const professionalExperiences = [
  {
    date: 'June 2024 - August 2024',
    position: 'AI/ML Engineer Intern',
    company: 'Infotrend',
    location: 'Washington, DC',
    type: 'Professional',
    logo: '/images/infotrend_inc_logo.jpeg',
    description: [
      'Developed and tested machine learning applications using CTPO Docker environment, enhancing prototyping speed and efficiency.',
      'Authored comprehensive tutorials and documentation to facilitate community understanding and adoption of new technologies.',
      'Collaborated with cross-functional teams to ensure seamless integration of AI technologies into user-centric applications.'
    ],
  },
  {
    date: 'April 2023 - July 2023',
    position: 'Executive Cloud and Data Engineer',
    company: 'InfoCepts',
    location: 'Chennai, India',
    type: 'Professional',
    logo: '/images/Infocepts-Data-AI.png',
    description: [
      'Orchestrated the integration of Flask-Restx API with Azure SQL Server and AI analytics, boosting productivity by 50%.',
      'Standardized version control processes using Bitbucket, reducing code conflicts by 20%.',
      'Led project management with Agile to increase project efficiency by 15%.',
    ],
  },
  {
    date: 'Sep 2021 - April 2023',
    position: 'Associate Cloud and Data Engineer',
    company: 'InfoCepts',
    location: 'Chennai, India',
    type: 'Professional',
    logo: '/images/Infocepts-Data-AI.png',
    description: [
      'Led modernization of the Order Management System on AWS, reducing manual efforts by 75%.',
      'Developed an Automated Quality Analyzer on Spark, improving data quality assessment processes by 30%.',
      'Implemented automated ETL workflows, resulting in a 50% decrease in manual efforts during the migration from Teradata to Snowflake.'
    ],
  },
  {
    date: 'Mar 2021 - Aug 2021',
    position: 'Big Data Engineer Intern',
    company: 'InfoCepts',
    location: 'India',
    type: 'Professional',
    logo: '/images/Infocepts-Data-AI.png',
    description: [
      'Worked with HBase, Hive, Kafka, YARN, HDFS, MapReduce, Python, Spark, Microsoft SQL Server, and Unix.',
      'Created an ETL tool to convert semi-structured data to structured data in Spark, load it into respective databases.'
    ],
  },
  {
    date: 'Jul 2020 - Aug 2020',
    position: 'Data Analyst',
    company: 'DoWell Research',
    location: 'Chennai, Tamil Nadu, India',
    type: 'Professional',
    logo: '/images/dowell.jpeg',
    description: [
      'Conducted data analysis and research, contributing to the project’s overall findings and recommendations.'
    ],
  },
  {
    date: 'Dec 2019 - Dec 2019',
    position: 'Data Analyst',
    company: 'Takenmind Organization',
    location: 'Chennai, Tamil Nadu, India',
    type: 'Professional',
    logo:'images/takenminds.jpeg',
    description: [
      'Analyzed large datasets and created detailed reports to assist in decision-making processes.'
    ],
  },
  {
    date: 'Jun 2019 - Jun 2019',
    position: 'Android Developer',
    company: 'ChuChu TV Studios',
    location: 'Chennai, Tamil Nadu, India',
    type: 'Professional',
    logo:'images/chuchutv.jpeg',
    description: [
      'Developed and optimized Android applications to enhance user engagement and satisfaction.'
    ],
  }
];

const academicExperiences = [
  {
    date: 'Aug 2024 - Present',
    position: 'Student Technical Support Specialist',
    company: 'The George Washington University',
    location: 'Washington DC-Baltimore Area, On-site',
    type: 'Academic',
    logo: '/images/gwu.png',
    description: [
      'Providing technical support to Data Science students, assisting with software installation, troubleshooting, and ensuring seamless access to required tools and resources.',
      'Delivering coding assistance to students within the program, helping them overcome programming challenges while coordinating closely with faculty and Graduate Assistants.',
      'Managing and updating the technical knowledge base, enhancing resource availability and empowering students with self-service solutions.',
      'Maintaining and improving the program’s website and ticketing system, ensuring it meets the evolving needs of the student body and facilitates efficient issue resolution.',
      'Collaborating with Faculty Supervisors and program leadership to address technical issues and support the academic success of students in the Data Science program.'
    ],
  },
  {
    date: 'Jan 2024 - May 2024',
    position: 'Graduate Teaching Assistant',
    company: 'The George Washington University',
    location: 'Washington, District of Columbia, United States, On-site',
    type: 'Academic',
    logo:'/images/gwu.png',
    description: [
      'Assisted in preparing and organizing lecture materials.',
      'Conducted laboratory experiments and ensured a safe, educational environment.',
      'Provided academic support to students through office hours and one-on-one mentoring.',
      'Assisted in grading and offering constructive feedback on assignments and exams.',
      'Facilitated group discussions and collaborative learning activities.',
      'Handled administrative tasks such as maintaining student records and coordinating resources.'
    ],
  },
  {
    date: 'Dec 2023 - Dec 2023',
    position: 'Student Assistant',
    company: 'The George Washington University',
    location: 'Washington, District of Columbia, United States, On-site',
    type: 'Academic',
    logo:'/images/gwu.png',
    description: [
      'Managed the front desk, coordinated departmental communications, and assisted in event organization.',
      'Developed key skills in administrative support, customer service, and effective communication, while contributing to the smooth functioning of the department.'
    ],
  }
];


// Motion settings for scroll animations
const MotionBox = motion(Box);

const ExperienceCard = ({ experience }) => (
  <MotionBox
    initial={{ opacity: 0, y: 50 }}
    whileInView={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.6 }}
    mb={12}
    p={6}
    bg="rgba(255, 255, 255, 0.05)"
    borderRadius="md"
    shadow="lg"
    _hover={{
      transform: 'scale(1.02)',
      boxShadow: '0px 10px 30px rgba(0,0,0,0.2)',
    }}
    width={['100%', '100%', '90%']}
    maxW="900px"
    minH="300px" // Consistent card height
    display="flex"
    flexDirection="column"
    justifyContent="space-between"
  >
    <Flex align="center" justify="space-between" mb={4}>
      {/* Company Logo */}
      <Image
        src={experience.logo}
        alt={`${experience.company} logo`}
        boxSize="80px"
        borderRadius="full"
        mr={6}
      />

      {/* Experience Details */}
      <VStack align="start" spacing={2} maxW="70%">
        <Text fontSize="2xl" fontWeight="bold" color="yellow.400">
          {experience.position}
        </Text>
        <Text fontSize="lg" color="white">
          {experience.company}
        </Text>

        {/* Location and Date */}
        <HStack spacing={4}>
          <HStack spacing={1}>
            <FaMapMarkerAlt color="#f2c94c" />
            <Text color="gray.300">{experience.location}</Text>
          </HStack>
          <HStack spacing={1}>
            <FaCalendarAlt color="#f2c94c" />
            <Text color="gray.300">{experience.date}</Text>
          </HStack>
        </HStack>
      </VStack>
    </Flex>

    {/* Divider to separate the header from the description */}
    <Divider borderColor="gray.600" my={4} />

    {/* Description List with Bullet Points */}
    <UnorderedList spacing={3} color="gray.200" textAlign="justify" pl={6}>
      {experience.description.map((desc, index) => (
        <ListItem key={index}>{desc}</ListItem>
      ))}
    </UnorderedList>
  </MotionBox>
);

const ExperienceSection = () => (
  <Box py={16} px={[4, 8]} bg="#1A1A1A" color="#FFFFFF">
    <Text fontSize="4xl" fontWeight="bold" color="yellow.400" textAlign="center" mb={12}>
      Professional Experience
    </Text>

    {/* Experience Cards */}
    <VStack spacing={8}>
      {professionalExperiences.map((experience, index) => (
        <ExperienceCard key={index} experience={experience} />
      ))}
    </VStack>
  </Box>
);

export default ExperienceSection;