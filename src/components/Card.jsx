import { motion } from 'framer-motion';

const Card = ({ title, description, icon, delay = 0, onClick }) => {
  return (
    <motion.div
      className="bg-white rounded-lg shadow-md p-6 hover:shadow-xl transition-all duration-200 cursor-pointer"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay, ease: 'easeOut' }}
      whileHover={{ scale: 1.02 }}
      onClick={onClick}
    >
      {icon && (
        <div className="mb-4 text-primary-600">
          {icon}
        </div>
      )}
      <h3 className="text-xl font-semibold text-gray-900 mb-3">{title}</h3>
      <p className="text-gray-600 leading-relaxed">{description}</p>
    </motion.div>
  );
};

export default Card;
