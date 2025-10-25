import { motion } from 'framer-motion';

const Section = ({ id, children, className = '' }) => {
  return (
    <motion.section
      id={id}
      className={`py-16 md:py-24 ${className}`}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-100px' }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      <div className="max-w-8xl mx-auto px-6 sm:px-8 lg:px-20">
        {children}
      </div>
    </motion.section>
  );
};

export default Section;
