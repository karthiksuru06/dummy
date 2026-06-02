import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './doc.css';

import doctorImage from './doctor.webp';

const doctors = [
  { name: 'Dr. Sarah Johnson', specialty: 'Cardiologist', image: doctorImage, experience: '15 years', patients: '2000+', degree: 'MBBS, Cardiology', location: 'Chitrada', rating: 4.8, reviews: 24 },
  { name: 'Dr. Michael Chen', specialty: 'Neurologist', image: doctorImage, experience: '12 years', patients: '1800+', degree: 'MBBS, Neurology', location: 'Korangi', rating: 4.5, reviews: 10 },
  { name: 'Dr. Emily Brown', specialty: 'Pediatrician', image: doctorImage, experience: '10 years', patients: '2500+', degree: 'MBBS, Pediatrics', location: 'Kakinada', rating: 4.6, reviews: 18 },
  { name: 'Dr. James Wilson', specialty: 'Orthopedic', image: doctorImage, experience: '18 years', patients: '1500+', degree: 'MBBS, Orthopedics', location: 'Hyderabad', rating: 4.7, reviews: 32 },
  { name: 'Dr. Lisa Anderson', specialty: 'Dermatologist', image: doctorImage, experience: '14 years', patients: '2200+', degree: 'MBBS, Dermatology', location: 'Vijayawada', rating: 4.4, reviews: 12 },
  { name: 'Dr. Robert Martinez', specialty: 'Psychiatrist', image: doctorImage, experience: '16 years', patients: '1900+', degree: 'MBBS, Psychiatry', location: 'Guntur', rating: 4.3, reviews: 8 },
  { name: 'Dr. Jennifer Lee', specialty: 'Gynecologist', image: doctorImage, experience: '11 years', patients: '2100+', degree: 'MBBS, Gynecology', location: 'Nellore', rating: 4.6, reviews: 14 },
  { name: 'Dr. David Taylor', specialty: 'Oncologist', image: doctorImage, experience: '20 years', patients: '1600+', degree: 'MBBS, Oncology', location: 'Vizag', rating: 4.9, reviews: 40 },
  { name: 'Dr. Amanda White', specialty: 'Radiologist', image: doctorImage, experience: '13 years', patients: '1700+', degree: 'MBBS, Radiology', location: 'Tirupati', rating: 4.2, reviews: 6 },
];

const DoctorCard = ({ name, specialty, image, experience, patients, degree, location, rating, reviews, isActive, onBookAppointment }) => (
  <div className={`doctor-carousel-card ${isActive ? 'active' : ''}`}>
    <div className="doctor-card-inner">
      
      <div className="doctor-header-bg"></div>
      
      <div className="doctor-avatar-container">
        <img src={image} alt={name} className="doctor-img" />
        <span className="status-indicator"></span>
      </div>

      <div className="doctor-info-basic">
        <h3 className="doctor-name">{name}</h3>
        <p className="doctor-specialty">{specialty}</p>
        <p className="doctor-degree">{degree}</p>
      </div>

      <div className="doctor-stats-grid">
        <div className="stat-box">
          <span className="stat-label">Experience</span>
          <span className="stat-value">{experience}</span>
        </div>
        <div className="stat-box">
          <span className="stat-label">Location</span>
          <span className="stat-value">{location}</span>
        </div>
      </div>

      <div className="doctor-rating-box">
        <div className="rating-stars">
          {Array.from({ length: 5 }).map((_, i) => (
            <svg key={i} className={`star-icon ${i < Math.round(rating) ? 'filled' : ''}`} viewBox="0 0 20 20" fill="currentColor">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          ))}
        </div>
        <span className="rating-score">{rating} <span className="rating-count">({reviews} reviews)</span></span>
      </div>

      <button className="consult-btn" onClick={onBookAppointment}>
        Book Consultation
      </button>

    </div>
  </div>
);

const DoctorsSection = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % doctors.length);
    }, 3500);

    return () => clearInterval(interval);
  }, []);

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % doctors.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + doctors.length) % doctors.length);
  };

  const goToSlide = (index) => {
    setCurrentIndex(index);
  };

  const handleBookAppointment = () => {
    navigate('/login');
  };

  const getVisibleDoctors = () => {
    const visible = [];
    for (let i = -1; i <= 1; i++) {
      const index = (currentIndex + i + doctors.length) % doctors.length;
      visible.push({
        ...doctors[index],
        originalIndex: index,
        isActive: i === 0,
        position: i
      });
    }
    return visible;
  };

  return (
    <section className="doctor-section" id="doctors">
      <div className="section-header">
        <h2>Meet Our Expert Doctors</h2>
        <p className="section-subtitle">World-class healthcare professionals dedicated to your wellbeing</p>
      </div>

      <div className="carousel-container">
        <button className="carousel-btn prev" onClick={prevSlide} aria-label="Previous doctor">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="doctor-carousel">
          <div className="carousel-track">
            {getVisibleDoctors().map((doc) => (
              <DoctorCard
                key={`${doc.originalIndex}-${doc.position}`}
                name={doc.name}
                specialty={doc.specialty}
                degree={doc.degree}
                experience={doc.experience}
                location={doc.location}
                rating={doc.rating}
                reviews={doc.reviews}
                patients={doc.patients}
                image={doc.image}
                isActive={doc.isActive}
                onBookAppointment={handleBookAppointment}
              />
            ))}
          </div>
        </div>

        <button className="carousel-btn next" onClick={nextSlide} aria-label="Next doctor">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <div className="carousel-indicators">
        {doctors.map((_, index) => (
          <button
            key={index}
            className={`indicator ${index === currentIndex ? 'active' : ''}`}
            onClick={() => goToSlide(index)}
            aria-label={`Go to doctor ${index + 1}`}
          />
        ))}
      </div>
    </section>
  );
};

export default DoctorsSection;
