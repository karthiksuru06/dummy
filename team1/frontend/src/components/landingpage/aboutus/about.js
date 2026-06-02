import React from 'react';
import { motion } from 'framer-motion';
import './about.css';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
      delayChildren: 0.2
    }
  }
};

const cardVariants = {
  hidden: { opacity: 0, y: 50 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { duration: 0.8, type: "spring", bounce: 0.3 } 
  }
};

const About = () => {
  const cards = [
    {
      title: "How we Help",
      points: [
        "Easily book doctor appointments with instant confirmations.",
        "Keep health records securely in one centralized place.",
        "Gain 24/7 access to our dedicated patient support team."
      ]
    },
    {
      title: "Why use MEDviz",
      points: [
        "Consult with trusted, certified doctors fully online.",
        "Receive personalized reminders for medications and checkups.",
        "Access everything you need in one easy-to-use platform."
      ]
    },
    {
      title: "Our Value",
      points: [
        "Enjoy reliable, transparent services with zero hidden fees.",
        "Your medical data stays encrypted and secure.",
        "Designed entirely around your comfort, time, and care."
      ]
    },
  ];

  return (
    <div className="about-section" id="about">
      <motion.h2
        initial={{ opacity: 0, y: -20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, type: "spring" }}
        viewport={{ once: true, margin: "-100px" }}
      >
        About us
      </motion.h2>
      
      <motion.div 
        className="about-cards"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-50px" }}
      >
        {cards.map((card, index) => (
          <motion.div className="about-card" key={index} variants={cardVariants}>
            <h3>{card.title}</h3>
            <ul>
              {card.points.map((point, i) => (
                <li key={i}>{point}</li>
              ))}
            </ul>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
};

export default About;
