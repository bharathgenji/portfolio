import React, { useEffect, useState } from 'react';
import axios from 'axios';

const SpeakingEngagements = () => {
  const [engagements, setEngagements] = useState([]);

  useEffect(() => {
    axios.get('http://localhost:5000/api/speaking-engagements')
      .then(response => setEngagements(response.data))
      .catch(error => console.error('Error fetching speaking engagements:', error));
  }, []);

  return (
    <div className="p-8 bg-secondary text-white">
      <h2 className="text-3xl font-bold mb-4">Speaking Engagements</h2>
      <ul className="space-y-4">
        {engagements.map((engagement, index) => (
          <li key={index} className="border-b border-gray-200 pb-4">
            <h3 className="text-xl font-semibold">{engagement.title}</h3>
            <span className="block text-sm">{engagement.event}</span>
            <span className="block text-sm">{engagement.date} - {engagement.location}</span>
            {engagement.description && <p className="mt-2">{engagement.description}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default SpeakingEngagements;
