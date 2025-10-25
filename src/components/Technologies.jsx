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
    <Section id="tools-and-technologies" className="bg-gradient-to-b from-gray-50 to-white relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10">
        {/* Header */}
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-5xl md:text-6xl font-bold text-gray-900 mb-4">
              Tools & Technologies
            </h2>
            <div className="flex items-center justify-center gap-2 mb-6">
              <div className="w-12 h-1 bg-gradient-to-r from-transparent to-blue-500"></div>
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <div className="w-24 h-1 bg-blue-500"></div>
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <div className="w-12 h-1 bg-gradient-to-l from-transparent to-blue-500"></div>
            </div>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto font-light">
              Innovative Tools and Solutions for Digital Transformation
            </p>
          </motion.div>
        </div>

        {/* Technologies Grid */}
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8">
            {technologies.map((tech, index) => (
              <motion.div
                key={tech.id}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ 
                  duration: 0.5, 
                  delay: (index + 4) * 0.1,
                  type: "spring",
                  stiffness: 100
                }}
              >
                <div className="group relative bg-white rounded-2xl p-8 shadow-sm hover:shadow-2xl transition-all duration-300 border border-gray-100 hover:border-blue-200">
                  {/* Hover gradient effect */}
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  
                  <div className="relative z-10 flex flex-col items-center">
                    <div className="mb-4 transform group-hover:scale-110 group-hover:-translate-y-2 transition-all duration-300">
                      <img
                        src={tech.logo}
                        alt={tech.name}
                        className="w-12 h-12 md:w-14 md:h-14 object-contain drop-shadow-md"
                      />
                    </div>
                    <span className="text-lg md:text-xl font-semibold text-gray-800 text-center group-hover:text-blue-600 transition-colors duration-300">
                      {tech.name}
                    </span>
                  </div>
                  
                  {/* Corner accent */}
                  <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-blue-100 to-transparent rounded-tr-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </Section>
  );
};

export default Technologies;