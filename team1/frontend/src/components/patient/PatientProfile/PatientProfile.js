import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from '../../../api/axiosConfig';
import Header from '../PatientHeader/Header';
import "./PatientProfile.css";

const PatientProfile = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState({});
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/patient/login');
          return;
        }

        const response = await API.get('/patients/profile');

        if (!response.data || !response.data.success) {
          throw new Error(response.data?.message || 'Failed to fetch profile');
        }

        const data = response.data.profile;

        let medications = [];
        if (data.current_medications) {
          if (typeof data.current_medications === 'string') {
            medications = data.current_medications.split(';').map(med => med.trim()).filter(Boolean);
          } else if (Array.isArray(data.current_medications)) {
            medications = data.current_medications;
          }
        }

        const mappedData = {
          ...data,
          name: data.name || `${data.full_name || ''} ${data.last_name || ''}`.trim(),
          contact: data.phone || data.contact || '',
          emergency: data.emergency_contact || '',
          mail: data.email || '',
          blood: data.blood_group || '',
          id: data._id || '',
          address: data.address || '',
          height: data.height || '',
          weight: data.weight || '',
          bpm: data.bpm || '',
          dob: data.dob || '',
          medications: medications
        };

        setProfile(mappedData);
      } catch (err) {
        console.error('Error fetching profile:', err);
        if (err.response?.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('role');
          alert('Your session has expired. Please login again.');
          navigate('/patient/login');
          return;
        }
        setError(err.response?.data?.message || err.message || 'Failed to load profile data');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [navigate]);

  const handleEditRedirect = () => {
    alert("To edit your profile, please go to the Settings page.");
    navigate('/patient/settings');
  };

  if (loading) {
    return (
      <div className="profile-container">
        <Header />
        <div className="loading-profile">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="profile-container">
      <Header />

      {/* notifications */}
      {successMessage && (
        <div className="notification success-notification">
          <span className="notification-icon">✓</span>
          <span>{successMessage}</span>
        </div>
      )}
      {error && (
        <div className="notification error-notification">
          <span className="notification-icon">✕</span>
          <span>{error}</span>
          <button className="close-notification" onClick={() => setError(null)}>×</button>
        </div>
      )}

      {/* header card */}
      <div className="profile-header-card">
        <div className="avatar-placeholder">
          {profile.name?.charAt(0) || 'P'}
        </div>
        <div className="profile-info">
          <h1>{profile.name || 'Patient'}</h1>
          <p>{profile.contact || 'N/A'}</p>
          <p>{profile.mail || 'N/A'}</p>
          <p>{profile.address || 'N/A'}</p>
          {profile.emergency && (
            <p className="emergency">
              <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                <path d="M8 0a1 1 0 0 1 1 1v6h6a1 1 0 1 1 0 2H9v6a1 1 0 1 1-2 0V9H1a1 1 0 1 1 0-2h6V1a1 1 0 0 1 1-1z"/>
              </svg>
              {profile.emergency}
            </p>
          )}
        </div>
        <button className="edit-btn" onClick={handleEditRedirect}>
          Edit Profile
        </button>
      </div>

      {/* overview */}
      <div className="overview-card">
        <div className="overview-item">
          <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
            <path d="M3 14s-1 0-1-1 1-4 6-4 6 3 6 4-1 1-1 1H3zm5-6a3 3 0 1 0-6 0 3 3 0 0 0 6 0z"/>
          </svg>
          <div className="text">
            <div className="label">Patient ID</div>
            <div className="value">{profile.id || '—'}</div>
          </div>
        </div>
        <div className="overview-item">
          <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
            <path d="M3.5 0a.5.5 0 0 0 0 1H4v1h8V1h.5a.5.5 0 0 0 0-1h-9zM11 4H5v1h6V4zm1 0V3h1a1 1 0 0 0 0-2H13v1H3V1H2a1 1 0 0 0 0 2h1v1h1v1H3v1h10V5h-1v-1z"/>
          </svg>
          <div className="text">
            <div className="label">Date of birth</div>
            <div className="value">{profile.dob || '—'}</div>
          </div>
        </div>
        <div className="overview-item">
          <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
            <path d="M8 1.9c1.12 0 2 .9 2 2v2H6V3.9c0-1.1.88-2 2-2z"/>
            <path d="M4.5 9.5a3.5 3.5 0 0 1 7 0v3.5H4.5V9.5z"/>
          </svg>
          <div className="text">
            <div className="label">Blood group</div>
            <div className="value badge">{profile.blood || '—'}</div>
          </div>
        </div>
        <div className="overview-item">
          <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
            <path d="M2 2h12v2H2V2zm0 3h12v1H2V5zm0 2h12v1H2V7zm0 2h12v1H2V9zm0 2h12v1H2v-1z"/>
          </svg>
          <div className="text">
            <div className="label">Medications</div>
            <div className="value medications">
              {(profile.medications || []).map((m,i)=>(
                <span key={i} className="med-tag">{m}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <svg width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
            <path d="M8 0a4 4 0 0 0-4 4v4a4 4 0 1 0 8 0V4a4 4 0 0 0-4-4z"/>
          </svg>
          <div className="stat-value">{profile.blood || '-'}</div>
          <div className="stat-label">Blood</div>
        </div>
        <div className="stat-card">
          <svg width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
            <path d="M8 0a5 5 0 0 0-5 5v6h10V5a5 5 0 0 0-5-5z"/>
          </svg>
          <div className="stat-value">{profile.height || '-'}</div>
          <div className="stat-label">Height</div>
        </div>
        <div className="stat-card">
          <svg width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
            <path d="M8 0a6 6 0 0 0-6 6v4h12V6a6 6 0 0 0-6-6z"/>
          </svg>
          <div className="stat-value">{profile.weight || '-'}</div>
          <div className="stat-label">Weight</div>
        </div>
        <div className="stat-card">
          <svg width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
            <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm0 1a6 6 0 1 1 0 12A6 6 0 0 1 8 2z"/>
          </svg>
          <div className="stat-value">{profile.bpm || '-'}</div>
          <div className="stat-label">BPM</div>
        </div>
      </div>

      {/* actions */}
      <div className="actions-grid">
        {[
          { title: 'My Appointments', desc: 'View upcoming sessions', route: '/patient/appointments' },
          { title: 'My Consultations', desc: 'Chat with doctors', route: '/patient/chatbot' },
          { title: 'My Reports', desc: 'Check your results', route: '/patient/reports' },
          { title: 'My Prescriptions', desc: 'Medication details', route: '/patient/reports' },
          { title: 'Profile Settings', desc: 'Manage your info', route: '/patient/settings' }
        ].map((act,i)=>(
          <div key={i} className="action-card" onClick={()=>navigate(act.route)}>
            <div className="info">
              <svg width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                <circle cx="8" cy="8" r="8"/>
              </svg>
              <div className="text">
                <span className="title">{act.title}</span>
                <span className="desc">{act.desc}</span>
              </div>
            </div>
            <svg className="chevron" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path d="M6 4l4 4-4 4"/>
            </svg>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PatientProfile;
