import { useState } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import Section from './Section';

const ContactForm = () => {
  const [email, setEmail] = useState({
    alias: '',
    subject: 'Via HeatScape Web',
    message: '',
    replyTo: '',
    to: 'info.heatscape@gmail.com',
    text: '',
    html: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEmail((prev) => ({
      ...prev,
      [name]: value,
      // Keep `text` in sync with the message for plain-text fallback
      ...(name === 'message' && { text: value }),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email.alias) {
      toast.error('Please enter your name', { position: 'bottom-center' });
      return;
    }
    if (!email.replyTo) {
      toast.error('Please enter your email', { position: 'bottom-center' });
      return;
    }
    if (!email.text && !email.html) {
      toast.error('Please enter a message', { position: 'bottom-center' });
      return;
    }

    try {
      await toast.promise(
        axios.post('https://email.pixelcore.lk/api/send-email', email),
        {
          loading: 'Sending...',
          success: <b>Email sent successfully!</b>,
          error: <b>Failed to send email. Please try again.</b>,
        },
        {
          position: 'bottom-center',
        }
      );

      // Reset form
      setEmail({
        alias: '',
        subject: 'Via HeatScape Web',
        message: '',
        replyTo: '',
        to: 'info.heatscape@gmail.com',
        text: '',
        html: '',
      });
    } catch (error) {
      // Error is already handled by react-hot-toast via toast.promise
      console.error('Email sending error:', error);
    }
  };

  return (
    <Section id="contact" className="bg-white">
      <div className="text-center mb-12">
        <h2 className="text-4xl font-bold text-gray-900 mb-4">Contact</h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Get in touch with us
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-12 max-w-5xl mx-auto">
        {/* Contact Information */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h3 className="text-2xl font-semibold text-gray-900 mb-6">
            Contact Information
          </h3>

          <div className="space-y-4">
            <div className="flex items-start">
              <svg className="w-6 h-6 text-primary-600 mr-3 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <div>
                <h4 className="font-medium text-gray-900 mb-1">Address</h4>
                <p className="text-gray-600">
                  Sri Lanka Institute of Information Technology (SLIIT)
                  <br />
                  Malabe, Sri Lanka
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <svg className="w-6 h-6 text-primary-600 mr-3 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <div>
                <h4 className="font-medium text-gray-900 mb-1">Email</h4>
                <a href="mailto:info.heatscape@gmail.com" className="text-primary-600 hover:text-primary-700">
                  info.heatscape@gmail.com
                </a>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Contact Form */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="alias" className="block text-sm font-medium text-gray-700 mb-1">
                Name
              </label>
              <input
                type="text"
                id="alias"
                name="alias"
                value={email.alias}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-600 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label htmlFor="replyTo" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                id="replyTo"
                name="replyTo"
                value={email.replyTo}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-600 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                Message
              </label>
              <textarea
                id="message"
                name="message"
                value={email.message}
                onChange={handleChange}
                required
                rows="4"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-600 focus:border-transparent transition-all resize-none"
              />
            </div>

            <motion.button
              type="submit"
              className="w-full bg-primary-600 text-white py-3 rounded-lg font-medium hover:bg-primary-700 transition-colors duration-150"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Send Message
            </motion.button>
          </form>
        </motion.div>
      </div>
    </Section>
  );
};

export default ContactForm;