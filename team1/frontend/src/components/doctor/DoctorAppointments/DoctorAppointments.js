import React, { useState, useEffect } from 'react';
import {
  FaCalendarAlt,
  FaClock,
  FaUser,
  FaCheckCircle,
  FaTimesCircle,
  FaVideo,
  FaEdit,
  FaBan,
  FaPrescription,
  FaNotesMedical,
  FaPlus,
  FaTrash,
  FaSave
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import './DoctorAppointments.css';
import doctorService from '../../../services/doctorService';

const DoctorAppointments = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [appointments, setAppointments] = useState({
    overview: [],
    scheduled: [],
    rescheduled: [],
    cancelled: [],
    completed: []
  });
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [doctorId, setDoctorId] = useState(null);

  // Meeting form state
  const [meetingForm, setMeetingForm] = useState({
    meetingLink: '',
    date: '',
    time: '',
    notes: ''
  });

  // Prescription form state
  const [prescriptionForm, setPrescriptionForm] = useState({
    patientName: '',
    age: '',
    gender: '',
    diagnosis: '',
    medicines: [{ name: '', dosage: '', duration: '', notes: '' }],
    tests: '',
    advice: ''
  });

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user'));
    if (userData) {
      const id = userData._id || userData.id;
      setDoctorId(id);
      fetchAppointments(id);
    }
  }, []);

  const fetchAppointments = async (docId) => {
    try {
      setLoading(true);

      // Fetch all appointments for doctor
      const response = await doctorService.getAllAppointments(docId);
      const allAppointments = response.appointments || [];

      // Group appointments by status
      const groupedAppointments = {
        overview: allAppointments, // Show all appointments in overview
        scheduled: allAppointments.filter(apt => apt.status === 'scheduled'),
        rescheduled: allAppointments.filter(apt => apt.status === 'rescheduled'),
        cancelled: allAppointments.filter(apt => apt.status === 'cancelled'),
        completed: allAppointments.filter(apt => apt.status === 'completed')
      };

      // Format appointments for display
      const formatAppointment = (apt) => ({
        id: apt._id,
        patientName: apt.patient_name,
        service: apt.service_type,
        date: new Date(apt.appointment_date).toLocaleDateString(),
        time: apt.appointment_time,
        status: apt.status,
        reason: apt.reason || 'No reason provided',
        meetingLink: apt.meeting_link || '',
        notes: apt.meeting_notes || '',
        cancelReason: apt.cancellation_reason || '',
        originalDate: apt.original_date ? new Date(apt.original_date).toLocaleDateString() : null,
        hasPrescription: false // Will be checked separately if needed
      });

      setAppointments({
        overview: groupedAppointments.overview.map(formatAppointment),
        scheduled: groupedAppointments.scheduled.map(formatAppointment),
        rescheduled: groupedAppointments.rescheduled.map(formatAppointment),
        cancelled: groupedAppointments.cancelled.map(formatAppointment),
        completed: groupedAppointments.completed.map(formatAppointment)
      });

    } catch (error) {
      console.error('Error fetching appointments:', error.message);
      // Set empty arrays on error
      setAppointments({
        overview: [],
        scheduled: [],
        rescheduled: [],
        cancelled: [],
        completed: []
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptAppointment = (appointment) => {
    setSelectedAppointment(appointment);
    setMeetingForm({
      meetingLink: '',
      date: appointment.date,
      time: appointment.time,
      notes: ''
    });
    setShowMeetingModal(true);
  };

  const handleRejectAppointment = async (appointmentId) => {
    try {
      const reason = prompt('Please enter rejection reason:');
      if (reason) {
        await doctorService.rejectAppointment(appointmentId, { reason });
        toast.success('Appointment rejected successfully');
        if (doctorId) {
          fetchAppointments(doctorId);
        }
      }
    } catch (error) {
      console.error('Error rejecting appointment:', error.message);
      toast.error('Failed to reject appointment');
    }
  };

  const handleSubmitMeeting = async (e) => {
    e.preventDefault();
    try {
      if (!selectedAppointment) return;

      await doctorService.approveAppointment(selectedAppointment.id, {
        meeting_link: meetingForm.meetingLink,
        meeting_notes: meetingForm.notes
      });

      toast.success('Appointment approved and meeting scheduled successfully');
      setShowMeetingModal(false);

      // Reset form
      setMeetingForm({
        meetingLink: '',
        date: '',
        time: '',
        notes: ''
      });

      if (doctorId) {
        fetchAppointments(doctorId);
      }
    } catch (error) {
      console.error('Error creating meeting:', error.message);
      toast.error('Failed to approve appointment');
    }
  };

  const handleReschedule = async (appointment) => {
    try {
      const newDate = prompt('Enter new date (YYYY-MM-DD):');
      const newTime = prompt('Enter new time (e.g., 10:00 AM):');

      if (newDate && newTime) {
        // Validate formats before sending — a malformed date/time was stored
        // verbatim and then broke the alert/auto-complete jobs that parse it.
        if (!/^\d{4}-\d{2}-\d{2}$/.test(newDate.trim()) || isNaN(Date.parse(newDate.trim()))) {
          toast.error('Please enter a valid date in YYYY-MM-DD format.');
          return;
        }
        if (!/^\d{1,2}:\d{2}\s*(AM|PM)$/i.test(newTime.trim())) {
          toast.error('Please enter a valid time like "10:00 AM".');
          return;
        }
        await doctorService.rescheduleAppointment(appointment.id, {
          new_date: newDate,
          new_time: newTime
        });
        toast.success('Appointment rescheduled successfully');
        if (doctorId) {
          fetchAppointments(doctorId);
        }
      }
    } catch (error) {
      console.error('Error rescheduling appointment:', error.message);
      toast.error('Failed to reschedule appointment');
    }
  };

  const handleCancel = async (appointmentId) => {
    try {
      const reason = prompt('Please enter cancellation reason:');
      if (reason) {
        await doctorService.cancelAppointment(appointmentId, { reason });
        toast.success('Appointment cancelled successfully');
        if (doctorId) {
          fetchAppointments(doctorId);
        }
      }
    } catch (error) {
      console.error('Error cancelling appointment:', error.message);
      toast.error('Failed to cancel appointment');
    }
  };

  const handleGivePrescription = (appointment) => {
    setSelectedAppointment(appointment);
    setPrescriptionForm({
      patientName: appointment.patientName,
      age: '',
      gender: '',
      diagnosis: '',
      medicines: [{ name: '', dosage: '', duration: '', notes: '' }],
      tests: '',
      advice: ''
    });
    setShowPrescriptionModal(true);
  };

  const addMedicine = () => {
    setPrescriptionForm({
      ...prescriptionForm,
      medicines: [...prescriptionForm.medicines, { name: '', dosage: '', duration: '', notes: '' }]
    });
  };

  const removeMedicine = (index) => {
    const updatedMedicines = prescriptionForm.medicines.filter((_, i) => i !== index);
    setPrescriptionForm({ ...prescriptionForm, medicines: updatedMedicines });
  };

  const updateMedicine = (index, field, value) => {
    const updatedMedicines = [...prescriptionForm.medicines];
    updatedMedicines[index][field] = value;
    setPrescriptionForm({ ...prescriptionForm, medicines: updatedMedicines });
  };

  const handleSubmitPrescription = async (e) => {
    e.preventDefault();
    try {
      if (!selectedAppointment) return;

      const userData = JSON.parse(localStorage.getItem('user'));
      const prescriptionData = {
        appointment_id: selectedAppointment.id,
        doctor_id: userData._id || userData.id,
        patient_name: prescriptionForm.patientName,
        patient_age: prescriptionForm.age,
        patient_gender: prescriptionForm.gender,
        diagnosis: prescriptionForm.diagnosis,
        medicines: prescriptionForm.medicines.map(med => ({
          medicine_name: med.name,
          dosage: med.dosage,
          duration: med.duration,
          notes: med.notes
        })),
        tests_recommended: prescriptionForm.tests,
        additional_advice: prescriptionForm.advice
      };

      await doctorService.createPrescription(prescriptionData);
      toast.success('Prescription created successfully');
      setShowPrescriptionModal(false);

      // Reset form
      setPrescriptionForm({
        patientName: '',
        age: '',
        gender: '',
        diagnosis: '',
        medicines: [{ name: '', dosage: '', duration: '', notes: '' }],
        tests: '',
        advice: ''
      });

      if (doctorId) {
        fetchAppointments(doctorId);
      }
    } catch (error) {
      console.error('Error saving prescription:', error.message);
      // Surface the server message (e.g. "A prescription already exists for
      // this appointment") instead of a generic failure.
      toast.error(error.response?.data?.message || 'Failed to save prescription');
    }
  };

  const renderTabContent = () => {
    const currentAppointments = appointments[activeTab] || [];

    if (currentAppointments.length === 0) {
      return (
        <div className="doctor-empty-appointments">
          <FaCalendarAlt className="doctor-empty-icon" />
          <h3>No appointments in this category</h3>
        </div>
      );
    }

    switch (activeTab) {
      case 'overview':
        return (
          <div className="doctor-appointments-list">
            {currentAppointments.map(appointment => {
              // Only show accept/reject buttons if appointment is pending
              const isPending = appointment.status === 'pending';

              // Get status display text and class
              const getStatusDisplay = (status) => {
                switch(status) {
                  case 'pending':
                    return { text: 'Pending Approval', className: 'pending' };
                  case 'scheduled':
                    return { text: 'Confirmed', className: 'confirmed' };
                  case 'rescheduled':
                    return { text: 'Rescheduled', className: 'rescheduled' };
                  case 'cancelled':
                    return { text: 'Cancelled', className: 'cancelled' };
                  case 'completed':
                    return { text: 'Completed', className: 'completed' };
                  default:
                    return { text: status, className: status };
                }
              };

              const statusInfo = getStatusDisplay(appointment.status);

              return (
                <div key={appointment.id} className="doctor-appointment-card">
                  <div className="doctor-appointment-header">
                    <div className="doctor-patient-info">
                      <FaUser className="doctor-patient-icon" />
                      <div>
                        <h3>{appointment.patientName}</h3>
                        <p className="doctor-service-type">{appointment.service}</p>
                      </div>
                    </div>
                    <div className={`doctor-appointment-status ${statusInfo.className}`}>
                      {statusInfo.text}
                    </div>
                  </div>
                  <div className="doctor-appointment-details">
                    <div className="doctor-detail-item">
                      <FaCalendarAlt /> {appointment.date}
                    </div>
                    <div className="doctor-detail-item">
                      <FaClock /> {appointment.time}
                    </div>
                    {appointment.meetingLink && appointment.status === 'scheduled' && (
                      <div className="doctor-detail-item">
                        <FaVideo /> <a href={appointment.meetingLink} target="_blank" rel="noopener noreferrer">Join Meeting</a>
                      </div>
                    )}
                  </div>

                  {/* Reason for Appointment Section */}
                  <div className="doctor-reason-section">
                    <div className="doctor-reason-header">
                      <strong>Reason for Appointment:</strong>
                    </div>
                    <p className="doctor-reason-text">{appointment.reason}</p>
                  </div>

                  {appointment.notes && appointment.status === 'scheduled' && (
                    <p className="doctor-appointment-notes">Notes: {appointment.notes}</p>
                  )}
                  {appointment.cancelReason && appointment.status === 'cancelled' && (
                    <p className="doctor-cancel-reason">Reason: {appointment.cancelReason}</p>
                  )}
                  {isPending && (
                    <div className="doctor-appointment-actions">
                      <button
                        className="doctor-action-btn doctor-accept-btn"
                        onClick={() => handleAcceptAppointment(appointment)}
                      >
                        <FaCheckCircle /> Accept
                      </button>
                      <button
                        className="doctor-action-btn doctor-reject-btn"
                        onClick={() => handleRejectAppointment(appointment.id)}
                      >
                        <FaTimesCircle /> Reject
                      </button>
                    </div>
                  )}
                  {appointment.status === 'scheduled' && (
                    <div className="doctor-appointment-actions">
                      <button
                        className="doctor-action-btn doctor-reschedule-btn"
                        onClick={() => handleReschedule(appointment)}
                      >
                        <FaEdit /> Reschedule
                      </button>
                      <button
                        className="doctor-action-btn doctor-cancel-btn"
                        onClick={() => handleCancel(appointment.id)}
                      >
                        <FaBan /> Cancel
                      </button>
                    </div>
                  )}
                  {appointment.status === 'completed' && (
                    <div className="doctor-appointment-actions">
                      {!appointment.hasPrescription ? (
                        <button
                          className="doctor-action-btn doctor-prescription-btn"
                          onClick={() => handleGivePrescription(appointment)}
                        >
                          <FaPrescription /> Give Prescription
                        </button>
                      ) : (
                        <button className="doctor-action-btn doctor-view-prescription-btn">
                          <FaNotesMedical /> View Prescription
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );

      case 'scheduled':
        return (
          <div className="doctor-appointments-list">
            {currentAppointments.map(appointment => (
              <div key={appointment.id} className="doctor-appointment-card">
                <div className="doctor-appointment-header">
                  <div className="doctor-patient-info">
                    <FaUser className="doctor-patient-icon" />
                    <div>
                      <h3>{appointment.patientName}</h3>
                      <p className="doctor-service-type">{appointment.service}</p>
                    </div>
                  </div>
                  <div className="doctor-appointment-status confirmed">
                    Confirmed
                  </div>
                </div>
                <div className="doctor-appointment-details">
                  <div className="doctor-detail-item">
                    <FaCalendarAlt /> {appointment.date}
                  </div>
                  <div className="doctor-detail-item">
                    <FaClock /> {appointment.time}
                  </div>
                  <div className="doctor-detail-item">
                    <FaVideo /> <a href={appointment.meetingLink} target="_blank" rel="noopener noreferrer">Join Meeting</a>
                  </div>
                </div>

                {/* Reason for Appointment Section */}
                <div className="doctor-reason-section">
                  <div className="doctor-reason-header">
                    <strong>Reason for Appointment:</strong>
                  </div>
                  <p className="doctor-reason-text">{appointment.reason}</p>
                </div>

                {appointment.notes && (
                  <p className="doctor-appointment-notes">Notes: {appointment.notes}</p>
                )}
                <div className="doctor-appointment-actions">
                  <button
                    className="doctor-action-btn doctor-reschedule-btn"
                    onClick={() => handleReschedule(appointment)}
                  >
                    <FaEdit /> Reschedule
                  </button>
                  <button
                    className="doctor-action-btn doctor-cancel-btn"
                    onClick={() => handleCancel(appointment.id)}
                  >
                    <FaBan /> Cancel
                  </button>
                </div>
              </div>
            ))}
          </div>
        );

      case 'completed':
        return (
          <div className="doctor-appointments-list">
            {currentAppointments.map(appointment => (
              <div key={appointment.id} className="doctor-appointment-card">
                <div className="doctor-appointment-header">
                  <div className="doctor-patient-info">
                    <FaUser className="doctor-patient-icon" />
                    <div>
                      <h3>{appointment.patientName}</h3>
                      <p className="doctor-service-type">{appointment.service}</p>
                    </div>
                  </div>
                  <div className="doctor-appointment-status completed">
                    Completed
                  </div>
                </div>
                <div className="doctor-appointment-details">
                  <div className="doctor-detail-item">
                    <FaCalendarAlt /> {appointment.date}
                  </div>
                  <div className="doctor-detail-item">
                    <FaClock /> {appointment.time}
                  </div>
                </div>

                {/* Reason for Appointment Section */}
                <div className="doctor-reason-section">
                  <div className="doctor-reason-header">
                    <strong>Reason for Appointment:</strong>
                  </div>
                  <p className="doctor-reason-text">{appointment.reason}</p>
                </div>

                <div className="doctor-appointment-actions">
                  {!appointment.hasPrescription ? (
                    <button
                      className="doctor-action-btn doctor-prescription-btn"
                      onClick={() => handleGivePrescription(appointment)}
                    >
                      <FaPrescription /> Give Prescription
                    </button>
                  ) : (
                    <button className="doctor-action-btn doctor-view-prescription-btn">
                      <FaNotesMedical /> View Prescription
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        );

      default:
        return (
          <div className="doctor-appointments-list">
            {currentAppointments.map(appointment => (
              <div key={appointment.id} className="doctor-appointment-card">
                <div className="doctor-appointment-header">
                  <div className="doctor-patient-info">
                    <FaUser className="doctor-patient-icon" />
                    <div>
                      <h3>{appointment.patientName}</h3>
                      <p className="doctor-service-type">{appointment.service}</p>
                    </div>
                  </div>
                  <div className={`doctor-appointment-status ${appointment.status}`}>
                    {appointment.status}
                  </div>
                </div>
                <div className="doctor-appointment-details">
                  <div className="doctor-detail-item">
                    <FaCalendarAlt /> {appointment.newDate || appointment.date}
                  </div>
                  <div className="doctor-detail-item">
                    <FaClock /> {appointment.time}
                  </div>
                </div>

                {/* Reason for Appointment Section */}
                {appointment.reason && (
                  <div className="doctor-reason-section">
                    <div className="doctor-reason-header">
                      <strong>Reason for Appointment:</strong>
                    </div>
                    <p className="doctor-reason-text">{appointment.reason}</p>
                  </div>
                )}

                {appointment.cancelReason && (
                  <p className="doctor-cancel-reason">Cancellation Reason: {appointment.cancelReason}</p>
                )}
              </div>
            ))}
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className="doctor-loading-container">
        <div className="doctor-loading-spinner"></div>
        <p>Loading appointments...</p>
      </div>
    );
  }

  return (
    <div className="doctor-appointments">
      <div className="doctor-appointments-header">
        <h1>Appointments Management</h1>
      </div>

      {/* Tabs */}
      <div className="doctor-appointments-tabs">
        {['overview', 'scheduled', 'rescheduled', 'cancelled', 'completed'].map(tab => (
          <button
            key={tab}
            className={`doctor-tab-btn ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
            <span className="doctor-tab-count">
              {appointments[tab]?.length || 0}
            </span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="doctor-tab-content">
        {renderTabContent()}
      </div>

      {/* Meeting Modal */}
      {showMeetingModal && (
        <div className="doctor-modal-overlay" onClick={() => setShowMeetingModal(false)}>
          <div className="doctor-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="doctor-modal-header">
              <h2>Create Meeting</h2>
              <button className="doctor-modal-close" onClick={() => setShowMeetingModal(false)} aria-label="Close">×</button>
            </div>
            <form onSubmit={handleSubmitMeeting} className="doctor-meeting-form">
              <div className="doctor-form-group">
                <label>Patient Name</label>
                <input
                  type="text"
                  value={selectedAppointment?.patientName || ''}
                  disabled
                  className="doctor-form-input"
                />
              </div>
              <div className="doctor-form-group">
                <label>Meeting Link</label>
                <input
                  type="url"
                  value={meetingForm.meetingLink}
                  onChange={(e) => setMeetingForm({ ...meetingForm, meetingLink: e.target.value })}
                  required
                  className="doctor-form-input"
                  placeholder="https://meet.medviz.com/..."
                />
              </div>
              <div className="doctor-form-row">
                <div className="doctor-form-group">
                  <label>Date</label>
                  <input
                    type="date"
                    value={meetingForm.date}
                    onChange={(e) => setMeetingForm({ ...meetingForm, date: e.target.value })}
                    required
                    className="doctor-form-input"
                  />
                </div>
                <div className="doctor-form-group">
                  <label>Time</label>
                  <input
                    type="time"
                    value={meetingForm.time}
                    onChange={(e) => setMeetingForm({ ...meetingForm, time: e.target.value })}
                    required
                    className="doctor-form-input"
                  />
                </div>
              </div>
              <div className="doctor-form-group">
                <label>Notes</label>
                <textarea
                  value={meetingForm.notes}
                  onChange={(e) => setMeetingForm({ ...meetingForm, notes: e.target.value })}
                  className="doctor-form-textarea"
                  rows="3"
                  placeholder="Add any notes for the consultation..."
                ></textarea>
              </div>
              <div className="doctor-form-actions">
                <button type="button" className="doctor-btn-secondary" onClick={() => setShowMeetingModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="doctor-btn-primary">
                  Create & Send Notification
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Prescription Modal */}
      {showPrescriptionModal && (
        <div className="doctor-modal-overlay" onClick={() => setShowPrescriptionModal(false)}>
          <div className="doctor-modal-content doctor-prescription-modal" onClick={(e) => e.stopPropagation()}>
            <div className="doctor-modal-header">
              <h2>Create Prescription</h2>
              <button className="doctor-modal-close" onClick={() => setShowPrescriptionModal(false)} aria-label="Close prescription form">×</button>
            </div>
            <form onSubmit={handleSubmitPrescription} className="doctor-prescription-form">
              <div className="doctor-form-row">
                <div className="doctor-form-group">
                  <label>Patient Name</label>
                  <input
                    type="text"
                    value={prescriptionForm.patientName}
                    disabled
                    className="doctor-form-input"
                  />
                </div>
                <div className="doctor-form-group">
                  <label>Age</label>
                  <input
                    type="number"
                    value={prescriptionForm.age}
                    onChange={(e) => setPrescriptionForm({ ...prescriptionForm, age: e.target.value })}
                    required
                    className="doctor-form-input"
                  />
                </div>
                <div className="doctor-form-group">
                  <label>Gender</label>
                  <select
                    value={prescriptionForm.gender}
                    onChange={(e) => setPrescriptionForm({ ...prescriptionForm, gender: e.target.value })}
                    required
                    className="doctor-form-input"
                  >
                    <option value="">Select</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="doctor-form-group">
                <label>Diagnosis / Problem Description</label>
                <textarea
                  value={prescriptionForm.diagnosis}
                  onChange={(e) => setPrescriptionForm({ ...prescriptionForm, diagnosis: e.target.value })}
                  required
                  className="doctor-form-textarea"
                  rows="3"
                  placeholder="Enter diagnosis and problem description..."
                ></textarea>
              </div>

              <div className="doctor-medicines-section">
                <div className="doctor-section-header">
                  <h3>Medicines</h3>
                  <button type="button" className="doctor-add-medicine-btn" onClick={addMedicine}>
                    <FaPlus /> Add Medicine
                  </button>
                </div>
                {prescriptionForm.medicines.map((medicine, index) => (
                  <div key={index} className="doctor-medicine-row">
                    <input
                      type="text"
                      placeholder="Medicine Name"
                      value={medicine.name}
                      onChange={(e) => updateMedicine(index, 'name', e.target.value)}
                      className="doctor-form-input"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Dosage"
                      value={medicine.dosage}
                      onChange={(e) => updateMedicine(index, 'dosage', e.target.value)}
                      className="doctor-form-input"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Duration"
                      value={medicine.duration}
                      onChange={(e) => updateMedicine(index, 'duration', e.target.value)}
                      className="doctor-form-input"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Notes"
                      value={medicine.notes}
                      onChange={(e) => updateMedicine(index, 'notes', e.target.value)}
                      className="doctor-form-input"
                    />
                    {prescriptionForm.medicines.length > 1 && (
                      <button
                        type="button"
                        className="doctor-remove-medicine-btn"
                        onClick={() => removeMedicine(index)}
                        aria-label={`Remove medicine ${index + 1}`}
                      >
                        <FaTrash aria-hidden="true" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="doctor-form-group">
                <label>Tests Recommended (Optional)</label>
                <textarea
                  value={prescriptionForm.tests}
                  onChange={(e) => setPrescriptionForm({ ...prescriptionForm, tests: e.target.value })}
                  className="doctor-form-textarea"
                  rows="2"
                  placeholder="Enter recommended tests..."
                ></textarea>
              </div>

              <div className="doctor-form-group">
                <label>Additional Advice (Optional)</label>
                <textarea
                  value={prescriptionForm.advice}
                  onChange={(e) => setPrescriptionForm({ ...prescriptionForm, advice: e.target.value })}
                  className="doctor-form-textarea"
                  rows="3"
                  placeholder="Enter lifestyle changes, dietary advice, follow-up instructions..."
                ></textarea>
              </div>

              <div className="doctor-form-actions">
                <button type="button" className="doctor-btn-secondary" onClick={() => setShowPrescriptionModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="doctor-btn-primary">
                  <FaSave /> Save & Send Prescription
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorAppointments;