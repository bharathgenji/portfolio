import React, { useEffect, useState } from 'react';
import axios from 'axios';

const PortfolioGallery = () => {
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    axios.get('http://localhost:5000/api/portfolio')
      .then(response => setProjects(response.data))
      .catch(error => console.error('Error fetching portfolio:', error));
  }, []);

  return (
    <div className="p-8 bg-white">
      <h2 className="text-3xl font-bold mb-4">Portfolio</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project, index) => (
          <div key={index} className="border shadow-lg p-4 rounded">
            <img src={project.image_url} alt={project.title} className="w-full h-48 object-cover mb-4"/>
            <h3 className="text-xl font-semibold">{project.title}</h3>
            <p className="mt-2">{project.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PortfolioGallery;
