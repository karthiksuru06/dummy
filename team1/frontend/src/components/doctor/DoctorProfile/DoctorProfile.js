import React, { useState, useEffect } from 'react';
import { FaUser, FaPhone, FaEnvelope, FaMapMarkerAlt, FaBriefcase } from 'react-icons/fa';
import './DoctorProfile.css';
import doctorService from '../../../services/doctorService';

const DoctorProfile = () => {
  const [profile, setProfile] = useState({
    name: '',
    specialty: '',
    experience: '',
    totalCases: 0,
    phone: '',
    email: '',
    clinicAddress: '',
    profilePicture: ''
  });

  const [availability, setAvailability] = useState({});
  const [loading, setLoading] = useState(true);
  const [doctorId, setDoctorId] = useState(null);

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user'));
    if (userData && (userData._id || userData.id)) {
      const id = userData._id || userData.id;
      setDoctorId(id);
      fetchDoctorProfile(id);
    } else {
      setLoading(false);
      alert('No doctor data found. Please login again.');
    }
  }, []);

  const fetchDoctorProfile = async (docId) => {
    try {
      setLoading(true);
      const response = await doctorService.getDoctorProfile(docId);
      const doctor = response.profile || response.doctor || response;

      setProfile({
        name: doctor.full_name
          ? `Dr. ${doctor.full_name} ${doctor.last_name || ''}`
          : doctor.name || 'Doctor',
        specialty: doctor.specialization || 'Not specified',
        experience: doctor.experience || 'N/A',
        totalCases: doctor.total_consultations || 0,
        phone: doctor.phone || '',
        email: doctor.email || '',
        clinicAddress: doctor.clinic_address || doctor.address || 'Not provided',
        profilePicture: doctor.profile_picture || ''
      });

      const days = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
      const timeSlots = ['8AM','9AM','10AM','11AM','12PM','1PM','2PM','3PM','4PM','5PM','6PM','7PM','8PM','9PM','10PM','11PM'];

      const formattedAvailability = {};
      days.forEach(day => {
        formattedAvailability[day] = {};
        timeSlots.forEach(time => {
          formattedAvailability[day][time] = false;
        });
      });

      if (doctor.availability_schedule) {
        doctor.availability_schedule.forEach(slot => {
          if (formattedAvailability[slot.day]) {
            formattedAvailability[slot.day][slot.time_slot] = slot.is_available;
          }
        });
      }

      setAvailability(formattedAvailability);

    } catch (error) {
      alert('Failed to load doctor profile.');
    } finally {
      setLoading(false);
    }
  };

  const timeSlots = ['8AM','9AM','10AM','11AM','12PM','1PM','2PM','3PM','4PM','5PM','6PM','7PM','8PM','9PM','10PM','11PM'];
  const days = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

  const toggleAvailability = (day, time) => {
    setAvailability(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [time]: !prev[day][time]
      }
    }));
  };

  const saveAvailability = async () => {
    try {
      if (!doctorId) return;

      const availabilityArray = [];
      Object.keys(availability).forEach(day => {
        Object.keys(availability[day]).forEach(timeSlot => {
          availabilityArray.push({
            day,
            time_slot: timeSlot,
            is_available: availability[day][timeSlot]
          });
        });
      });

      await doctorService.updateAvailability(doctorId, {
        availability_schedule: availabilityArray
      });

      alert('Availability updated successfully!');
    } catch (error) {
      alert('Failed to update availability');
    }
  };

  if (loading) {
    return (
      <div className="doctor-loading-container">
        <div className="doctor-loading-spinner"></div>
        <p>Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="doctor-profile">

      <div className="doctor-profile-header">
        <h1>My Profile</h1>
      </div>

      {/* Summary Card */}
      <div className="doctor-profile-summary-card">
        <div className="doctor-profile-image-section">
          {profile.profilePicture ? (
            <img
              src={profile.profilePicture}
              alt="Doctor"
              className="doctor-profile-image"
            />
          ) : (
            <div className="doctor-profile-image" style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '48px',
              fontWeight: 'bold'
            }}>
              {profile.name
                ? profile.name.split(' ').map(n => n[0]).join('').substring(0,2)
                : 'DR'}
            </div>
          )}
        </div>

        <div className="doctor-profile-info-section">
          <h2>{profile.name}</h2>
          <p className="doctor-specialty">{profile.specialty}</p>

          <div className="doctor-profile-stats">
            <div className="doctor-stat">
              <span className="doctor-stat-value">{profile.experience}</span>
              <span className="doctor-stat-label">Experience</span>
            </div>

            <div className="doctor-stat">
              <span className="doctor-stat-value">{profile.totalCases}</span>
              <span className="doctor-stat-label">Total Cases</span>
            </div>
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="doctor-profile-details-card">
        <h3>Personal & Professional Information</h3>

        <div className="doctor-details-grid">
          <div className="doctor-detail-item">
            <FaPhone className="doctor-detail-icon" />
            <div>
              <label>Mobile Number</label>
              <p>{profile.phone}</p>
            </div>
          </div>

          <div className="doctor-detail-item">
            <FaEnvelope className="doctor-detail-icon" />
            <div>
              <label>Email ID</label>
              <p>{profile.email}</p>
            </div>
          </div>

          <div className="doctor-detail-item">
            <FaMapMarkerAlt className="doctor-detail-icon" />
            <div>
              <label>Clinic Address</label>
              <p>{profile.clinicAddress}</p>
            </div>
          </div>

          <div className="doctor-detail-item">
            <FaBriefcase className="doctor-detail-icon" />
            <div>
              <label>Specialty</label>
              <p>{profile.specialty}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Availability */}
      <div className="doctor-availability-card">
        <h3>Availability Schedule</h3>

        <div className="doctor-availability-table">
          <div className="doctor-table-header">
            <div className="doctor-day-column">Day</div>
            {timeSlots.map(time => (
              <div key={time} className="doctor-time-column">{time}</div>
            ))}
          </div>

          {days.map(day => (
            <div key={day} className="doctor-table-row">
              <div className="doctor-day-column">{day}</div>

              {timeSlots.map(time => (
                <div key={time} className="doctor-time-column">
                  <input
                    type="checkbox"
                    checked={availability[day]?.[time] || false}
                    onChange={() => toggleAvailability(day, time)}
                    className="doctor-availability-checkbox"
                  />
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className="doctor-availability-actions">
          <button className="doctor-btn-save" onClick={saveAvailability}>
            Save Availability
          </button>

          <button
            className="doctor-btn-cancel"
            onClick={() => doctorId && fetchDoctorProfile(doctorId)}
          >
            Cancel
          </button>
        </div>
      </div>

    </div>
  );
};

export default DoctorProfile;