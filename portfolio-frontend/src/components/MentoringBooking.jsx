import React, { useState } from 'react';
import axios from 'axios';

const MentoringBooking = () => {
  const [bookingData, setBookingData] = useState({ name: '', email: '', sessionDate: '' });
  const [responseMessage, setResponseMessage] = useState('');

  const handleChange = (e) => {
    setBookingData({ ...bookingData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    axios.post('http://localhost:5000/api/mentoring-booking', bookingData)
      .then(response => setResponseMessage(response.data.message))
      .catch(error => console.error('Error booking mentoring session:', error));
  };

  return (
    <div className="p-8 bg-secondary text-white">
      <h2 className="text-3xl font-bold mb-4">Book a Mentoring Session</h2>
      {responseMessage && <p className="text-green-500">{responseMessage}</p>}
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          name="name"
          placeholder="Your Name"
          value={bookingData.name}
          onChange={handleChange}
          className="w-full p-2 mb-4 border"
          required
        />
        <input
          type="email"
          name="email"
          placeholder="Your Email"
          value={bookingData.email}
          onChange={handleChange}
          className="w-full p-2 mb-4 border"
          required
        />
        <input
          type="date"
          name="sessionDate"
          placeholder="Select Date"
          value={bookingData.sessionDate}
          onChange={handleChange}
          className="w-full p-2 mb-4 border"
          required
        />
        <button type="submit" className="bg-primary text-white p-2 rounded">Book Now</button>
      </form>
    </div>
  );
};

export default MentoringBooking;
