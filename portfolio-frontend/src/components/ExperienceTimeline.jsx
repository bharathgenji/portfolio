import React, { useEffect, useState } from 'react';
import axios from 'axios';

const ExperienceTimeline = () => {
  const [experience, setExperience] = useState([]);

  useEffect(() => {
    axios.get('http://localhost:5000/api/experience')
      .then(response => setExperience(response.data))
      .catch(error => console.error('Error fetching experience:', error));
  }, []);

  return (
    <div className="p-8">
      <h2 className="text-3xl font-bold mb-4">Experience</h2>
      <ul className="space-y-4">
        {experience.map((exp, index) => (
          <li key={index} className="border-l-4 border-primary pl-4">
            <h3 className="text-xl font-semibold">{exp.role} at {exp.company}</h3>
            <span className="block text-sm">{exp.duration}</span>
            <p className="mt-2">{exp.description}</p>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ExperienceTimeline;
