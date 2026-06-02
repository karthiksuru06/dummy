import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../../api/axiosConfig';
import Header from '../patient/PatientHeader/Header';
import '../landingpage/doctors/doc.css';
import './FindDoctors.css';

const FindDoctors = () => {
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoctor, setSelectedDoctor] = useState(null);

  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }
        const headers = { Authorization: `Bearer ${token}` };
        const response = await API.get('/doctors/available', { headers }); // fetch all doctors
        setDoctors(response.data);
      } catch (error) {
        console.error('Error fetching doctors:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchDoctors();
  }, [navigate]);

  const handleViewMore = (doctor) => {
    setSelectedDoctor(doctor);
  };

  const closeModal = () => {
    setSelectedDoctor(null);
  };

  return (
    <div className="find-doctors-container">
      <Header />
      <h1>Find Doctors</h1>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="doctors-grid">
          {doctors.map((doctor, index) => (
            <div key={doctor.id || index} className="doctor-carousel-card find-doctor-card">
              <div className="doctor-card-inner">
                <div className="doctor-avatar">
                  <div className="avatar-circle">
                    {doctor.profile_image ? (
                      <img src={doctor.profile_image} alt={doctor.name} />
                    ) : (
                      <div style={{display:'flex',alignItems:'center',justifyContent:'center',width:'100%',height:'100%',color:'#fff',fontWeight:800}}>
                        {doctor.name?.split(' ').map(n=>n[0]).slice(0,2).join('')}
                      </div>
                    )}
                  </div>
                </div>

                <div className="doctor-info">
                  <div className="doctor-badge online"><span className="online-dot"></span> online</div>
                  <h3 className="doctor-name">{doctor.name}</h3>
                  <p className="doctor-specialty">{doctor.specialization}</p>
                  {doctor.degree && <p className="doctor-degree">{doctor.degree}</p>}

                  <div className="doctor-meta">
                    <div className="meta-item"><strong>Experience:</strong> <span>{doctor.experience} years</span></div>
                    <div className="meta-item"><strong>Location:</strong> <span>{doctor.clinic_name || doctor.location || '—'}</span></div>
                  </div>

                  <div className="doctor-rating">
                    <div className="stars">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <span key={i} className={`star ${i < Math.round(doctor.rating || 4) ? 'filled' : ''}`}>★</span>
                      ))}
                    </div>
                    <div className="rating-text">{(doctor.rating || 4).toFixed(1)} ({doctor.reviews || 0} reviews)</div>
                  </div>
                </div>

                <button className="consult-btn" onClick={() => navigate(`/doctor/${doctor.id || ''}`)}>Consult Doctor</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedDoctor && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={closeModal}>×</button>
            <h2>{selectedDoctor.name}</h2>
            <div className="doctor-details">
              <p><strong>Age:</strong> {selectedDoctor.age}</p>
              <p><strong>Email:</strong> {selectedDoctor.email}</p>
              <p><strong>Phone:</strong> {selectedDoctor.phone}</p>
              <p><strong>Gender:</strong> {selectedDoctor.gender}</p>
              <p><strong>Specialization:</strong> {selectedDoctor.specialization}</p>
              <p><strong>Experience:</strong> {selectedDoctor.experience} years</p>
              <p><strong>Available Days:</strong> {selectedDoctor.available_day}</p>
              <p><strong>Working Hours:</strong> {selectedDoctor.start_time} - {selectedDoctor.end_time}</p>
              <p><strong>Clinic Name:</strong> {selectedDoctor.clinic_name}</p>
              <p><strong>Clinic Address:</strong> {selectedDoctor.clinic_address}</p>
              <p><strong>Address:</strong> {selectedDoctor.address}</p>
              {selectedDoctor.cert_docs && (
                <p><strong>Certificate:</strong> <a href={selectedDoctor.cert_docs} target="_blank" rel="noopener noreferrer">View Certificate</a></p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FindDoctors;
