import { motion } from 'framer-motion';
import Section from './Section';

const objectives = [
  {
    title: 'Simulation and Modeling',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
    points: [
      'Design metadata-enriched 3D building models embedding critical thermal parameters (e.g., thermal conductivity, specific heat capacity) into digital twins for accurate thermal simulations.',
      'Integrate GIS and remote sensing data (e.g., GIS layers, Sentinel-2/Landsat-8 imagery) to provide holistic spatial context for building-level simulations.',
      'Incorporate real-time weather data from APIs and sunlight exposure calculations (SunCalc) for dynamic, adaptive modeling.',
      'Simulate thermal behavior using MATLAB Simscape Thermal to model heat transfer and predict temperature distributions for building components.'
    ]
  },
  {
    title: 'Sensing and Data Processing',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
      </svg>
    ),
    points: [
      'Implement autonomous navigation and object alignment for mobile IoT platforms using GPS, IMU, and feature-matching algorithms.',
      'Develop robust methodology to accurately map real-time temperature readings from thermal sensors onto geographic objects identified via image segmentation.',
      'Create an end-to-end computational pipeline integrating object detection (YOLOv8), pixel-level segmentation (MobileSAM), material classification (CLIP), and surface area estimation from single 2D images.'
    ]
  },
  {
    title: 'AI-Driven Decision Support',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
    points: [
      'Develop a logistic regression model for transparent, interpretable UHI prediction using structured environmental data.',
      'Leverage Vision-Language Model (Gemini) to process segmented urban images and metadata, generating low-cost, practical, and scalable mitigation strategies.',
      'Incorporate Explainable AI (XAI) mechanisms to provide clear reasoning for UHI detection and mitigation recommendations, enhancing trust and adoption.'
    ]
  },
  {
    title: 'Validation and Usability',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
    ),
    points: [
      'Develop a visualization and decision-support interface (e.g., React, Three.js) to translate complex simulation outputs and AI recommendations into user-friendly formats for non-technical users.',
      'Validate the integrated tool against documented UHI patterns and existing models to ensure credibility and reliability for real-world applications.'
    ]
  }
];

const ResearchObjectives = () => (
  <Section id="research-objectives" className="bg-gray-50">
    <div className="max-w-5xl mx-auto">
      <motion.div
        className="text-center mb-12"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <h2 className="text-4xl font-bold text-gray-900 mb-4">Research Objectives</h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          The overarching goal is to develop and validate a comprehensive, integrated, and intelligent framework for Urban Heat Island (UHI) detection and mitigation. The following main and specific objectives are defined:
        </p>
      </motion.div>
      <div className="grid md:grid-cols-2 gap-8 mb-12">
        {objectives.map((obj, idx) => (
          <motion.div
            key={idx}
            className="bg-gray-50 rounded-lg p-6 hover:shadow-lg transition-shadow duration-300"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: idx * 0.1 }}
          >
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 text-primary-600">
                {obj.icon}
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{obj.title}</h3>
                <ul className="space-y-2 list-disc ml-5">
                  {obj.points.map((point, i) => (
                    <li key={i} className="text-gray-600 text-sm">{point}</li>
                  ))}
                </ul>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  </Section>
);

export default ResearchObjectives;
