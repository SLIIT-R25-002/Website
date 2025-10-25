import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Section from './Section';

const Timeline = () => {
  const [milestones, setMilestones] = useState([]);

  useEffect(() => {
    fetch('/data/milestones.json')
      .then(res => res.json())
      .then(data => setMilestones(data))
      .catch(err => console.error('Error loading milestones:', err));
  }, []);

  return (
    <Section id="milestones" className="bg-gray-50">
      <div className="text-center mb-12">
        <h2 className="text-4xl font-bold text-gray-900 mb-4">Milestones</h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Project timeline and key deliverables
        </p>
      </div>

      <div className="max-w-5xl mx-auto">
        <div className="relative">
          {/* Timeline line */}
          <div className="hidden md:block absolute left-1/2 transform -translate-x-1/2 h-full w-0.5 bg-primary-200" />

          {milestones.map((milestone, index) => (
            <motion.div
              key={milestone.id}
              className={`relative mb-8 md:mb-12 flex items-center ${
                index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'
              }`}
              initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              {/* Date */}
              <div className={`md:w-5/12 ${index % 2 === 0 ? 'md:text-right md:pr-12' : 'md:pl-12'}`}>
                <div className="text-primary-600 font-bold text-lg">
                  {milestone.month} {milestone.year}
                </div>
              </div>

              {/* Timeline dot */}
              <div className="hidden md:block absolute left-1/2 transform -translate-x-1/2 w-4 h-4 bg-primary-600 rounded-full border-4 border-white shadow" />

              {/* Content */}
              <motion.div
                className={`md:w-5/12 bg-white rounded-lg shadow-md p-6 ${
                  index % 2 === 0 ? 'md:ml-auto' : 'md:mr-auto'
                }`}
                whileHover={{ scale: 1.02, shadow: '0 10px 30px rgba(0,0,0,0.1)' }}
              >
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {milestone.title}
                </h3>
                <p className="text-gray-600 mb-2">{milestone.blurb}</p>
                <div className="inline-block px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm font-medium">
                  {milestone.marks}
                </div>
              </motion.div>
            </motion.div>
          ))}
        </div>
      </div>
    </Section>
  );
};

export default Timeline;