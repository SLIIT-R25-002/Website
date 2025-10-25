import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Section from './Section';

const Methodology = () => {
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    {
      id: 'M1',
      title: 'Real-Time Urban Scene Object Detection and Segmentation Integration',
      blurb: 'This component captures urban images using a custom mobile app and applies advanced deep learning models YOLOv8 and MobileSAM for real-time object detection and high-precision pixel-level segmentation. It classifies urban materials by combining CLIP model image-text similarity with heuristic features, enabling detailed mapping of heat-retaining surfaces.',
      icon: '🎯',
      color: 'from-blue-500 to-cyan-500',
      bgColor: 'bg-blue-50',
    },
    {
      id: 'M2',
      title: 'Mobile IoT-Based Autonomous Urban Thermal Sensing Platform',
      blurb: 'This component developed a mobile IoT platform equipped with GPS, gyroscopes, and thermal sensors for autonomous navigation and precise object thermal measurement. Using visual feature matching (SuperGlue) and real-time data transmission, it reliably maps surface temperatures to segmented urban features, providing ground-truth validation for Urban Heat Island analyses.',
      icon: '📡',
      color: 'from-purple-500 to-pink-500',
      bgColor: 'bg-purple-50',
    },
    {
      id: 'M3',
      title: 'Urban Heat Island Detection and Mitigation Using Vision-Language Models',
      blurb: 'This methodology integrates logistic regression with advanced Vision-Language Models (Gemini) to detect Urban Heat Islands (UHIs) using segmented imagery and environmental metadata. The system predicts UHI presence and generates low-cost, context-aware mitigation strategies, enhancing urban climate resilience with explainable AI for transparent decision support.',
      icon: '🌡️',
      color: 'from-orange-500 to-red-500',
      bgColor: 'bg-orange-50',
    },
    {
      id: 'M4',
      title: 'GIS-Integrated Digital Twin Simulation Tool for Urban Heat Island Prediction',
      blurb: 'This Component created an integrated simulation tool combining GIS data, 3D digital twin models enriched with thermal metadata, real-time weather inputs, and MATLAB Simscape Thermal simulations. It predicts UHI effects at building and neighborhood scales, offering interactive visualization and decision-support for sustainable urban planning and effective heat mitigation.',
      icon: '🏙️',
      color: 'from-green-500 to-emerald-500',
      bgColor: 'bg-green-50',
    },
  ];

  return (
    <Section id="methodology" className="bg-gradient-to-b from-white via-gray-50 to-white relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-40 left-20 w-96 h-96 bg-blue-500 rounded-full blur-3xl"></div>
        <div className="absolute bottom-40 right-20 w-96 h-96 bg-purple-500 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              Our Methodology
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              A comprehensive four-step pipeline transforming raw data into actionable urban insights
            </p>
          </motion.div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
          {/* Left side - Step navigation */}
          <div className="lg:w-2/5">
            <div className="sticky top-24 space-y-4">
              {steps.map((step, index) => (
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                >
                  <button
                    onClick={() => setActiveStep(index)}
                    className={`w-full text-left transition-all duration-300 ${
                      activeStep === index ? 'scale-105' : 'scale-100'
                    }`}
                  >
                    <div
                      className={`relative p-6 rounded-2xl border-2 transition-all duration-300 ${
                        activeStep === index
                          ? `${step.bgColor} border-transparent shadow-xl`
                          : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-md'
                      }`}
                    >
                      {/* Active indicator line */}
                      {activeStep === index && (
                        <motion.div
                          layoutId="activeIndicator"
                          className={`absolute -left-1 top-4 bottom-4 w-1 rounded-full bg-gradient-to-b ${step.color} shadow-lg`}
                          transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        />
                      )}

                      <div className="flex items-start gap-4">
                        {/* Step number */}
                        <div
                          className={`flex-shrink-0 w-14 h-14 rounded-xl flex items-center justify-center font-bold text-xl transition-all duration-300 ${
                            activeStep === index
                              ? `bg-gradient-to-br ${step.color} text-white shadow-lg`
                              : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {index + 1}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-2xl">{step.icon}</span>
                            <span
                              className={`text-xs font-semibold uppercase tracking-wider ${
                                activeStep === index ? 'text-gray-700' : 'text-gray-400'
                              }`}
                            >
                              Step {index + 1}
                            </span>
                          </div>
                          <h3
                            className={`text-lg font-semibold leading-tight transition-colors duration-300 ${
                              activeStep === index ? 'text-gray-900' : 'text-gray-600'
                            }`}
                          >
                            {step.title}
                          </h3>
                        </div>

                        {/* Arrow indicator */}
                        <div
                          className={`flex-shrink-0 transition-all duration-300 ${
                            activeStep === index ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'
                          }`}
                        >
                          <svg className="w-5 h-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </button>

                  {/* Connecting line */}
                  {index < steps.length - 1 && (
                    <div className="flex justify-center py-2">
                      <div className="w-0.5 h-8 bg-gradient-to-b from-gray-300 to-gray-200"></div>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>

          {/* Right side - Content display */}
          <div className="lg:w-3/5">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeStep}
                initial={{ opacity: 0, x: 20, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -20, scale: 0.95 }}
                transition={{ duration: 0.4, type: "spring", stiffness: 100 }}
                className="sticky top-24"
              >
                <div className={`rounded-3xl p-8 md:p-10 ${steps[activeStep].bgColor} border-2 border-transparent shadow-2xl`}>
                  {/* Icon and step label */}
                  <div className="flex items-center gap-4 mb-6">
                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${steps[activeStep].color} flex items-center justify-center text-3xl shadow-lg`}>
                      {steps[activeStep].icon}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                        Step {activeStep + 1} of {steps.length}
                      </div>
                      <div className="text-xs text-gray-400 font-medium">
                        {steps[activeStep].id}
                      </div>
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6 leading-tight">
                    {steps[activeStep].title}
                  </h3>

                  {/* Description */}
                  <div className="prose prose-lg max-w-none">
                    <p className="text-gray-700 leading-relaxed text-lg">
                      {steps[activeStep].blurb}
                    </p>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-8 pt-6 border-t border-gray-300">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-gray-600">Pipeline Progress</span>
                      <span className="text-sm font-bold text-gray-900">{Math.round(((activeStep + 1) / steps.length) * 100)}%</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <motion.div
                        className={`h-full bg-gradient-to-r ${steps[activeStep].color} rounded-full`}
                        initial={{ width: 0 }}
                        animate={{ width: `${((activeStep + 1) / steps.length) * 100}%` }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Bottom navigation */}
        <div className="flex justify-center gap-3 mt-12">
          {steps.map((step, index) => (
            <button
              key={step.id}
              onClick={() => setActiveStep(index)}
              className={`transition-all duration-300 ${
                activeStep === index
                  ? 'w-12 h-3'
                  : 'w-3 h-3 hover:w-6'
              } rounded-full ${
                activeStep === index
                  ? `bg-gradient-to-r ${step.color}`
                  : 'bg-gray-300 hover:bg-gray-400'
              }`}
              aria-label={`Go to step ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </Section>
  );
};

export default Methodology;