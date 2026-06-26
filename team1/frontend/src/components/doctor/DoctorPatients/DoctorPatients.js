import React, { useState, useEffect } from 'react';
import {
  FaUser,
  FaCalendar,
  FaFileAlt,
  FaDownload,
  FaEye,
  FaSearch,
  FaFilter,
  FaComments,
  FaNotesMedical,
  FaFilePdf
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import './DoctorPatients.css';
import doctorService from '../../../services/doctorService';

const DoctorPatients = () => {
  const [patients, setPatients] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBy, setFilterBy] = useState('all');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [doctorId, setDoctorId] = useState(null);

  useEffect(() => {
    // Get doctor ID from localStorage
    const userData = JSON.parse(localStorage.getItem('user'));
    if (userData) {
      const id = userData._id || userData.id;
      setDoctorId(id);
      fetchPatients(id);
    }
  }, []);

  // Refetch when filter changes
  useEffect(() => {
    if (doctorId) {
      fetchPatients(doctorId);
    }
  }, [filterBy]);

  const fetchPatients = async (docId) => {
    try {
      setLoading(true);
      const response = await doctorService.getPatients(docId, filterBy);
      setPatients(response.patients || []);
    } catch (error) {
      console.error('Error fetching patients:', error.message);
      setPatients([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePatientClick = async (patient) => {
    try {
      // Fetch detailed patient information
      const response = await doctorService.getPatientDetails(patient._id);
      setSelectedPatient(response.patient);
      setShowModal(true);
    } catch (error) {
      console.error('Error fetching patient details:', error.message);
      // Show patient with basic info if detailed fetch fails
      setSelectedPatient(patient);
      setShowModal(true);
    }
  };

  const handleDownloadPrescription = async (prescriptionId) => {
    try {
      await doctorService.downloadPrescription(prescriptionId);
      // The download will be handled by the browser
    } catch (error) {
      console.error('Error downloading prescription:', error.message);
      toast.error('Failed to download prescription');
    }
  };

  const handleViewReport = (report) => {
    // Open report file in new tab
    if (report.filePath) {
      window.open(`http://localhost:5000/${report.filePath}`, '_blank');
    } else {
      toast.error('Report file not available');
    }
  };

  // Client-side search filtering (backend already handles 'all', 'recent', 'chronic')
  const filteredPatients = patients.filter(patient => {
    if (!searchTerm) return true;

    const searchLower = searchTerm.toLowerCase();
    const matchesName = patient.name?.toLowerCase().includes(searchLower);
    const matchesDiagnosis = patient.diagnosis?.toLowerCase().includes(searchLower);

    return matchesName || matchesDiagnosis;
  });

  if (loading) {
    return (
      <div className="doctor-loading-container">
        <div className="doctor-loading-spinner"></div>
        <p>Loading patients...</p>
      </div>
    );
  }

  return (
    <div className="doctor-patients">
      <div className="doctor-patients-header">
        <h1>My Patients</h1>
        <div className="doctor-header-stats">
          <div className="doctor-stat-item">
            <span className="doctor-stat-value">{patients.length}</span>
            <span className="doctor-stat-label">Total Patients</span>
          </div>
          <div className="doctor-stat-item">
            <span className="doctor-stat-value">{filteredPatients.length}</span>
            <span className="doctor-stat-label">Filtered Results</span>
          </div>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="doctor-patients-controls">
        <div className="doctor-search-box">
          <FaSearch className="doctor-search-icon" />
          <input
            type="text"
            placeholder="Search patients by name or diagnosis..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="doctor-search-input"
          />
        </div>
        <div className="doctor-filter-buttons">
          <button
            className={`doctor-filter-btn ${filterBy === 'all' ? 'active' : ''}`}
            onClick={() => setFilterBy('all')}
          >
            <FaFilter /> All Patients
          </button>
          <button
            className={`doctor-filter-btn ${filterBy === 'recent' ? 'active' : ''}`}
            onClick={() => setFilterBy('recent')}
          >
            Recent (Last 7 days)
          </button>
          <button
            className={`doctor-filter-btn ${filterBy === 'chronic' ? 'active' : ''}`}
            onClick={() => setFilterBy('chronic')}
          >
            Chronic Cases
          </button>
        </div>
      </div>

      {/* Patients Grid */}
      <div className="doctor-patients-grid">
        {filteredPatients.map(patient => (
          <div
            key={patient._id}
            className="doctor-patient-card"
            onClick={() => handlePatientClick(patient)}
          >
            <div className="doctor-patient-card-header">
              <div className="doctor-patient-avatar">
                <FaUser />
              </div>
              <div className="doctor-patient-basic-info">
                <h3>{patient.name}</h3>
                <p className="doctor-patient-details">
                  {patient.age} years • {patient.gender}
                </p>
              </div>
              <div className="doctor-patient-visits">
                <span className="doctor-visits-count">{patient.totalVisits}</span>
                <span className="doctor-visits-label">Visits</span>
              </div>
            </div>

            <div className="doctor-patient-card-body">
              <div className="doctor-info-row">
                <FaCalendar className="doctor-info-icon" />
                <span className="doctor-info-label">Last Consultation:</span>
                <span className="doctor-info-value">
                  {new Date(patient.lastConsultation).toLocaleDateString()}
                </span>
              </div>

              <div className="doctor-diagnosis-section">
                <h4>Diagnosis Summary</h4>
                <p className="doctor-diagnosis-text">{patient.diagnosis}</p>
              </div>

              <div className="doctor-patient-actions">
                <button className="doctor-action-btn doctor-view-btn">
                  <FaEye /> View Details
                </button>
                {patient.prescriptions && patient.prescriptions.length > 0 && (
                  <button
                    className="action-btn download-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownloadPrescription(patient.prescriptions[0]._id);
                    }}
                  >
                    <FaDownload /> Prescription
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Patient Detail Modal */}
      {showModal && selectedPatient && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Patient Details</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                ×
              </button>
            </div>

            <div className="modal-body">
              {/* Patient Info Section */}
              <div className="modal-section">
                <h3>Personal Information</h3>
                <div className="patient-full-info">
                  <div className="info-grid">
                    <div className="info-item">
                      <span className="label">Name:</span>
                      <span className="value">{selectedPatient.name}</span>
                    </div>
                    <div className="info-item">
                      <span className="label">Age:</span>
                      <span className="value">{selectedPatient.age} years</span>
                    </div>
                    <div className="info-item">
                      <span className="label">Gender:</span>
                      <span className="value">{selectedPatient.gender}</span>
                    </div>
                    <div className="info-item">
                      <span className="label">Email:</span>
                      <span className="value">{selectedPatient.email}</span>
                    </div>
                    <div className="info-item">
                      <span className="label">Phone:</span>
                      <span className="value">{selectedPatient.phone}</span>
                    </div>
                    <div className="info-item">
                      <span className="label">Total Visits:</span>
                      <span className="value">{selectedPatient.totalVisits}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Medical Reports */}
              <div className="modal-section">
                <h3><FaFileAlt /> Medical Reports</h3>
                {selectedPatient.reports && selectedPatient.reports.length > 0 ? (
                  <div className="reports-list">
                    {selectedPatient.reports.map(report => (
                      <div key={report._id} className="report-item">
                        <div className="report-info">
                          <span className="report-name">{report.fileName}</span>
                          <span className="report-meta">
                            {report.reportType} • {new Date(report.uploadedDate).toLocaleDateString()}
                          </span>
                        </div>
                        <button
                          className="view-report-btn"
                          onClick={() => handleViewReport(report)}
                        >
                          <FaEye /> View
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="no-data">No reports available</p>
                )}
              </div>

              {/* Consultation History */}
              <div className="modal-section">
                <h3><FaCalendar /> Consultation History</h3>
                {selectedPatient.consultations && selectedPatient.consultations.length > 0 ? (
                  <div className="consultations-history">
                    {selectedPatient.consultations.map(consultation => (
                      <div key={consultation._id} className="chat-item">
                        <div className="chat-time">
                          {new Date(consultation.appointment_date).toLocaleDateString()} at {consultation.appointment_time}
                        </div>
                        <div className="chat-message">
                          {consultation.service_type} - Status: {consultation.status}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="no-data">No consultation history available</p>
                )}
              </div>

              {/* Prescriptions */}
              <div className="modal-section">
                <h3><FaNotesMedical /> Prescriptions</h3>
                {selectedPatient.prescriptions && selectedPatient.prescriptions.length > 0 ? (
                  <div className="prescriptions-list">
                    {selectedPatient.prescriptions.map(prescription => (
                      <div key={prescription._id} className="prescription-item">
                        <div className="prescription-info">
                          <span className="prescription-date">
                            Date: {new Date(prescription.created_at).toLocaleDateString()}
                          </span>
                          <div className="prescription-diagnosis">
                            <strong>Diagnosis:</strong> {prescription.diagnosis}
                          </div>
                          <div className="medicines-list">
                            {prescription.medicines && prescription.medicines.map((med, idx) => (
                              <span key={idx} className="medicine-tag">
                                {med.medicine_name} - {med.dosage}
                              </span>
                            ))}
                          </div>
                        </div>
                        <button
                          className="download-prescription-btn"
                          onClick={() => handleDownloadPrescription(prescription._id)}
                        >
                          <FaFilePdf /> Download PDF
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="no-data">No prescriptions available</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {filteredPatients.length === 0 && (
        <div className="empty-patients">
          <FaUser className="empty-icon" />
          <h3>No patients found</h3>
          <p>Try adjusting your search or filter criteria</p>
        </div>
      )}
    </div>
  );
};

export default DoctorPatients;