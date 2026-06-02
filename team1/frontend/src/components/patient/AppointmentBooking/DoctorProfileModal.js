import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../../../api/axiosConfig';
import ClinicLocationMap from './ClinicLocationMap';
import './DoctorProfileModal.css';

const DoctorProfileModal = ({ doctor, onClose }) => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: Profile, 2: Slots, 3: Form, 4: Confirmation
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('');
  const [consultationType, setConsultationType] = useState(doctor.availability || 'Offline');
  const [formData, setFormData] = useState({
    reason: '',
    symptoms: '',
    notes: ''
  });
  const [validationErrors, setValidationErrors] = useState({
    reason: ''
  });
  const [bookingConfirmed, setBookingConfirmed] = useState(false);
  const [appointmentId, setAppointmentId] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Generate next 7 days for date selection
  const generateDates = () => {
    const dates = [];
    const today = new Date();
    for (let i = 1; i <= 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push({
        value: date.toISOString().split('T')[0],
        label: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
      });
    }
    return dates;
  };

  const dates = generateDates();

  // Fetch available slots when date is selected
  useEffect(() => {
    const fetchAvailableSlots = async () => {
      if (!selectedDate || !doctor.id) return;

      try {
        setLoadingSlots(true);

        // Fetch available slots from backend API
        const response = await API.get(`/doctors/${doctor.id}/slots`, {
          params: {
            date: selectedDate,
            consultationType: consultationType
          }
        });

        if (response.data && response.data.success) {
          setAvailableSlots(response.data.slots || []);
        } else if (Array.isArray(response.data)) {
          setAvailableSlots(response.data);
        } else {
          // Fallback to doctor's default slots if API doesn't return specific slots
          setAvailableSlots(doctor.availableSlots || []);
        }

        setLoadingSlots(false);
      } catch (error) {
        console.error('Error fetching available slots:', error);
        setLoadingSlots(false);

        // Fallback to default slots on error
        if (doctor.availableSlots && doctor.availableSlots.length > 0) {
          setAvailableSlots(doctor.availableSlots);
        } else {
          // Default time slots if no slots available
          setAvailableSlots(['9:00 AM', '11:00 AM', '2:00 PM', '4:00 PM']);
        }
      }
    };

    fetchAvailableSlots();
  }, [selectedDate, consultationType, doctor.id, doctor.availableSlots]);

  const handleSlotSelect = (slot) => {
    setSelectedSlot(slot);
    setStep(3);
  };

  const validateReason = (value) => {
    if (!value || value.trim().length === 0) {
      return "Reason for appointment is required";
    }
    if (value.trim().length < 10) {
      return "Please provide at least 10 characters for meaningful description";
    }
    return "";
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;

    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Validate reason field
    if (name === 'reason') {
      setValidationErrors(prev => ({
        ...prev,
        reason: validateReason(value)
      }));
    }
  };

  const handleBookAppointment = async () => {
    // Validate reason before booking
    const reasonError = validateReason(formData.reason);
    if (reasonError) {
      setValidationErrors({ reason: reasonError });
      alert('Please provide a valid reason for appointment (minimum 10 characters)');
      return;
    }

    try {
      // Get patient ID from localStorage or auth context
      const patientData = JSON.parse(localStorage.getItem('user') || '{}');
      const patientId = patientData.id || patientData._id;

      // Map consultation type to service type enum
      const serviceTypeMap = {
        'Online': 'Video Consultation',
        'Offline': 'In-Person Consultation'
      };
      const serviceType = serviceTypeMap[consultationType] || 'In-Person Consultation';

      // Book appointment via backend API
      const response = await API.post('/appointments/book', {
        doctorId: doctor.id || doctor._id,
        patientId: patientId,
        doctorName: doctor.name,
        patientName: patientData.full_name || patientData.name || 'Patient',
        date: selectedDate,
        time: selectedSlot,
        consultationType: serviceType,
        reason: formData.reason,
        symptoms: formData.symptoms,
        notes: formData.notes,
        status: 'pending'
      });

      if (response.data && response.data.success) {
        const bookedAppointmentId = response.data.appointmentId || response.data.data?.id || `APT-${Date.now()}`;
        setAppointmentId(bookedAppointmentId);
        setBookingConfirmed(true);
        setStep(4);
        // Notification is already created in the backend
      } else {
        // Fallback for non-standard response format
        const appointmentId = response.data?.appointmentId || `APT-${Date.now()}`;
        setAppointmentId(appointmentId);
        setBookingConfirmed(true);
        setStep(4);
      }
    } catch (error) {
      console.error('Error booking appointment:', error);

      // Detailed error logging
      if (error.response) {
        console.error('Server Error:', error.response.status, error.response.data);
        alert(`Failed to book appointment: ${error.response.data.message || 'Server error'}`);
      } else if (error.request) {
        console.error('Network Error: No response from server');
        alert('Network error. Please check your connection and try again.');
      } else {
        console.error('Error:', error.message);
        alert('Failed to book appointment. Please try again.');
      }
    }
  };

  const handleDownloadSummary = () => {
    const summary = `
APPOINTMENT SUMMARY
===================

Appointment ID: ${appointmentId}
Doctor: ${doctor.name || 'Doctor Name'}
Specialization: ${doctor.specialization || 'General Medicine'}
Date: ${selectedDate}
Time: ${selectedSlot}
Type: ${consultationType}

Patient Details:
Reason: ${formData.reason}
Symptoms: ${formData.symptoms}

Notes: ${formData.notes || 'None'}

Status: PENDING CONFIRMATION
==========================================
Thank you for choosing MEDviz!
    `;

    const blob = new Blob([summary], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `appointment-${appointmentId}.txt`;
    link.click();
  };

  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(<span key={i} className="star filled">★</span>);
    }
    if (hasHalfStar) {
      stars.push(<span key="half" className="star half">★</span>);
    }
    const emptyStars = 5 - stars.length;
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<span key={`empty-${i}`} className="star empty">★</span>);
    }
    return stars;
  };

  return (
    <div className="modal-overlay doctor-profile-overlay" onClick={onClose}>
      <div className="doctor-profile-modal" onClick={(e) => e.stopPropagation()}>
        <div className="doctor-modal-header-bar">
          <span className="doctor-modal-step-label">
            {step === 1 ? 'Doctor Profile' : step === 2 ? 'Select Slot' : step === 3 ? 'Confirm Details' : 'Booking Confirmed'}
          </span>
          <button className="modal-close-btn" onClick={onClose}>×</button>
        </div>
        <div className="doctor-modal-scroll-body">

        {/* Step 1: Doctor Profile */}
        {step === 1 && (
          <div className="profile-view">
            <div className="profile-header">
              <div className="doctor-avatar-modal">
                <span className="avatar-initials-modal">
                  {(doctor.name || 'DR').split(' ').map(n => n[0]).join('')}
                </span>
              </div>
              <div>
                <h2>{doctor.name || 'Doctor Name'}</h2>
                <p className="specialization-modal">{doctor.specialization || 'General Medicine'}</p>
                <p className="qualification-modal">{doctor.qualification || 'MBBS'}</p>
              </div>
            </div>

            <div className="profile-stats">
              <div className="stat-box">
                <span className="stat-value">{doctor.experience || 'N/A'}</span>
                <span className="stat-label">Experience</span>
              </div>
              <div className="stat-box">
                <span className="stat-value">{doctor.rating || 0}</span>
                <span className="stat-label">Rating</span>
              </div>
              <div className="stat-box">
                <span className="stat-value">{doctor.reviews || 0}</span>
                <span className="stat-label">Reviews</span>
              </div>
            </div>

            <div className="profile-section">
              <h3>About Doctor</h3>
              <p>{doctor.about || 'No information available'}</p>
            </div>

            <div className="profile-section">
              <h3>Details</h3>
              <div className="detail-row">
                <span className="detail-label">Location:</span>
                <span>{doctor.location || 'N/A'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Availability:</span>
                <span className={`badge-${(doctor.availability || 'offline').toLowerCase()}`}>
                  {doctor.availability || 'Offline'}
                </span>
              </div>
            </div>

            <div className="profile-section">
              <h3>Patient Reviews</h3>
              <div className="rating-display">
                <div className="stars-large">
                  {renderStars(doctor.rating)}
                </div>
                <span className="rating-text-large">
                  {doctor.rating} out of 5 ({doctor.reviews} reviews)
                </span>
              </div>
            </div>

            <button
              className="btn-primary-large"
              onClick={() => setStep(2)}
            >
              Proceed to Book Appointment
            </button>
          </div>
        )}

        {/* Step 2: Available Slots */}
        {step === 2 && (
          <div className="slots-view">
            <button className="back-btn" onClick={() => setStep(1)}>
              ← Back to Profile
            </button>

            <h2>Select Appointment Date & Time</h2>
            <p className="subtitle">Choose a convenient date and time slot</p>

            <div className="consultation-type">
              <label>Consultation Type:</label>
              <div className="type-options">
                {(doctor.availability || '').toLowerCase() === 'online' && (
                  <button
                    className={`type-btn ${consultationType === 'Online' ? 'active' : ''}`}
                    onClick={() => setConsultationType('Online')}
                  >
                    Online
                  </button>
                )}
                <button
                  className={`type-btn ${consultationType === 'Offline' ? 'active' : ''}`}
                  onClick={() => setConsultationType('Offline')}
                >
                  In-Person
                </button>
              </div>
            </div>

            <div className="date-selection">
              <h3>Select Date</h3>
              <div className="dates-grid">
                {dates.map(date => (
                  <button
                    key={date.value}
                    className={`date-btn ${selectedDate === date.value ? 'selected' : ''}`}
                    onClick={() => setSelectedDate(date.value)}
                  >
                    {date.label}
                  </button>
                ))}
              </div>
            </div>

            {selectedDate && (
              <div className="slots-selection">
                <h3>Available Time Slots</h3>
                {loadingSlots ? (
                  <div className="loading-state">
                    <div className="loader"></div>
                    <p>Loading available slots...</p>
                  </div>
                ) : availableSlots.length > 0 ? (
                  <div className="slots-grid">
                    {availableSlots.map((slot, index) => (
                      <button
                        key={index}
                        className="slot-btn"
                        onClick={() => handleSlotSelect(slot)}
                      >
                        <span className="slot-time">{slot}</span>
                        <span className="slot-status">Available</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="no-slots-message">No available slots for this date. Please select another date.</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Booking Form */}
        {step === 3 && (
          <div className="booking-form-view">
            <button className="back-btn" onClick={() => setStep(2)}>
              ← Back to Slots
            </button>

            <h2>Confirm Appointment Details</h2>
            <p className="subtitle">Please provide additional information</p>

            <div className="summary-box">
              <h3>Appointment Summary</h3>
              <div className="summary-item">
                <span className="summary-label">Doctor:</span>
                <span>{doctor.name || 'Doctor Name'}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Date:</span>
                <span>{selectedDate}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Time:</span>
                <span>{selectedSlot}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Type:</span>
                <span>{consultationType}</span>
              </div>
              {(consultationType === 'Offline' || consultationType === 'In-Person' || consultationType === 'In-Person Consultation') && (
                <>
                  <div className="summary-item">
                    <span className="summary-label">Clinic:</span>
                    <span>{doctor.clinic_name || 'N/A'}</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Location:</span>
                    <span>{doctor.clinic_address || doctor.address || 'N/A'}</span>
                  </div>
                </>
              )}
            </div>

            {(consultationType === 'Offline' || consultationType === 'In-Person' || consultationType === 'In-Person Consultation') && (
              <div className="clinic-reminder-box">
                <div className="reminder-icon">📍</div>
                <div className="reminder-text">
                  <strong>In-Person Consultation</strong>
                  <p>This appointment will be at the clinic. Please arrive 10 minutes early.</p>
                </div>
              </div>
            )}

            <div className="form-section">
              <div className="form-group">
                <label>Reason for Appointment *</label>
                <textarea
                  name="reason"
                  value={formData.reason}
                  onChange={handleFormChange}
                  placeholder="Please describe what you are suffering from or why you seek consultation (minimum 10 characters)..."
                  rows="3"
                  required
                  className={validationErrors.reason ? 'error-input' : ''}
                />
                {validationErrors.reason && (
                  <span className="validation-error">{validationErrors.reason}</span>
                )}
                <span className="character-count">
                  {formData.reason.length} characters (minimum 10 required)
                </span>
              </div>

              <div className="form-group">
                <label>Symptoms (if any) *</label>
                <textarea
                  name="symptoms"
                  value={formData.symptoms}
                  onChange={handleFormChange}
                  placeholder="Describe your symptoms..."
                  rows="4"
                  required
                />
              </div>

              <div className="form-group">
                <label>Additional Notes</label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleFormChange}
                  placeholder="Any other information you'd like to share..."
                  rows="3"
                />
              </div>
            </div>

            <div className="form-actions">
              <button className="btn-secondary" onClick={() => setStep(2)}>
                Cancel
              </button>
              <button
                className="btn-primary-large"
                onClick={handleBookAppointment}
                disabled={!formData.reason || formData.reason.length < 10 || !formData.symptoms}
              >
                Confirm Booking
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Booking Confirmation */}
        {step === 4 && bookingConfirmed && (
          <div className="confirmation-view">
            <div className="success-icon">✓</div>
            <h2>Appointment Booked Successfully!</h2>
            <p className="success-message">
              Your appointment has been scheduled and your details have been sent to the doctor.
            </p>
            <div className="confirmation-notice">
              <strong>Confirmation Sent!</strong>
              <p>The doctor has received your appointment request including your reason for consultation. You will be notified once the doctor confirms the appointment.</p>
            </div>

            <div className="confirmation-box">
              <h3>Appointment Details</h3>
              <div className="confirmation-item">
                <span className="conf-label">Appointment ID:</span>
                <span className="conf-value">{appointmentId}</span>
              </div>
              <div className="confirmation-item">
                <span className="conf-label">Doctor:</span>
                <span className="conf-value">{doctor.name}</span>
              </div>
              <div className="confirmation-item">
                <span className="conf-label">Specialization:</span>
                <span className="conf-value">{doctor.specialization}</span>
              </div>
              <div className="confirmation-item">
                <span className="conf-label">Date:</span>
                <span className="conf-value">{selectedDate}</span>
              </div>
              <div className="confirmation-item">
                <span className="conf-label">Time:</span>
                <span className="conf-value">{selectedSlot}</span>
              </div>
              <div className="confirmation-item">
                <span className="conf-label">Type:</span>
                <span className="conf-value">{consultationType}</span>
              </div>
              <div className="confirmation-item">
                <span className="conf-label">Reason:</span>
                <span className="conf-value">{formData.reason}</span>
              </div>
              <div className="confirmation-item">
                <span className="conf-label">Status:</span>
                <span className="status-pending">Pending Confirmation</span>
              </div>
            </div>

            {/* Show clinic location map for offline/in-person consultations */}
            {(consultationType === 'Offline' || consultationType === 'In-Person' || consultationType === 'In-Person Consultation') && (
              <ClinicLocationMap
                clinicName={doctor.clinic_name || 'Clinic'}
                clinicAddress={doctor.clinic_address || doctor.address || 'Address not available'}
                doctorName={doctor.name}
              />
            )}

            <div className="info-box">
              <p>A confirmation email has been sent to your registered email address.</p>
              <p>You will receive a notification once the doctor confirms your appointment.</p>
              {(consultationType === 'Offline' || consultationType === 'In-Person' || consultationType === 'In-Person Consultation') && (
                <p><strong>Note:</strong> This is an in-person consultation. Please visit the clinic at the location shown above.</p>
              )}
            </div>

            <div className="confirmation-actions">
              <button className="btn-outline" onClick={handleDownloadSummary}>
                Download Summary
              </button>
              <button className="btn-outline" onClick={onClose}>
                Print
              </button>
              <button
                className="btn-primary-large"
                onClick={() => {
                  onClose();
                  navigate('/patient/dashboard');
                }}
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        )}

        </div>{/* end doctor-modal-scroll-body */}
      </div>
    </div>
  );
};

export default DoctorProfileModal;
