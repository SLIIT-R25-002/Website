import { motion } from 'framer-motion';
import Section from './Section';

const LiteratureSurvey = () => {
  const researchAreas = [
    {
      title: 'Remote Sensing & Traditional Methods',
      points: [
        'Satellite imagery (Landsat, MODIS, Sentinel-2) enables high-resolution LST monitoring',
        'Limited by coarse spatial/temporal resolution and cloud interference',
        'Fixed meteorological stations offer accuracy but limited spatial coverage'
      ],
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    {
      title: 'Computational & Simulation Approaches',
      points: [
        'ENVI-met and EnergyPlus model physical processes like shading',
        'GIS integration with 3D modeling for thermal simulations',
        'Computationally intensive, limiting real-time scalability'
      ],
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
        </svg>
      )
    },
    {
      title: 'AI-Driven Object Detection & Segmentation',
      points: [
        'YOLOv8 for precise object localization in urban scenes',
        'MobileSAM for pixel-level segmentation of urban features',
        'CLIP for semantic material classification and alignment'
      ],
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      )
    },
    {
      title: 'Vision-Language Models & XAI',
      points: [
        'VLMs like Gemini analyze urban imagery with multimodal reasoning',
        'Generate actionable mitigation strategies from structured data',
        'Explainable AI enhances transparency for decision-making'
      ],
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      )
    }
  ];

  return (
    <Section id="literature" className="bg-white">
      <div className="max-w-7xl mx-auto">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-4xl font-bold text-gray-900 mb-4">Literature Survey</h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Research on Urban Heat Islands (UHIs) has evolved significantly, driven by the need for effective 
            solutions to climate resilience, urban sustainability, and public health challenges.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {researchAreas.map((area, index) => (
            <motion.div
              key={index}
              className="bg-gray-50 rounded-lg p-6 hover:shadow-lg transition-shadow duration-300"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
            >
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 text-primary-600">
                  {area.icon}
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">
                    {area.title}
                  </h3>
                  <ul className="space-y-2">
                    {area.points.map((point, idx) => (
                      <li key={idx} className="flex items-start">
                        <span className="text-primary-600 mr-2 mt-1">•</span>
                        <span className="text-gray-600 text-sm">{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          className="bg-gradient-to-r from-primary-50 to-cool-50 rounded-lg p-8"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <h3 className="text-2xl font-bold text-gray-900 mb-4">Key Insights</h3>
          <div className="space-y-3 text-gray-700">
            <p>
              <strong>Evolution of Methods:</strong> Early research relied on remote sensing and field measurements, 
              but these lacked granularity for micro-level analysis and were limited by spatial/temporal resolution.
            </p>
            <p>
              <strong>Digital Twins & 3D Modeling:</strong> Integration of GIS data with MATLAB-based thermal 
              simulations enables prediction of UHI effects at building and city-block scales by embedding 
              environmental metadata.
            </p>
            <p>
              <strong>Depth Estimation:</strong> Vision Transformer-based models like DepthPro facilitate 
              metrically accurate 3D mesh generation from monocular images, addressing scale ambiguity challenges.
            </p>
            <p>
              <strong>Integrated AI Frameworks:</strong> These collective advancements highlight the potential 
              of integrated, AI-driven frameworks to bridge the gap between passive detection and active, 
              data-driven mitigation strategies for sustainable urban development.
            </p>
          </div>
        </motion.div>
      </div>
    </Section>
  );
};

export default LiteratureSurvey;
