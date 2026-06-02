import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './BackButton.css';

const BackButton = ({ fallbackPath = '/patient/dashboard', label = 'Back' }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleBack = () => {
    // Check if there's history to go back to
    if (window.history.length > 1 && location.key !== 'default') {
      navigate(-1);
    } else {
      // Fallback to dashboard if no history
      navigate(fallbackPath);
    }
  };

  return (
    <button className="back-button" onClick={handleBack} aria-label="Go back">
      <svg
        className="back-button-icon"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M19 12H5M5 12L12 19M5 12L12 5"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="back-button-text">{label}</span>
    </button>
  );
};

export default BackButton;
