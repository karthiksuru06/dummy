import React from "react";
import { motion } from "framer-motion";
import { FaStethoscope, FaRobot, FaClinicMedical, FaInfoCircle } from "react-icons/fa";
import "./service.css";

const services = [
  { icon: <FaStethoscope size={40} />, title: "Online Doctors", description: "Connect with certified doctors anywhere and anytime.", link: "#" },
  { icon: <FaRobot size={40} />, title: "Chat Bot", description: "Seamless virtual consultations and follow-ups from your home.", link: "#" },
  { icon: <FaClinicMedical size={40} />, title: "Find Clinics", description: "Locate nearby clinics and hospitals with ease.", link: "#" },
  { icon: <FaInfoCircle size={40} />, title: "Health Guidance", description: "Access expert articles and tips for a healthier lifestyle.", link: "#" },
];

export default function Service() {
  return (
    <section className="service-section" id="services">
      <motion.h2
        className="service-title"
        initial={{ opacity: 0, y: -50 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, type: "spring" }}
        viewport={{ once: true }}
      >
        Our Services
      </motion.h2>

      <div className="service-grid">
        {services.map((service, index) => (
          <motion.div
            key={index}
            className="service-card"
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: index * 0.3, type: "spring" }}
            whileHover={{ scale: 1.08, boxShadow: "0px 15px 30px rgba(0,0,0,0.2)", borderColor: "#0a2a5e" }}
            whileTap={{ scale: 0.95 }}
            viewport={{ once: true }}
          >
            <motion.div
              className="service-icon"
              whileHover={{ y: [-5, 5, -3, 0] }}
              transition={{ duration: 0.6, repeat: 1 }}
            >
              {service.icon}
            </motion.div>

            <h3>{service.title}</h3>
            <p>{service.description}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
