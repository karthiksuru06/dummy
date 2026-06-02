import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../../../api/axiosConfig';
import Header from '../PatientHeader/Header';
import BackButton from '../../common/BackButton/BackButton';
import './MyAppointments.css';

const MyAppointments = () => {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [filteredAppointments, setFilteredAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [, forceUpdate] = useState(0);
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);

  useEffect(() => {
    fetchAppointments();

    // Auto-refresh every 30 seconds to check for updates from doctor
    const intervalId = setInterval(() => {
      fetchAppointments();
    }, 30000); // 30 seconds

    return () => clearInterval(intervalId); // Cleanup on unmount
  }, []);

  useEffect(() => {
    filterAppointmentsByStatus();
  }, [filterStatus, appointments]);

  // Update the component every 10 seconds to refresh "last updated" display
  useEffect(() => {
    const displayUpdateInterval = setInterval(() => {
      // Force re-render to update the "last updated" text
      forceUpdate(n => n + 1);
    }, 10000); // 10 seconds

    return () => clearInterval(displayUpdateInterval);
  }, []);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      const patientId = userData.id || userData._id;

      if (!patientId) {
        console.error('No patient ID found');
        setLoading(false);
        return;
      }

      const response = await API.get(`/patient/${patientId}/appointments`);
      console.log('Appointments Response:', response.data);

      if (response.data && response.data.success) {
        const allAppointments = response.data.appointments || [];
        // Sort by date (newest first)
        allAppointments.sort((a, b) => new Date(b.appointment_date) - new Date(a.appointment_date));
        setAppointments(allAppointments);
        setFilteredAppointments(allAppointments);
        setLastUpdated(new Date()); // Update last refresh time
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      setLoading(false);
    }
  };

  const filterAppointmentsByStatus = () => {
    if (filterStatus === 'all') {
      setFilteredAppointments(appointments);
    } else {
      const filtered = appointments.filter(apt => apt.status === filterStatus);
      setFilteredAppointments(filtered);
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'scheduled':
        return 'status-badge scheduled';
      case 'pending':
        return 'status-badge pending';
      case 'completed':
        return 'status-badge completed';
      case 'cancelled':
        return 'status-badge cancelled';
      case 'rescheduled':
        return 'status-badge rescheduled';
      default:
        return 'status-badge';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatShortDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusCount = (status) => {
    return appointments.filter(apt => apt.status === status).length;
  };

  const formatLastUpdated = () => {
    const now = new Date();
    const diffMs = now - lastUpdated;
    const diffSecs = Math.floor(diffMs / 1000);

    if (diffSecs < 60) {
      return 'Just now';
    } else if (diffSecs < 120) {
      return '1 minute ago';
    } else if (diffSecs < 3600) {
      return `${Math.floor(diffSecs / 60)} minutes ago`;
    } else {
      return lastUpdated.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  const handleViewReport = (appointment) => {
    setSelectedPrescription(appointment);
    setShowPrescriptionModal(true);
  };

  const closePrescriptionModal = () => {
    setShowPrescriptionModal(false);
    setSelectedPrescription(null);
  };

  return (
    <div className="my-appointments-page">
      <Header />
      <div className="my-appointments-container">
        <div style={{ marginTop: '35px' }}>
          <BackButton />
        </div>
        <div className="page-header">
          <div>
            <h1>My Appointments</h1>
            <p style={{
              fontSize: '0.875rem',
              color: '#718096',
              marginTop: '0.5rem',
              fontWeight: '500'
            }}>
              🔄 Last updated: {formatLastUpdated()} • Auto-refreshes every 30 seconds
            </p>
          </div>
          <button
            className="book-new-btn"
            onClick={() => navigate('/patient/finddoctors')}
          >
            + Book New Appointment
          </button>
        </div>

        {/* Statistics Cards */}
        <div className="appointments-stats">
          <div className="stat-card total">
            <div className="stat-icon"></div>
            <div className="stat-info">
              <span className="stat-number">{appointments.length}</span>
              <span className="stat-label">Total</span>
            </div>
          </div>
          <div className="stat-card pending-stat">
            <div className="stat-icon"></div>
            <div className="stat-info">
              <span className="stat-number">{getStatusCount('pending')}</span>
              <span className="stat-label">Pending</span>
            </div>
          </div>
          <div className="stat-card scheduled-stat">
            <div className="stat-icon"></div>
            <div className="stat-info">
              <span className="stat-number">{getStatusCount('scheduled')}</span>
              <span className="stat-label">Scheduled</span>
            </div>
          </div>
          <div className="stat-card completed-stat">
            <div className="stat-icon"></div>
            <div className="stat-info">
              <span className="stat-number">{getStatusCount('completed')}</span>
              <span className="stat-label">Completed</span>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="filter-tabs">
          <button
            className={`filter-tab ${filterStatus === 'all' ? 'active' : ''}`}
            onClick={() => setFilterStatus('all')}
          >
            All ({appointments.length})
          </button>
          <button
            className={`filter-tab ${filterStatus === 'pending' ? 'active' : ''}`}
            onClick={() => setFilterStatus('pending')}
          >
            Pending ({getStatusCount('pending')})
          </button>
          <button
            className={`filter-tab ${filterStatus === 'scheduled' ? 'active' : ''}`}
            onClick={() => setFilterStatus('scheduled')}
          >
            Scheduled ({getStatusCount('scheduled')})
          </button>
          <button
            className={`filter-tab ${filterStatus === 'completed' ? 'active' : ''}`}
            onClick={() => setFilterStatus('completed')}
          >
            Completed ({getStatusCount('completed')})
          </button>
          <button
            className={`filter-tab ${filterStatus === 'cancelled' ? 'active' : ''}`}
            onClick={() => setFilterStatus('cancelled')}
          >
            Cancelled ({getStatusCount('cancelled')})
          </button>
        </div>

        {/* Appointments List */}
        <div className="appointments-list">
          {loading ? (
            <div className="loading-state">
              <div className="loader"></div>
              <p>Loading appointments...</p>
            </div>
          ) : filteredAppointments.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon"></div>
              <h3>No appointments found</h3>
              <p>
                {filterStatus === 'all'
                  ? "You haven't booked any appointments yet."
                  : `No ${filterStatus} appointments.`}
              </p>
              <button
                className="book-appointment-btn"
                onClick={() => navigate('/patient/finddoctors')}
              >
                Book Your First Appointment
              </button>
            </div>
          ) : (
            filteredAppointments.map((appointment) => (
              <div key={appointment._id} className="appointment-card">
                <div className="appointment-header">
                  <div className="doctor-info">
                    <div className="doctor-avatar">
                      {appointment.doctor_id?.full_name?.[0] || 'D'}
                      {appointment.doctor_id?.last_name?.[0] || 'R'}
                    </div>
                    <div className="doctor-details">
                      <h3>Dr. {appointment.doctor_id?.full_name} {appointment.doctor_id?.last_name}</h3>
                      <p className="specialization">{appointment.doctor_id?.specialization || 'General Medicine'}</p>
                      {appointment.doctor_id?.clinic_name && (
                        <p className="clinic-name">{appointment.doctor_id.clinic_name}</p>
                      )}
                    </div>
                  </div>
                  <div className="header-right">
                    <div className={getStatusBadgeClass(appointment.status)}>
                      {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                    </div>
                    <div className="appointment-date-pill">{formatShortDate(appointment.appointment_date)}</div>
                  </div>
                </div>

                <div className="appointment-body">
                  <div className="appointment-info-grid">
                    <div className="info-item combined-line">
                      <span className="info-value">Date: {formatShortDate(appointment.appointment_date)}, Time: {appointment.appointment_time}</span>
                    </div>
                    <div className="info-item combined-line">
                      <span className="info-value">Type: {appointment.service_type} Reason: {appointment.reason || 'General Consultation'}</span>
                    </div>
                  </div>

                  {appointment.meeting_link && appointment.status === 'scheduled' && (
                    <div className="meeting-link-section">
                      <p className="meeting-label">Meeting Link:</p>
                      <a
                        href={appointment.meeting_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="meeting-link-btn"
                      >
                        Join Meeting
                      </a>
                    </div>
                  )}

                  {appointment.meeting_notes && (
                    <div className="notes-section">
                      <p className="notes-label">📌 Notes:</p>
                      <p className="notes-text">{appointment.meeting_notes}</p>
                    </div>
                  )}

                  {appointment.cancellation_reason && appointment.status === 'cancelled' && (
                    <div className="cancellation-section">
                      <p className="cancellation-label">Cancellation Reason:</p>
                      <p className="cancellation-text">{appointment.cancellation_reason}</p>
                    </div>
                  )}
                </div>

                <div className="appointment-footer">
                  <div className="appointment-id">ID: {appointment._id}</div>
                  <div className="appointment-actions">
                    {appointment.status === 'scheduled' && appointment.meeting_link && (
                      <button 
                        className="action-btn primary"
                        onClick={() => window.open(appointment.meeting_link, '_blank')}
                      >
                        Join Consultation
                      </button>
                    )}
                    {appointment.status === 'completed' && (
                      <button
                        className="action-btn secondary"
                        onClick={() => handleViewReport(appointment)}
                      >
                        View Report
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Prescription Modal */}
        {showPrescriptionModal && selectedPrescription && (
          <div className="prescription-modal-overlay" onClick={closePrescriptionModal}>
            <div className="prescription-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Prescription & Medical Report</h2>
                <button className="close-btn" onClick={closePrescriptionModal}>
                  ✕
                </button>
              </div>

              <div className="modal-body">
                <div className="appointment-summary">
                  <h3>Appointment Details</h3>
                  <div className="summary-grid">
                    <div className="summary-item">
                      <span className="label">Doctor:</span>
                      <span className="value">Dr. {selectedPrescription.doctor_id?.full_name} {selectedPrescription.doctor_id?.last_name}</span>
                    </div>
                    <div className="summary-item">
                      <span className="label">Date:</span>
                      <span className="value">{formatShortDate(selectedPrescription.appointment_date)}</span>
                    </div>
                    <div className="summary-item">
                      <span className="label">Time:</span>
                      <span className="value">{selectedPrescription.appointment_time}</span>
                    </div>
                    <div className="summary-item">
                      <span className="label">Type:</span>
                      <span className="value">{selectedPrescription.service_type}</span>
                    </div>
                  </div>
                </div>

                {selectedPrescription.prescription && (
                  <div className="prescription-section">
                    <h3>Prescription</h3>
                    <div className="prescription-content">
                      {selectedPrescription.prescription.medicines && selectedPrescription.prescription.medicines.length > 0 ? (
                        <div className="medicines-list">
                          <h4>Prescribed Medicines</h4>
                          {selectedPrescription.prescription.medicines.map((medicine, index) => (
                            <div key={index} className="medicine-item">
                              <div className="medicine-header">
                                <span className="medicine-number">{index + 1}</span>
                                <span className="medicine-name">{medicine.name}</span>
                              </div>
                              <div className="medicine-details">
                                <div className="detail-row">
                                  <span className="detail-label">Dosage:</span>
                                  <span className="detail-value">{medicine.dosage}</span>
                                </div>
                                <div className="detail-row">
                                  <span className="detail-label">Frequency:</span>
                                  <span className="detail-value">{medicine.frequency}</span>
                                </div>
                                <div className="detail-row">
                                  <span className="detail-label">Duration:</span>
                                  <span className="detail-value">{medicine.duration}</span>
                                </div>
                                {medicine.instructions && (
                                  <div className="detail-row">
                                    <span className="detail-label">Instructions:</span>
                                    <span className="detail-value">{medicine.instructions}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="no-data">No medicines prescribed</p>
                      )}

                      {selectedPrescription.prescription.diagnosis && (
                        <div className="diagnosis-section">
                          <h4>Diagnosis</h4>
                          <p className="diagnosis-text">{selectedPrescription.prescription.diagnosis}</p>
                        </div>
                      )}

                      {selectedPrescription.prescription.notes && (
                        <div className="notes-section">
                          <h4>Doctor's Notes</h4>
                          <p className="notes-text">{selectedPrescription.prescription.notes}</p>
                        </div>
                      )}

                      {selectedPrescription.prescription.follow_up_date && (
                        <div className="followup-section">
                          <h4>Follow-up</h4>
                          <p className="followup-date">{formatShortDate(selectedPrescription.prescription.follow_up_date)}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {!selectedPrescription.prescription && (
                  <div className="no-prescription">
                    <div className="no-prescription-icon"></div>
                    <h3>No Prescription Available</h3>
                    <p>The doctor hasn't added a prescription for this appointment yet.</p>
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button className="print-btn" onClick={() => window.print()}>
                  🖨️ Print Prescription
                </button>
                <button className="close-modal-btn" onClick={closePrescriptionModal}>
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyAppointments;
