import React from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import "./home.css";

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
      delayChildren: 0.1
    }
  }
};

const fadeInUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { duration: 1, type: "spring", bounce: 0.3 } 
  }
};

const badgeVariantLeft = {
  hidden: { opacity: 0, x: -50, scale: 0.8 },
  visible: { 
    opacity: 1, x: 0, scale: 1, 
    transition: { delay: 1, duration: 0.8, type: "spring" } 
  }
};

const badgeVariantRight = {
  hidden: { opacity: 0, x: 50, scale: 0.8 },
  visible: { 
    opacity: 1, x: 0, scale: 1, 
    transition: { delay: 1.2, duration: 0.8, type: "spring" } 
  }
};

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="hero-section" id="home">
      <div className="hero-container">
        {/* Left Section */}
        <motion.div 
          className="hero-text"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          <motion.h1 variants={fadeInUp}>
            Your Health, <span className="text-accent">Our Priority:</span> Connect with Care.
          </motion.h1>

          <motion.p variants={fadeInUp}>
            MedViz is your trusted partner for health. We help you detect
            emergencies early, connect with expert doctors, find nearby
            clinics, and get valuable health tips - anytime, anywhere.
          </motion.p>

          <motion.div className="hero-buttons" variants={fadeInUp}>
            <button
              className="btn-primary"
              onClick={() => navigate('/login')}
            >
              Explore Services
              <svg style={{marginLeft: "8px"}} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </button>
            <button
              className="btn-secondary"
              onClick={() => document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Learn More
            </button>
          </motion.div>

          <motion.div className="hero-stats" variants={fadeInUp}>
            <div className="stat-item">
              <h3 className="stat-value">24/7</h3>
              <p className="stat-label">AI Support</p>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-item">
              <h3 className="stat-value">150+</h3>
              <p className="stat-label">Specialists</p>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-item">
              <h3 className="stat-value">20k+</h3>
              <p className="stat-label">Happy Patients</p>
            </div>
          </motion.div>
        </motion.div>

        {/* Right Section */}
        <motion.div
          className="hero-image"
          initial={{ opacity: 0, scale: 0.8, filter: "blur(10px)" }}
          animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
          transition={{ duration: 1.2, delay: 0.4, type: "spring", bounce: 0.2 }}
        >
          <motion.div 
            className="floating-badge badge-left"
            variants={badgeVariantLeft}
            initial="hidden"
            animate="visible"
          >
            <div className="badge-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
            </div>
            <div className="badge-text">
              <span className="badge-title">24/7 AI Support</span>
              <span className="badge-subtitle">Early detection & care</span>
            </div>
          </motion.div>

          <motion.div 
            className="floating-badge badge-right"
            variants={badgeVariantRight}
            initial="hidden"
            animate="visible"
          >
            <div className="badge-icon green-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            </div>
            <div className="badge-text">
              <span className="badge-title">Verified Doctors</span>
              <span className="badge-subtitle">Top professionals</span>
            </div>
          </motion.div>

          <img src="/doctor-consultation.png" alt="Doctor Consultation" />
        </motion.div>
      </div>
    </div>
  );
}