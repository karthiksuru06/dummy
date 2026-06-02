import React from "react";
import { motion } from "framer-motion";
import { FaTwitter, FaGithub, FaInstagram } from "react-icons/fa";
import "./footer.css";

const links = ["Home", "About", "Services", "Doctors", "Contact"];
const legal = ["Privacy Policy", "Terms of Service"];

const footerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.2
    }
  }
};

const footerItem = {
  hidden: { opacity: 0, y: 30 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { type: "spring", stiffness: 100, damping: 15 } 
  }
};

export default function Footer() {
  return (
    <footer className="footer">
      <motion.div 
        className="footer-grid"
        variants={footerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-50px" }}
      >
        <motion.div variants={footerItem} className="footer-brand-col">
          <h3>MEDviz</h3>
          <p>The next generation of medical visualization and patient care. Simple, fast, and reliable solutions built for practitioners.</p>
          <div className="social-icons">
            <a href="#" className="social-icon"><FaTwitter /></a>
            <a href="#" className="social-icon"><FaGithub /></a>
            <a href="#" className="social-icon"><FaInstagram /></a>
          </div>
        </motion.div>

        <motion.div variants={footerItem} className="footer-links-col">
          <h4>Navigation</h4>
          <ul>
            {links.map((l) => (
              <li key={l}>
                <a href={"#" + l.toLowerCase()}>{l}</a>
              </li>
            ))}
          </ul>
        </motion.div>

        <motion.div variants={footerItem} className="footer-contact-col">
          <h4>Office</h4>
          <p>
            Main Street, Kakinada<br />
            Andhra Pradesh, 52345 <br />
            <br />
            <strong>Contact</strong><br />
            support@medviz.tech <br />
            +91 12345 67890
          </p>
        </motion.div>

        <motion.div variants={footerItem} className="footer-legal-col">
          <h4>Platform</h4>
          <ul>
            {["Security", "Privacy", "Status", "Documentation"].map((item) => (
              <li key={item}>
                <a href="#">{item}</a>
              </li>
            ))}
          </ul>
        </motion.div>
      </motion.div>

      <motion.div 
        className="footer-bottom"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 1 }}
        viewport={{ once: true }}
      >
        <div>© 2025 MEDviz — All rights reserved</div>
        <div>© 2025 Team-1</div>
      </motion.div>
    </footer>
  );
}
