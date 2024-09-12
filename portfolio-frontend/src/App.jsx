import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import BioSection from './components/BioSection';
import ExperienceTimeline from './components/ExperienceTimeline';
import PortfolioGallery from './components/PortfolioGallery';
import SpeakingEngagements from './components/SpeakingEngagements';
import Blog from './components/Blog';
import ContactForm from './components/ContactForm';
import MentoringBooking from './components/MentoringBooking';
import CallToActionCards from './components/CallToActionCards';

const App = () => {
  return (
    <Router>
      <div className="App">
        <Header />
        <Routes>
          <Route path="/" element={<><BioSection /><CallToActionCards /></>} />
          <Route path="/experience" element={<ExperienceTimeline />} />
          <Route path="/portfolio" element={<PortfolioGallery />} />
          <Route path="/speaking" element={<SpeakingEngagements />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/contact" element={<ContactForm />} />
          <Route path="/mentoring" element={<MentoringBooking />} />
        </Routes>
        <Footer />
      </div>
    </Router>
  );
};

export default App;
