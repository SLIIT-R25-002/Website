import { motion } from 'framer-motion';
import Section from './Section';

const Hero = () => {
  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      const offset = 80;
      const elementPosition = element.offsetTop - offset;
      window.scrollTo({
        top: elementPosition,
        behavior: 'smooth',
      });
    }
  };

  return (
    <Section id="home" className="min-h-screen flex items-center relative overflow-hidden">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: 'url(/images/hero-bg.jpg)' }}
        />
        {/* Dark overlay for better text contrast */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/70" />
      </div>

      <div className="w-full relative z-10">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          <motion.h1
            className="text-5xl md:text-7xl font-bold text-white mb-4 drop-shadow-2xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            HeatScape
          </motion.h1>
          
          <motion.p
            className="text-xl md:text-2xl text-orange-300 font-medium mb-6 drop-shadow-lg"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            AI + IoT + Digital Twins for Urban Heat Island analysis
          </motion.p>
          
          <motion.p
            className="text-lg text-gray-100 max-w-3xl mx-auto mb-8 leading-relaxed drop-shadow-lg"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            HeatScape combines AI vision, mobile IoT sensing, and a lightweight digital twin to detect 
            heat-driving surfaces and test mitigation strategies at street level.
          </motion.p>
          
          <motion.div
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <motion.button
              onClick={() => scrollToSection('overview')}
              className="px-8 py-3 bg-primary-600 text-white rounded-lg font-medium shadow-2xl hover:bg-primary-700 transition-all duration-150 border-2 border-transparent hover:border-white/30"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Explore
            </motion.button>
            
            <motion.button
              onClick={() => scrollToSection('downloads')}
              className="px-8 py-3 bg-white/10 backdrop-blur-md text-white border-2 border-white/50 rounded-lg font-medium hover:bg-white/20 hover:border-white transition-all duration-150 shadow-xl"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Downloads
            </motion.button>
          </motion.div>
        </motion.div>
      </div>
    </Section>
  );
};

export default Hero;
