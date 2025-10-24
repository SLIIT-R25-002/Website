import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Section from './Section';

const Technologies = () => {
  const [technologies, setTechnologies] = useState([]);

  useEffect(() => {
    fetch('/data/technologies.json')
      .then(res => res.json())
      .then(data => setTechnologies(data))
      .catch(err => console.error('Error loading technologies:', err));
  }, []);

  return (
    <Section id="technologies" className="bg-white">
      <div className="text-center mb-12">
        <h2 className="text-4xl font-bold text-gray-900 mb-2">Tools & Technologies</h2>
        <div className="w-20 h-0.5 bg-primary-500 mx-auto mb-4"></div>
        <p className="text-lg text-gray-600 max-w-3xl mx-auto">
          Innovative Tools and Solutions for Transformation
        </p>
      </div>

      {/* Match Overview's layout width and padding */}
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 md:gap-12">
          {technologies.map((tech, index) => (
            <motion.div
              key={tech.id}
              className="flex flex-col items-center text-center"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <img
                src={tech.logo}
                alt={tech.name}
                className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 object-contain mb-4"
              />
              <span className="text-lg font-medium text-gray-800">{tech.name}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </Section>
  );
};

export default Technologies;