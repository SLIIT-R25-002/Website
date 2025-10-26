import { motion } from "framer-motion";
import Section from "./Section";

const Achievements = () => {
  const achievements = [
    {
      id: 1,
      icon: "🎓",
      title: "Research Paper Acceptance",
      description:
        "We are proud to announce that our research paper was officially accepted and presented at the",
      highlight:
        "7th International Conference on Advancements in Computing – 2025",
      details:
        "This prestigious recognition highlights the innovation, technical excellence, and societal impact of our work on Urban Heat Island Detection and Mitigation using AI and IoT Technologies.",
    },
    {
      id: 2,
      icon: "🏆",
      title: "World Summit Awards Selection",
      description: "We were selected by SLIIT to apply for the",
      highlight: "World Summit Awards Competition",
      details:
        "This international competition recognizes digital innovation with impact on society, showcasing our project's potential to address global urban heat challenges. We are looking forward to participating and representing our innovative solution on the global stage.",
    },
    {
      id: 3,
      icon: "☁️",
      title: "AWS Deployment Success",
      description: "We have successfully integrated and deployed our system to",
      highlight: "Amazon Web Services (AWS)",
      details:
        "Our production-ready deployment demonstrates the scalability and reliability of our heat island detection and mitigation platform.",
    },
  ];

  return (
    <Section id="achievements" className="bg-gray-50">
      <div className="text-center mb-12">
        <h2 className="text-4xl font-bold text-gray-900 mb-4">
          Our Achievements
        </h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Milestones and Recognition
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {achievements.map((achievement, index) => (
          <motion.div
            key={achievement.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group"
          >
            <div className="p-6">
              {/* Icon */}
              <div className="text-6xl mb-4 transform group-hover:scale-110 transition-transform duration-300">
                {achievement.icon}
              </div>

              {/* Title */}
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                {achievement.title}
              </h3>

              {/* Description with Highlight */}
              <div className="mb-4">
                <p className="text-gray-700 mb-2">
                  {achievement.description}{" "}
                  <span className="font-semibold text-primary-600">
                    {achievement.highlight}
                  </span>
                </p>
              </div>

              {/* Details */}
              <p className="text-gray-600 text-sm leading-relaxed">
                {achievement.details}
              </p>

              {/* Decorative bottom border */}
              <div className="mt-6 h-1 w-20 bg-gradient-to-r from-primary-500 to-primary-600 rounded-full transform group-hover:w-full transition-all duration-500"></div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Additional Recognition Banner */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="mt-12 bg-gradient-to-r from-primary-500 to-primary-600 rounded-2xl p-8 text-white text-center shadow-xl"
      >
        <h4 className="text-2xl font-bold mb-3">Committed to Excellence</h4>
        <p className="text-lg opacity-90 max-w-3xl mx-auto">
          These achievements reflect our dedication to advancing research in
          urban heat mitigation and creating impactful solutions for sustainable
          cities.
        </p>
      </motion.div>
    </Section>
  );
};

export default Achievements;
