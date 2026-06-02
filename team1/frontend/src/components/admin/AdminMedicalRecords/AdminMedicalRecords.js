import React, { useState, useEffect } from 'react';
import { FiSearch, FiEye, FiTrash2, FiFilter, FiX, FiPrinter } from 'react-icons/fi';
import API from '../../../api/axiosConfig';
import './AdminMedicalRecords.css';

const AdminMedicalRecords = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [loadingPrescription, setLoadingPrescription] = useState(false);

  useEffect(() => {
    fetchPrescriptions();
  }, []);

  const fetchPrescriptions = async () => {
    try {
      setLoading(true);
      const response = await API.get('/admin/prescriptions');

      if (response.data.success) {
        setRecords(response.data.prescriptions);
      }
    } catch (error) {
      console.error('Error fetching prescriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleView = async (recordId) => {
    try {
      setLoadingPrescription(true);
      setViewModalOpen(true);  

      console.log('Viewing prescription with ID:', recordId);
      const response = await API.get(`/admin/prescriptions/${recordId}`);
      console.log('Prescription response:', response.data);

      if (response.data.success) {
        setSelectedPrescription(response.data.prescription);
      } else {
        throw new Error(response.data.message || 'Failed to load prescription');
      }
    } catch (error) {
      console.error('Error fetching prescription details:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to load prescription details. Please try again.';
      alert(errorMessage);
      setViewModalOpen(false);
    } finally {
      setLoadingPrescription(false);
    }
  };

  const closeModal = () => {
    setViewModalOpen(false);
    setSelectedPrescription(null);
  };

  const handleDelete = async (recordId) => {
    if (!window.confirm('Are you sure you want to delete this prescription?')) {
      return;
    }

    try {
      const response = await API.delete(`/admin/prescriptions/${recordId}`);

      if (response.data.success) {
        setRecords(prev =>
  prev.filter(r => r.id !== recordId)
);
        alert('Prescription deleted successfully!');
      }
    } catch (error) {
      console.error('Error deleting prescription:', error);
      alert('Failed to delete prescription. Please try again.');
    }
  };

  const handlePrint = () => {
  window.print();
};
  

  const formatDate = (date) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(date).toLocaleDateString(undefined, options);
  };

  const filteredRecords = records.filter(record =>
  (record.id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
  (record.doctorName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
  (record.patientName || '').toLowerCase().includes(searchTerm.toLowerCase())
);

  return (
    <div className="admin-medical-records">
      <div className="admin-page-header">
        <h1>Medical Records</h1>
        <p className="admin-page-subtitle">Manage and verify all prescription records</p>
      </div>

      <div className="admin-controls-section">
        <div className="admin-search-box">
          <FiSearch />
          <input
            type="text"
            placeholder="Search by ID, doctor, or patient name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button className="admin-filter-btn">
          <FiFilter />
          Filter
        </button>
      </div>

      <div className="admin-table-container">
        <table className="admin-records-table">
          <thead>
            <tr>
              <th>Prescription ID</th>
              <th>Doctor Name</th>
              <th>Patient Name</th>
              <th>Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" className="admin-table-empty">Loading medical records...</td>
              </tr>
            ) : filteredRecords.length === 0 ? (
              <tr>
                <td colSpan="6" className="admin-table-empty">No medical records found</td>
              </tr>
            ) : filteredRecords.map((record) => (
              <tr key={record.id}>
                <td className="admin-record-id">{record.id}</td>
                <td>{record.doctorName}</td>
                <td>{record.patientName}</td>
                <td>{new Date(record.date).toLocaleDateString()}</td>
                <td>
                  <span className={`admin-status-badge ${record.status.toLowerCase()}`}>
                    {record.status}
                  </span>
                </td>
                <td>
                  <div className="admin-action-buttons">
                    <button
                      className="admin-action-btn admin-view"
                      title="View"
                      aria-label={`View prescription ${record.id}`}
                      onClick={() => handleView(record.id)}
                    >
                      <FiEye aria-hidden="true" />
                    </button>
                    <button className="admin-action-btn admin-delete" title="Delete" aria-label={`Delete prescription ${record.id}`} onClick={() => handleDelete(record.id)}>
                      <FiTrash2 aria-hidden="true" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Prescription View Modal */}
      {viewModalOpen && (
        <div className="admin-modal-overlay" onClick={closeModal}>
          <div className="admin-prescription-view-modal" onClick={(e) => e.stopPropagation()}>
            {loadingPrescription ? (
              <div className="admin-modal-loading">
                <div className="admin-loader"></div>
                <p>Loading prescription details...</p>
              </div>
            ) : selectedPrescription ? (
              <>
                <div className="admin-modal-header">
                  <h2>Prescription Details</h2>
                  <button className="admin-close-btn" onClick={closeModal}>
                    <FiX />
                  </button>
                </div>

                <div className="admin-modal-body">
                  {/* Prescription ID Section */}
                  <div className="admin-prescription-id-section">
                    <span className="admin-prescription-id-label">Prescription ID:</span>
                    <span className="admin-prescription-id-value">{selectedPrescription.prescriptionId}</span>
                  </div>

                  {/* Doctor and Patient Info Grid */}
                  <div className="admin-info-grid">
                    <div className="admin-info-card admin-doctor-info-card">
                      <h3>Doctor Information</h3>
                      <div className="admin-card-table">
                        <div className="admin-header-row">
                          <div>NAME</div>
                          <div>SPECIALIZATION</div>
                          <div>CLINIC</div>
                          <div>PHONE</div>
                        </div>
                        <div className="admin-value-row">
                          <div>{selectedPrescription.doctorName}</div>
                          <div>{selectedPrescription.doctorSpecialization}</div>
                          <div>{selectedPrescription.doctorClinic || '–'}</div>
                          <div>{selectedPrescription.doctorPhone || '–'}</div>
                        </div>
                      </div>
                    </div>

                    <div className="admin-info-card admin-patient-info-card">
                      <h3>Patient Information</h3>
                      <div className="admin-card-table">
                        <div className="admin-header-row">
                          <div>NAME</div>
                          <div>AGE</div>
                          <div>GENDER</div>
                          <div>BLOOD GROUP</div>
                          <div>PHONE</div>
                        </div>
                        <div className="admin-value-row">
                          <div>{selectedPrescription.patientName}</div>
                          <div>{selectedPrescription.patientAge} years</div>
                          <div>{selectedPrescription.patientGender}</div>
                          <div>{selectedPrescription.patientBloodGroup || '–'}</div>
                          <div>{selectedPrescription.patientPhone || '–'}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Prescription Date */}
                  <div className="admin-prescription-meta">
                    <strong>Prescription Date:</strong>
                    <span>{formatDate(selectedPrescription.createdAt)}</span>
                  </div>

                  {/* Diagnosis Section */}
                  <div className="admin-prescription-section">
                    <h3>Diagnosis</h3>
                    <p className="admin-diagnosis-text">{selectedPrescription.diagnosis}</p>
                  </div>

                  {/* Medicines Section */}
                  {selectedPrescription.medicines && selectedPrescription.medicines.length > 0 && (
                    <div className="admin-prescription-section">
                      <h3>Prescribed Medicines</h3>
                      <div className="admin-medicines-table">
                        <table>
                          <thead>
                            <tr>
                              <th>#</th>
                              <th>Medicine</th>
                              <th>Dosage</th>
                              <th>Duration</th>
                              <th>Notes</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedPrescription.medicines.map((medicine, index) => (
                              <tr key={index}>
                                <td>{index + 1}</td>
                                <td>{medicine.medicine_name}</td>
                                <td>{medicine.dosage}</td>
                                <td>{medicine.duration}</td>
                                <td>{medicine.notes || '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Tests Recommended */}
                  {selectedPrescription.testsRecommended && (
                    <div className="admin-prescription-section">
                      <h3>Recommended Tests</h3>
                      <p>{selectedPrescription.testsRecommended}</p>
                    </div>
                  )}

                  {/* Additional Advice */}
                  {selectedPrescription.additionalAdvice && (
                    <div className="admin-prescription-section">
                      <h3>Additional Advice</h3>
                      <p>{selectedPrescription.additionalAdvice}</p>
                    </div>
                  )}
                </div>

                <div className="admin-modal-footer">
                  <button className="admin-print-btn" onClick={handlePrint}>
                    <FiPrinter />
                    Print Prescription
                  </button>
                  <button className="admin-close-modal-btn" onClick={closeModal}>
                    Close
                  </button>
                </div>
              </>
            ) : (
              <div className="admin-modal-error">
                <p>Failed to load prescription details</p>
                <button onClick={closeModal}>Close</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminMedicalRecords;