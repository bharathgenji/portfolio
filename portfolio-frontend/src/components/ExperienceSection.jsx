import React from 'react';
import { Box, Flex, Text, VStack, Divider,Icon } from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { FaBriefcase, FaGraduationCap, FaTrophy, FaBook } from 'react-icons/fa'; // Import icons

// Convert Chakra components to motion-enabled components


const educationDetails = [
  {
    date: 'Aug 2023 - Present',
    degree: "Master's Degree, Data Science",
    institution: 'The George Washington University',
    location: 'Washington, DC, USA',
    details: 'Pursuing a Master’s degree in Data Science with a focus on advanced analytics, machine learning, and data-driven decision-making.',
    icon: '/path/to/george-washington-university-logo.png', // Replace with the actual path to your image
  },
  {
    date: '2017 - 2021',
    degree: 'Bachelor of Technology (BTech), Computer Science',
    institution: 'SRM Institute of Science and Technology (SRM IST)',
    location: 'Chennai, Tamil Nadu, India',
    details: 'Completed a Bachelor of Technology in Computer Science, focusing on software development, data structures, algorithms, and artificial intelligence.',
    icon: '/path/to/srm-ist-logo.png', // Replace with the actual path to your image
  },
];


const professionalExperiences = [
  {
    date: 'June 2024 - August 2024',
    position: 'CTPO Intern',
    company: 'Infotrend',
    location: 'Washington, DC',
    type: 'Professional',
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
    description: [
      'Led modernization of the Order Management System on AWS, reducing manual efforts by 75%.',
      'Developed an Automated Quality Analyzer on Spark, improving data quality assessment processes by 30%.',
      'Implemented automated ETL workflows, resulting in a 50% decrease in manual efforts during the migration from Teradata to Snowflake.'
    ],
  },
  {
    date: 'Mar 2021 - Aug 2021',
    position: 'Big Data Engineer Intern',
    company: 'Internship',
    location: 'India',
    type: 'Professional',
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
    description: [
      'Managed the front desk, coordinated departmental communications, and assisted in event organization.',
      'Developed key skills in administrative support, customer service, and effective communication, while contributing to the smooth functioning of the department.'
    ],
  }
];


const MotionFlex = motion(Flex);

// Define ExperienceCard component for timeline
const ExperienceCard = ({ experience, isLeft }) => (
  <MotionFlex
    align="center"
    p={6}
    bg="#1a1a1a"
    borderRadius="md"
    shadow="md"
    mb={4}
    position="relative"
    w={['100%', '45%']}
    left={isLeft ? '0%' : '55%'}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, ease: 'easeOut' }}
    whileHover={{ scale: 1.05 }}
  >
    <Box mr={4}>
      <Icon as={experience.type === 'Professional' ? FaBriefcase : FaGraduationCap} color="#f2c94c" size="24px" />
    </Box>
    <Box>
      <Text fontSize="lg" fontWeight="bold" color="#f2c94c">
        {experience.position}
      </Text>
      <Text color="#ffffff">{experience.company}</Text>
      <Text color="#a0aec0">{experience.location} | {experience.date}</Text>
      {experience.description.map((desc, index) => (
        <Text key={index} mt={2} color="#a0aec0">{desc}</Text>
      ))}
    </Box>
  </MotionFlex>
);

const ExperienceSection = () => {
  const allExperiences = [...professionalExperiences, ...academicExperiences]; // Combine all experiences

  return (
    <Box py={16} position="relative">
      <Text fontSize="3xl" fontWeight="bold" color="#f2c94c" mb={8}>
        Experience Timeline
      </Text>

      {/* Vertical timeline line */}
      <Box position="absolute" left="50%" top="0" bottom="0" w="2px" bg="#f2c94c" />

      <VStack align="center" spacing={8} position="relative">
        {allExperiences.map((experience, index) => (
          <ExperienceCard
            key={index}
            experience={experience}
            isLeft={index % 2 === 0} // Alternate left and right
          />
        ))}
      </VStack>
    </Box>
  );
};

export default ExperienceSection;