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
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Innovative Tools and Solutions for Transformation
        </p>
      </div>

      <div className="max-w-6xl mx-auto px-4">
        {/* Row 1 */}
        <div className="flex flex-wrap justify-center gap-8 md:gap-12 mb-12">
          {technologies.slice(0, 4).map((tech, index) => (
            <motion.div
              key={tech.id}
              className="flex flex-col items-center"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <img
                src={tech.logo}
                alt={tech.name}
                className="w-24 h-24 md:w-32 md:h-32 object-contain mb-3"
              />
              <span className="text-xl font-medium text-gray-800">{tech.name}</span>
            </motion.div>
          ))}
        </div>

        {/* Row 2 */}
        <div className="flex flex-wrap justify-center gap-8 md:gap-12">
          {technologies.slice(4).map((tech, index) => (
            <motion.div
              key={tech.id}
              className="flex flex-col items-center"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: (index + 4) * 0.1 }}
            >
              <img
                src={tech.logo}
                alt={tech.name}
                className="w-24 h-24 md:w-32 md:h-32 object-contain mb-3"
              />
              <span className="text-xl font-medium text-gray-800">{tech.name}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </Section>
  );
};

export default Technologies;