import { useState } from 'react';
import { motion } from 'framer-motion';
import Section from './Section';

const Methodology = () => {
  const [expandedStep, setExpandedStep] = useState(null);

  const steps = [
    {
      id: 'M1',
      title: 'Image',
      blurb: 'Segment surfaces (asphalt, roofs, concrete, vegetation) from street photos; add context via VLM.',
    },
    {
      id: 'M2',
      title: 'IoT',
      blurb: 'Collect thermal + ambient + GPS/IMU data along routes; align with tiles.',
    },
    {
      id: 'M3',
      title: 'Explainability',
      blurb: 'Explain risk with surface mix & exposure; emit short rationales.',
    },
    {
      id: 'M4',
      title: 'Digital Twin',
      blurb: 'Adjust cool roofs, shade, canopy; preview indicative ΔT.',
    },
  ];

  return (
    <Section id="methodology" className="bg-white">
      <div className="text-center mb-12">
        <h2 className="text-4xl font-bold text-gray-900 mb-4">Methodology</h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Four-step pipeline from data collection to actionable insights
        </p>
      </div>

      <div className="grid md:grid-cols-4 gap-6">
        {steps.map((step, index) => (
          <motion.div
            key={step.id}
            className="relative"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
          >
            <motion.div
              className={`bg-white border-2 rounded-lg p-6 cursor-pointer transition-all duration-200 ${
                expandedStep === step.id
                  ? 'border-primary-600 shadow-lg'
                  : 'border-gray-200 hover:border-primary-400 hover:shadow-md'
              }`}
              onClick={() => setExpandedStep(expandedStep === step.id ? null : step.id)}
              whileHover={{ scale: 1.02 }}
            >
              <div className="flex items-center justify-center mb-4">
                <div className="w-12 h-12 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold text-lg">
                  {index + 1}
                </div>
              </div>
              
              <h3 className="text-xl font-semibold text-gray-900 text-center mb-2">
                {step.title}
              </h3>
              
              <motion.div
                initial={false}
                animate={{
                  height: expandedStep === step.id ? 'auto' : 0,
                  opacity: expandedStep === step.id ? 1 : 0,
                }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <p className="text-gray-600 text-sm mt-3 leading-relaxed">
                  {step.blurb}
                </p>
              </motion.div>

              {expandedStep !== step.id && (
                <p className="text-primary-600 text-sm text-center mt-2">
                  Click to expand
                </p>
              )}
            </motion.div>

            {index < steps.length - 1 && (
              <div className="hidden md:block absolute top-1/2 -right-3 transform -translate-y-1/2 z-10">
                <svg className="w-6 h-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </Section>
  );
};

export default Methodology;
