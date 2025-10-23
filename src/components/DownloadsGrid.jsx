import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Section from './Section';

const DownloadsGrid = () => {
  const [downloads, setDownloads] = useState([]);

  useEffect(() => {
    fetch('/data/downloads.json')
      .then(res => res.json())
      .then(data => setDownloads(data))
      .catch(err => console.error('Error loading downloads:', err));
  }, []);

  const getIcon = (kind) => {
    if (kind === 'Presentation') {
      return (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
        </svg>
      );
    }
    return (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    );
  };

  return (
    <Section id="downloads" className="bg-white">
      <div className="text-center mb-12">
        <h2 className="text-4xl font-bold text-gray-900 mb-4">Downloads</h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Project documents and presentations
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {downloads.map((item, index) => (
          <motion.div
            key={item.id}
            className="bg-white border-2 border-gray-200 rounded-lg p-6 hover:border-primary-600 hover:shadow-lg transition-all duration-200"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: index * 0.05 }}
            whileHover={{ scale: 1.02 }}
          >
            <div className="flex items-start mb-4">
              <div className="text-primary-600 mr-3">
                {getIcon(item.kind)}
              </div>
              <div className="flex-1">
                <div className="text-sm text-primary-600 font-medium mb-1">
                  {item.kind}
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {item.title}
                </h3>
              </div>
            </div>
            
            <motion.a
              href={item.file}
              download
              className="block w-full bg-primary-600 text-white text-center py-2 rounded-lg font-medium hover:bg-primary-700 transition-colors duration-150"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Download
            </motion.a>
          </motion.div>
        ))}
      </div>
    </Section>
  );
};

export default DownloadsGrid;
