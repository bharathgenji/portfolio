import React, { useState } from 'react';
import axios from 'axios';

const ContactForm = () => {
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [responseMessage, setResponseMessage] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    axios.post('http://localhost:5000/api/contact', formData)
      .then(response => setResponseMessage(response.data.message))
      .catch(error => console.error('Error submitting contact form:', error));
  };

  return (
    <div className="p-8 bg-white">
      <h2 className="text-3xl font-bold mb-4">Contact Me</h2>
      {responseMessage && <p className="text-green-500">{responseMessage}</p>}
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          name="name"
          placeholder="Your Name"
          value={formData.name}
          onChange={handleChange}
          className="w-full p-2 mb-4 border"
          required
        />
        <input
          type="email"
          name="email"
          placeholder="Your Email"
          value={formData.email}
          onChange={handleChange}
          className="w-full p-2 mb-4 border"
          required
        />
        <textarea
          name="message"
          placeholder="Your Message"
          value={formData.message}
          onChange={handleChange}
          className="w-full p-2 mb-4 border"
          required
        ></textarea>
        <button type="submit" className="bg-primary text-white p-2 rounded">Send</button>
      </form>
    </div>
  );
};

export default ContactForm;
