import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import "./header.css";

const Header = () => {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const toggleMobileNav = () => {
    setIsMobileNavOpen(!isMobileNavOpen);
  };

  return (
    <motion.header 
      className={`header ${isScrolled ? 'header-scrolled' : ''}`}
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, type: "spring", bounce: 0.3 }}
    >
      <div className="header-inner">
        <Link to="/" className="brand">
          <span className="brand-title">MEDVIZ</span>
        </Link>
        <div className={`header-right ${isMobileNavOpen ? 'nav-open' : ''}`}>
          <nav className="nav">
            <a href="#home" className="nav-link" onClick={toggleMobileNav}>Home</a>
            <a href="#about" className="nav-link" onClick={toggleMobileNav}>About</a>
            <a href="#services" className="nav-link" onClick={toggleMobileNav}>Services</a>
            <a href="#doctors" className="nav-link" onClick={toggleMobileNav}>Doctors</a>
            <a href="#contact" className="nav-link" onClick={toggleMobileNav}>Contact</a>
            <Link to="/login" className="btn-ghost" onClick={toggleMobileNav}>
              Login
            </Link>
          </nav>
        </div>
        <button
          className="mobile-toggle"
          onClick={toggleMobileNav}
          aria-label={isMobileNavOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={isMobileNavOpen}
        >
          <span className={`hamburger ${isMobileNavOpen ? 'open' : ''}`} aria-hidden="true"></span>
        </button>
      </div>
    </motion.header>
  );
};

export default Header;
