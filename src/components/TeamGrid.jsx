import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Section from './Section';

const TeamGrid = () => {
  const [team, setTeam] = useState({ supervisors: [], members: [] });

  useEffect(() => {
    fetch('/data/team.json')
      .then(res => res.json())
      .then(data => setTeam(data))
      .catch(err => console.error('Error loading team:', err));
  }, []);

  const TeamMember = ({ member, index }) => (
    <motion.div
      className="bg-white rounded-lg shadow-md p-6 text-center hover:shadow-xl transition-all duration-200"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      whileHover={{ scale: 1.02 }}
    >
      <div className="w-24 h-24 mx-auto mb-4 rounded-full overflow-hidden bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
        {member.image ? (
          <img 
            src={member.image} 
            alt={member.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              // Fallback to initial if image fails to load
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
        ) : null}
        <div 
          className={`w-full h-full flex items-center justify-center text-white text-3xl font-bold ${member.image ? 'hidden' : ''}`}
        >
          {member.name.charAt(0)}
        </div>
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-1">
        {member.name}
      </h3>
      <p className="text-primary-600 text-sm mb-3">
        {member.role}
      </p>
      <a
        href={`mailto:${member.email}`}
        className="text-gray-600 hover:text-primary-600 text-sm transition-colors"
      >
        {member.email}
      </a>
    </motion.div>
  );

  return (
    <Section id="team" className="bg-gray-50">
      <div className="text-center mb-12">
        <h2 className="text-4xl font-bold text-gray-900 mb-4">Team</h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Meet the people behind HeatScape
        </p>
      </div>

      {/* Supervisors */}
      <div className="mb-12">
        <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">
          Supervisors
        </h3>
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {team.supervisors.map((supervisor, index) => (
            <TeamMember key={index} member={supervisor} index={index} />
          ))}
        </div>
      </div>

      {/* Team Members */}
      <div>
        <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">
          Team Members
        </h3>
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-6">
          {team.members.map((member, index) => (
            <TeamMember key={index} member={member} index={index} />
          ))}
        </div>
      </div>
    </Section>
  );
};

export default TeamGrid;
