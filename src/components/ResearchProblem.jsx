import { motion } from 'framer-motion';
import Section from './Section';

const problemItems = [
  {
    title: 'Image Analysis',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    description: [
      'How can a unified computational pipeline overcome the limitations of coarse object detection, material heterogeneity, and scale ambiguity to comprehensively analyze architectural structures from a single 2D image?',
      'How can dynamic environmental adaptation be incorporated into UHI models to account for real-time changes in wind, humidity, and solar radiation?' 
    ]
  },
  {
    title: 'Mobile IoT Sensing',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
      </svg>
    ),
    description: [
      'How can a mobile IoT sensing platform equipped with autonomous navigation and thermal sensing capabilities provide accurate, validated temperature measurements of urban objects identified through image analysis while maintaining cost-effectiveness and scalability?',
      'How can IoT platforms enhance the localization and measurement of segmented urban objects, integrating depth-aware object localization and thermal sensing for scalable urban heat monitoring?'
    ]
  },
  {
    title: 'VLM Intelligence',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
    description: [
      'How can an integrated framework combine structured machine learning-based detection with Vision-Language Model (VLM)-based multimodal reasoning to provide transparent, low-cost, and context-specific mitigation strategies for Urban Heat Islands?',
      'How can explainable frameworks bridge the gap between passive UHI detection and active, data-driven mitigation strategies, offering actionable decision-support for urban planners?'
    ]
  },
  {
    title: 'Digital Twin',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
    description: [
      'How can an integrated digital twin simulation tool be developed to combine GIS datasets, 3D modeling, environmental data, and MATLAB-based physics simulations to predict and analyze the Urban Heat Island effect?',
      'How can a single framework integrate GIS, real-time weather data, 3D urban models, and simulation engines to overcome fragmented and incomplete analyses, with a focus on dynamic adaptation and building components?'
    ]
  }
];

const ResearchProblem = () => (
  <Section id="research-problem" className="bg-white">
    <div className="max-w-5xl mx-auto">
      <motion.div
        className="text-center mb-12"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <h2 className="text-4xl font-bold text-gray-900 mb-4">Research Problem</h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          The comprehensive analysis of urban environments for UHI effects from diverse data sources presents significant challenges that existing solutions fail to address holistically. This research aims to address the following key problems, grouped by system component:
        </p>
      </motion.div>
      <div className="grid md:grid-cols-2 gap-8 mb-12">
        {problemItems.map((item, idx) => (
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
                {item.icon}
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{item.title}</h3>
                <ul className="space-y-2 list-disc ml-5">
                  {item.description.map((desc, i) => (
                    <li key={i} className="text-gray-600 text-sm">{desc}</li>
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

export default ResearchProblem;
