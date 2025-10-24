import { motion } from 'framer-motion';
import Section from './Section';

const gapItems = [
  {
    title: 'Image Analysis',
    description:
      'Remote sensing and GIS methods are effective for city-wide UHI detection but lack the spatial granularity needed for micro-level analysis at the building or street scale. These approaches often miss the contextual relationships between urban features, such as materials, vegetation, and built structures, making it difficult to link visual features to thermal data. Additionally, cloud cover, coarse resolution, and indirect correlation with human comfort further limit their utility for actionable urban planning.'
  },
  {
    title: 'Mobile IoT Sensing',
    description:
      'While mobile thermal and ambient sensors provide high-accuracy temperature and environmental measurements, they are frequently deployed in isolation from urban feature mapping. This results in a disconnect between sensor data and the physical context of the city, such as building materials, shading, and land use. Without integration with geospatial and visual data, these measurements cannot fully inform targeted interventions or validate the impact of urban design changes.'
  },
  {
    title: 'VLM Intelligence',
    description:
      'Current predictive models and digital twins for UHI analysis often function as opaque black boxes, providing little insight into the reasoning behind their predictions or recommendations. There is limited use of Explainable AI (XAI) to justify why certain interventions are suggested, which reduces trust and adoption among urban planners. Furthermore, most systems focus on detection rather than generating actionable, context-aware strategies for mitigation.'
  },
  {
    title: 'Digital Twin',
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
      <div className="grid md:grid-cols-2 gap-8">
        {gapItems.map((item, idx) => (
          <motion.div
            key={idx}
            className="bg-white rounded-lg p-6 shadow-sm hover:shadow-lg transition-shadow duration-300"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: idx * 0.1 }}
          >
            <h3 className="text-xl font-semibold text-primary-600 mb-2">{item.title}</h3>
            <p className="text-gray-700 text-sm">{item.description}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </Section>
);

export default ResearchGap;
