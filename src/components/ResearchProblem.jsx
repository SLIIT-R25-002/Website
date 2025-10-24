import { motion } from 'framer-motion';
import Section from './Section';

const problemItems = [
  {
    title: 'Image Analysis',
    description: [
      'How can a unified computational pipeline overcome the limitations of coarse object detection, material heterogeneity, and scale ambiguity to comprehensively analyze architectural structures from a single 2D image?',
      'How can dynamic environmental adaptation be incorporated into UHI models to account for real-time changes in wind, humidity, and solar radiation?' 
    ]
  },
  {
    title: 'Mobile IoT Sensing',
    description: [
      'How can a mobile IoT sensing platform equipped with autonomous navigation and thermal sensing capabilities provide accurate, validated temperature measurements of urban objects identified through image analysis while maintaining cost-effectiveness and scalability?',
      'How can IoT platforms enhance the localization and measurement of segmented urban objects, integrating depth-aware object localization and thermal sensing for scalable urban heat monitoring?'
    ]
  },
  {
    title: 'VLM Intelligence',
    description: [
      'How can an integrated framework combine structured machine learning-based detection with Vision-Language Model (VLM)-based multimodal reasoning to provide transparent, low-cost, and context-specific mitigation strategies for Urban Heat Islands?',
      'How can explainable frameworks bridge the gap between passive UHI detection and active, data-driven mitigation strategies, offering actionable decision-support for urban planners?'
    ]
  },
  {
    title: 'Digital Twin',
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
      <div className="grid md:grid-cols-2 gap-8">
        {problemItems.map((item, idx) => (
          <motion.div
            key={idx}
            className="bg-gray-50 rounded-lg p-6 shadow-sm hover:shadow-lg transition-shadow duration-300"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: idx * 0.1 }}
          >
            <h3 className="text-xl font-semibold text-primary-600 mb-2">{item.title}</h3>
            <ul className="list-disc ml-5 text-gray-700 text-sm space-y-2">
              {item.description.map((desc, i) => (
                <li key={i}>{desc}</li>
              ))}
            </ul>
          </motion.div>
        ))}
      </div>
    </div>
  </Section>
);

export default ResearchProblem;
