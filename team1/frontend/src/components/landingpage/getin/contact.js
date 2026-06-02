// contact.js
import { useState } from 'react';
import { motion } from 'framer-motion';
import './contact.css';

const Contact = () => {
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [validationErrors, setValidationErrors] = useState({ name: '', email: '' });

  // Validation functions
  const validateName = (value) => {
    if (!value) return "";
    const nameRegex = /^[A-Za-z\s]+$/;
    if (!nameRegex.test(value)) {
      return "Only letters and spaces are allowed";
    }
    return "";
  };

  const validateEmail = (value) => {
    if (!value) return "";
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return "Enter a valid email address (example@domain.com)";
    }
    return "";
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    // For name field - validate letters and spaces only
    if (name === "name") {
      setFormData({ ...formData, [name]: value });
      setValidationErrors({ ...validationErrors, [name]: validateName(value) });
      return;
    }

    // For email - validate email format
    if (name === "email") {
      setFormData({ ...formData, [name]: value });
      setValidationErrors({ ...validationErrors, [name]: validateEmail(value) });
      return;
    }

    // For message field - no validation
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Check for validation errors before submitting
    if (validationErrors.name || validationErrors.email) {
      alert("Please fix the validation errors before submitting.");
      return;
    }

    // Submit logic here
    console.log("Form submitted:", formData);
    alert("Message sent successfully!");

    // Reset form
    setFormData({ name: '', email: '', message: '' });
    setValidationErrors({ name: '', email: '' });
  };

  return (
    <section className="contact-section" id="contact">
      <motion.h2 
        className="contact-heading"
        initial={{ opacity: 0, y: -20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, type: "spring" }}
        viewport={{ once: true, margin: "-100px" }}
      >
        Get in touch
      </motion.h2>
      
      <motion.div 
        className="contact-container"
        initial={{ opacity: 0, scale: 0.95, y: 30 }}
        whileInView={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 1, type: "spring", bounce: 0.2 }}
        viewport={{ once: true, margin: "-50px" }}
      >
        <div className="contact-left">
          <h3>Still have questions?<br />Write to us below.</h3>
          <p>
            Please feel free to reach out to us using the form below. Our dedicated team is ready to provide you with the information and support you need. We value your feedback and look forward to hearing from you.
          </p>
        </div>
        <div className="contact-right">
          <form className="contact-form" onSubmit={handleSubmit}>
            <div className="form-field">
              <input
                type="text"
                name="name"
                value={formData.name}
                placeholder="Your name"
                onChange={handleChange}
                required
              />
              {validationErrors.name && <span className="validation-error">{validationErrors.name}</span>}
            </div>
            <div className="form-field">
              <input
                type="email"
                name="email"
                value={formData.email}
                placeholder="Your email"
                onChange={handleChange}
                required
              />
              {validationErrors.email && <span className="validation-error">{validationErrors.email}</span>}
            </div>
            <div className="form-field">
              <textarea
                name="message"
                value={formData.message}
                placeholder="Type your message"
                onChange={handleChange}
                required
              ></textarea>
            </div>
            <button type="submit">Send Message</button>
          </form>
        </div>
      </motion.div>
    </section>
  );
};

export default Contact;
