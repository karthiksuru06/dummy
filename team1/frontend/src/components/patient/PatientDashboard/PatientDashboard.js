import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../../../api/axiosConfig';
import Calendar from '../Calendar/Calendar';
import './PatientDashboard.css';

const PatientDashboard = () => {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [patientProfile, setPatientProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const userData = JSON.parse(localStorage.getItem('user') || '{}');
        const patientId = userData.id || userData._id;

        console.log('User Data from localStorage:', userData);
        console.log('Patient ID:', patientId);

        if (!patientId) {
          console.error('No patient ID found in localStorage');
          setLoading(false);
          return;
        }

        // Fetch patient profile, appointments, and doctors
        console.log('Fetching data...');

        try {
          const profileRes = await API.get(`/patient/${patientId}/profile`);
          console.log('Profile Response:', profileRes.data);
          console.log('Profile Response success:', profileRes.data.success);
          console.log('Profile Response profile:', profileRes.data.profile);
          if (profileRes.data && profileRes.data.success) {
            console.log('Setting patient profile:', profileRes.data.profile);
            setPatientProfile(profileRes.data.profile);
          } else {
            console.log('Profile response structure not as expected');
          }
        } catch (profileError) {
          console.error('Profile fetch error:', profileError);
          console.error('Profile error response:', profileError.response?.data);
        }

        try {
          const appointmentsRes = await API.get(`/patient/${patientId}/appointments`);
          console.log('Appointments Response:', appointmentsRes.data);
          console.log('Appointments success:', appointmentsRes.data.success);
          if (appointmentsRes.data && appointmentsRes.data.success) {
            const allAppointments = appointmentsRes.data.appointments || [];
            console.log('All appointments:', allAppointments);
            console.log('First appointment:', allAppointments[0]);
            // Filter upcoming appointments
            const upcoming = allAppointments.filter(apt =>
              new Date(apt.appointment_date) >= new Date()
            ).slice(0, 3);
            console.log('Upcoming appointments:', upcoming);
            console.log('Setting appointments state with:', upcoming);
            setAppointments(upcoming);
          } else {
            console.log('Appointments response structure not as expected');
          }
        } catch (appointmentError) {
          console.error('Appointments fetch error:', appointmentError);
          console.error('Appointments error response:', appointmentError.response?.data);
        }

        try {
          const doctorsRes = await API.get('/doctors/available');
          console.log('Doctors Response:', doctorsRes.data);
          console.log('Doctors Response is Array?', Array.isArray(doctorsRes.data));
          console.log('Doctors length:', doctorsRes.data?.length);
          // Set doctors (first 3)
          if (Array.isArray(doctorsRes.data)) {
            console.log('Setting doctors from array:', doctorsRes.data.slice(0, 3));
            setDoctors(doctorsRes.data.slice(0, 3));
          } else if (doctorsRes.data && doctorsRes.data.doctors) {
            console.log('Setting doctors from doctors property:', doctorsRes.data.doctors.slice(0, 3));
            setDoctors(doctorsRes.data.doctors.slice(0, 3));
          } else {
            console.log('Doctors response structure not recognized');
          }
        } catch (doctorError) {
          console.error('Doctors fetch error:', doctorError);
          console.error('Doctors error response:', doctorError.response?.data);
        }

        setLoading(false);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Debug: Log state values before rendering
  console.log('===== RENDER DEBUG =====');
  console.log('Loading:', loading);
  console.log('Patient Profile:', patientProfile);
  console.log('Appointments:', appointments);
  console.log('Doctors:', doctors);
  console.log('========================');

  return (
    <div className="dashboard-bg">
      <div className="dashboard-container">
        {/* ✨ Premium Greeting */}
        <div className="dashboard-greeting">
          <h1 className="greeting-text">How are you feeling today?</h1>
        </div>

        {/* 🍱 Bento Content Grid */}
        <div className="dashboard-grid">
          
          {/* 📅 Upcoming Appointments */}
          <div className="dashboard-card appointments-card-new">
            <h2 className="dashboard-card-title">✨ Upcoming Appointments</h2>
            <div className="appointments-list-new">
              {loading ? (
                <p style={{ textAlign: 'center', opacity: 0.6, padding: '20px' }}>Loading schedules...</p>
              ) : appointments.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <p style={{ opacity: 0.6, marginBottom: '20px' }}>No upcoming sessions found</p>
                  <button
                    className="doctor-view-profile-btn"
                    onClick={() => navigate('/patient/finddoctors')}
                    style={{ maxWidth: '200px' }}
                  >
                    Schedule Now
                  </button>
                </div>
              ) : (
                appointments.map((apt, index) => (
                  <div key={apt._id || index} className="appointment-list-item">
                    <div className="appointment-avatar-circle">
                      {apt.doctor_id?.full_name?.charAt(0) || 'D'}
                    </div>
                    <div className="appointment-list-details">
                      <div className="appointment-list-name">
                        Dr. {apt.doctor_id?.full_name} {apt.doctor_id?.last_name}
                      </div>
                      <div className="appointment-list-meta">
                        <span>📅 {formatDate(apt.appointment_date)}</span>
                        <span>⏰ {apt.appointment_time}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 📊 Health Status (Bento Stats) */}
          <div className="health-stats-grid">
            {/* Blood Stat */}
            <div className="stat-card-new">
              <div className="stat-icon-wrap">🩸</div>
              <div>
                <div className="stat-label-new">Blood Type</div>
                <div className="stat-value-new">
                  {patientProfile?.blood_group || 'O+'}
                </div>
              </div>
            </div>

            {/* Weight Stat */}
            <div className="stat-card-new">
              <div className="stat-icon-wrap">⚖️</div>
              <div>
                <div className="stat-label-new">Weight</div>
                <div className="stat-value-new">
                  {patientProfile?.weight || '72'} <span className="stat-unit-new">kg</span>
                </div>
              </div>
            </div>

            {/* Height Stat */}
            <div className="stat-card-new">
              <div className="stat-icon-wrap">📏</div>
              <div>
                <div className="stat-label-new">Height</div>
                <div className="stat-value-new">
                  {patientProfile?.height || '178'} <span className="stat-unit-new">cm</span>
                </div>
              </div>
            </div>

            {/* BPM Stat */}
            <div className="stat-card-new">
              <div className="stat-icon-wrap">❤️</div>
              <div>
                <div className="stat-label-new">Heart Rate</div>
                <div className="stat-value-new">
                  {patientProfile?.bpm || '75'} <span className="stat-unit-new">bpm</span>
                </div>
              </div>
            </div>
          </div>

          {/* 👩‍⚕️ Recommended Doctors */}
          <div className="dashboard-card doctors-card-bottom">
            <h2 className="dashboard-card-title">🔍 Recommended Doctors</h2>
            <div className="doctors-grid-horizontal">
              {loading ? (
                <p style={{ textAlign: 'center', opacity: 0.6 }}>Curating list...</p>
              ) : doctors.length === 0 ? (
                <p style={{ textAlign: 'center', opacity: 0.6 }}>No doctors available right now</p>
              ) : (
                doctors.map((doctor, index) => (
                  <div key={doctor.id || index} className="doctor-card-small">
                    <div className="doctor-avatar-small">
                      {doctor.name?.charAt(0) || 'D'}
                    </div>
                    <div className="doctor-small-name">{doctor.name}</div>
                    <div className="doctor-small-email">Expert in {doctor.specialization || 'General Care'}</div>
                    <button
                      className="doctor-view-profile-btn"
                      onClick={() => navigate('/patient/finddoctors')}
                    >
                      Book Session
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 📅 Calendar Integration */}
          <div className="dashboard-card calendar-card-wrapper">
             <Calendar appointments={appointments} />
          </div>

          {/* 🤖 Smart Assistant (Chat) */}
          <div 
            className="chat-widget-card" 
            onClick={() => navigate('/patient/chatbot')}
            style={{ cursor: 'pointer' }}
          >
            <div className="chat-widget-content">
              <p className="chat-widget-message">
                "Hello {patientProfile?.full_name?.split(' ')[0] || 'Karthik'}! I can help you analyze your symptoms or schedule follow-ups. Ready to talk?"
              </p>
            </div>
            <button
              className="chat-widget-btn"
              onClick={(e) => {
                e.stopPropagation();
                navigate('/patient/chatbot');
              }}
            >
              Consult AI Assistant
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default PatientDashboard;
