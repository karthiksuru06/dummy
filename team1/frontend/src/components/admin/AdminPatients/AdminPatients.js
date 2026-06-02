import React, { useState, useEffect } from 'react';
import { FiSearch, FiEye, FiMail, FiPhone, FiX, FiUser, FiCalendar, FiMapPin, FiActivity, FiDroplet, FiHeart } from 'react-icons/fi';
import API from '../../../api/axiosConfig';
import './AdminPatients.css';
import '../AdminTheme.css';

const AdminPatients = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      const response = await API.get('/admin/patients');

      if (response.data.success) {
        setPatients(response.data.patients);
      }
    } catch (error) {
      console.error('Error fetching patients:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPatients = patients.filter(patient =>
    patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.contact.includes(searchTerm)
  );

  const handleViewProfile = async (patient) => {
    try {
      setModalLoading(true);
      setShowModal(true);

      // Fetch full patient details
      const response = await API.get(`/admin/patients/${patient.id}`);

      if (response.data.success) {
        setSelectedPatient(response.data.patient);
      }
    } catch (error) {
      console.error('Error fetching patient details:', error);
      setSelectedPatient(patient); // Fallback to basic patient data
    } finally {
      setModalLoading(false);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedPatient(null);
  };

  return (
    <div className="admin-patients premium-theme">
      <div className="admin-page-header">
        <h1>Patient Management</h1>
        <p className="admin-page-subtitle">Manage and view all registered patients</p>
      </div>

      {/* Search Bar */}
      <div className="admin-search-section">
        <div className="admin-search-box">
          <FiSearch />
          <input
            type="text"
            placeholder="Search by name, email, or contact..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="admin-patient-count">
          <span className="admin-count-badge">{filteredPatients.length}</span>
          <span>Total Patients</span>
        </div>
      </div>

      {/* Patients Table */}
      <div className="admin-table-container">
        {loading ? (
          <div className="admin-loading-state">
            <div className="admin-loading-spinner"></div>
            <p>Loading patients...</p>
          </div>
        ) : filteredPatients.length === 0 ? (
          <div className="admin-empty-state">
            <p>No patients found</p>
          </div>
        ) : (
          <table className="admin-patients-table">
            <thead>
              <tr>
                <th>Patient Name</th>
                <th>Age</th>
                <th>Email</th>
                <th>Contact</th>
                <th>Visits</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPatients.map((patient) => (
                <tr key={patient.id}>
                  <td>
                    <div className="admin-patient-name">
                      <div className="admin-patient-avatar">
                        {patient.name.charAt(0)}
                      </div>
                      <span>{patient.name}</span>
                    </div>
                  </td>
                  <td>{patient.age}</td>
                  <td>
                    <div className="admin-email-cell">
                      <FiMail />
                      {patient.email}
                    </div>
                  </td>
                  <td>
                    <div className="admin-phone-cell">
                      <FiPhone />
                      {patient.contact}
                    </div>
                  </td>
                  <td>
                    <span className="admin-visits-badge">{patient.visits}</span>
                  </td>
                  <td>
                    <button
                      className="admin-view-btn"
                      onClick={() => handleViewProfile(patient)}
                    >
                      <FiEye />
                      View Profile
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Patient Profile Modal */}
      {showModal && (
        <div className="admin-modal-overlay" onClick={closeModal}>
          <div className="admin-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="admin-modal-close-btn" onClick={closeModal}>
              <FiX />
            </button>

            {modalLoading ? (
              <div className="admin-modal-loading">
                <div className="admin-loading-spinner"></div>
                <p>Loading patient details...</p>
              </div>
            ) : selectedPatient ? (
              <>
                {/* Modal Header */}
                <div className="admin-modal-header">
                  <div className="admin-modal-patient-avatar">
                    {selectedPatient.name.charAt(0)}
                  </div>
                  <div className="admin-modal-patient-info">
                    <h2>{selectedPatient.name}</h2>
                    <p className="admin-patient-id">Patient ID: #{selectedPatient.id?.slice(-8)}</p>
                  </div>
                </div>

                {/* Modal Body */}
                <div className="admin-modal-body">
                  {/* Basic Information */}
                  <div className="admin-info-section">
                    <h3 className="admin-section-title">
                      Basic Information
                    </h3>
                    <div className="admin-basic-info-table">
                      <div className="admin-header-row">
                        <div>FULL NAME</div>
                        <div>AGE</div>
                        <div>GENDER</div>
                        <div>DATE OF BIRTH</div>
                        <div>BLOOD GROUP</div>
                      </div>
                      <div className="admin-value-row">
                        <div>{selectedPatient.name}</div>
                        <div>{selectedPatient.age || 'N/A'}</div>
                        <div>{selectedPatient.gender || 'N/A'}</div>
                        <div>{selectedPatient.dob ? new Date(selectedPatient.dob).toLocaleDateString() : 'N/A'}</div>
                        <div><span className="admin-blood-pill">{selectedPatient.blood_group || 'N/A'}</span></div>
                      </div>
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div className="admin-info-section">
                    <h3 className="admin-section-title">
                      Contact Information
                    </h3>
                    <div className="admin-contact-table">
                      <div className="admin-header-row">
                        <div>EMAIL</div>
                        <div>PHONE</div>
                        <div>ADDRESS</div>
                        <div>EMERGENCY CONTACT</div>
                      </div>
                      <div className="admin-value-row">
                        <div className="admin-contact-text">
                          <FiMail />
                          {selectedPatient.email}
                        </div>
                        <div className="admin-contact-text">
                          <FiPhone />
                          {selectedPatient.contact}
                        </div>
                        <div className="admin-address-text">
                          <FiMapPin />
                          {selectedPatient.address || 'Not provided'}
                        </div>
                        <div className="admin-contact-text">
                          <FiPhone />
                          {selectedPatient.emergency_contact || 'N/A'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Medical Information */}
                  <div className="admin-info-section">
                    <h3 className="admin-section-title">Medical Information</h3>
                    <div className="admin-medical-info-table">
                      <div className="admin-header-row">
                        <div>HEIGHT</div>
                        <div>WEIGHT</div>
                        <div>HEART RATE (BPM)</div>
                        <div>TOTAL VISITS</div>
                        <div>MEDICAL HISTORY</div>
                        <div>CURRENT MEDICATIONS</div>
                      </div>
                      <div className="admin-value-row">
                        <div>{selectedPatient.height || 'N/A'}</div>
                        <div>{selectedPatient.weight || 'N/A'}</div>
                        <div>{selectedPatient.bpm || 'N/A'}</div>
                        <div><span className="admin-visits-count">{selectedPatient.visits || 0}</span></div>
                        <div>{selectedPatient.medical_history || '–'}</div>
                        <div>{selectedPatient.current_medications || '–'}</div>
                      </div>
                    </div>
                  </div>

                  {/* Registration Information */}
                  <div className="admin-info-section">
                    <h3 className="admin-section-title">
                      Registration Information
                    </h3>
                    <div className="admin-info-grid">
                      <div className="admin-info-item">
                        <label>Registered On</label>
                        <p>{selectedPatient.created_at ? new Date(selectedPatient.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        }) : 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="admin-modal-error">
                <p>Unable to load patient details</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPatients;