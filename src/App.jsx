import { useEffect } from 'react';
import { HelmetProvider, Helmet } from 'react-helmet-async';
import NavBar from './components/NavBar';
import Hero from './components/Hero';
import Overview from './components/Overview';
import LiteratureSurvey from './components/LiteratureSurvey';
import ResearchGap from './components/ResearchGap';
import ResearchProblem from './components/ResearchProblem';
import ResearchObjectives from './components/ResearchObjectives';
import Methodology from './components/Methodology';
import Timeline from './components/Timeline';
import DownloadsGrid from './components/DownloadsGrid';
import TeamGrid from './components/TeamGrid';
import ContactForm from './components/ContactForm';
import BackToTop from './components/BackToTop';
import './App.css';

function App() {
  useEffect(() => {
    // Enable smooth scrolling
    document.documentElement.style.scrollBehavior = 'smooth';
    
    // Respect prefers-reduced-motion
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mediaQuery.matches) {
      document.documentElement.style.scrollBehavior = 'auto';
    }
  }, []);

  return (
    <HelmetProvider>
      <Helmet>
        <title>HeatScape - Seeing the heat, shaping the solution</title>
        <meta name="description" content="HeatScape combines AI vision, mobile IoT sensing, and a lightweight digital twin to detect heat-driving surfaces and test mitigation strategies at street level." />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="theme-color" content="#e03a28" />
      </Helmet>

      <div className="App">
        <NavBar />
        <main>
          <Hero />
          <Overview />
          <LiteratureSurvey />
          <ResearchGap />
          <ResearchProblem />
          <ResearchObjectives />
          <Methodology />
          <Timeline />
          <DownloadsGrid />
          <TeamGrid />
          <ContactForm />
        </main>
        <footer className="bg-gray-900 text-white py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <p className="text-gray-400">
              © 2025 <span className="text-gray-300">Heat</span><span className="text-primary-600">Scape</span>. All rights reserved.
            </p>
            <p className="text-gray-500 text-sm mt-2">
              Sri Lanka Institute of Information Technology (SLIIT)
            </p>
          </div>
        </footer>
        <BackToTop />
      </div>
    </HelmetProvider>
  );
}

export default App;
