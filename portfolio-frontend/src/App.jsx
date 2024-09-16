import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import BioSection from './components/BioSection';
import ExperienceSection from './components/ExperienceSection';
import About from './components/About';
import PortfolioGallery from './components/PortfolioGallery';
import SpeakingEngagements from './components/SpeakingEngagements';
import Blog from './components/Blog';
import ContactForm from './components/ContactForm';
import MentoringBooking from './components/MentoringBooking';
import Header from './components/Header';
import Footer from './components/Footer';

const App = () => {
  return (
    <Router>
      
      <div className="font-sans text-gray-900 bg-white">
        <Routes>
          <Route path="/" element={<BioSection />} />
          <Route path="/about" element={<About />} />
          <Route path="/experience" element={<ExperienceSection />} />
          <Route path="/portfolio" element={<PortfolioGallery />} />
          <Route path="/speaking" element={<SpeakingEngagements />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/contact" element={<ContactForm />} />
          <Route path="/mentoring" element={<MentoringBooking />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;
