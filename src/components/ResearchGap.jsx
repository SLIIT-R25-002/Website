import { motion } from 'framer-motion';
import Section from './Section';

const gapItems = [
  {
    title: 'Image Analysis',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    description:
      'Remote sensing and GIS methods are effective for city-wide UHI detection but lack the spatial granularity needed for micro-level analysis at the building or street scale. These approaches often miss the contextual relationships between urban features, such as materials, vegetation, and built structures, making it difficult to link visual features to thermal data. Additionally, cloud cover, coarse resolution, and indirect correlation with human comfort further limit their utility for actionable urban planning.'
  },
  {
    title: 'Mobile IoT Sensing',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
      </svg>
    ),
    description:
      'While mobile thermal and ambient sensors provide high-accuracy temperature and environmental measurements, they are frequently deployed in isolation from urban feature mapping. This results in a disconnect between sensor data and the physical context of the city, such as building materials, shading, and land use. Without integration with geospatial and visual data, these measurements cannot fully inform targeted interventions or validate the impact of urban design changes.'
  },
  {
    title: 'VLM Intelligence',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
    description:
      'Current predictive models and digital twins for UHI analysis often function as opaque black boxes, providing little insight into the reasoning behind their predictions or recommendations. There is limited use of Explainable AI (XAI) to justify why certain interventions are suggested, which reduces trust and adoption among urban planners. Furthermore, most systems focus on detection rather than generating actionable, context-aware strategies for mitigation.'
  },
  {
    title: 'Digital Twin',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
    description:
      'Most digital twins and 3D urban models represent only geometry and textures, failing to embed critical metadata such as thermal conductivity, specific heat capacity, and mass. This lack of physical properties reduces the accuracy of thermal simulations and what-if scenario testing. Additionally, many models operate under static assumptions, rarely adapting to dynamic environmental changes like wind, humidity, and solar radiation, which are essential for realistic urban heat analysis.'
  }
];

const ResearchGap = () => (
  <Section id="research-gap" className="bg-gray-50">
    <div className="max-w-5xl mx-auto">
      <motion.div
        className="text-center mb-12"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <h2 className="text-4xl font-bold text-gray-900 mb-4">Research Gap</h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Despite significant progress in UHI research, several critical gaps remain, especially in integrating diverse technologies for comprehensive, actionable, and user-friendly systems.
        </p>
      </motion.div>
      <div className="grid md:grid-cols-2 gap-8 mb-12">
        {gapItems.map((item, idx) => (
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
                <p className="text-gray-600 text-sm">{item.description}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  </Section>
);

export default ResearchGap;
