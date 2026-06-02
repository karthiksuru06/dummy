import React, { useState, useEffect } from "react";
import API from "../../../api/axiosConfig";
import Header from '../PatientHeader/Header';
import BackButton from '../../common/BackButton/BackButton';
import "./Reports.css";

const Reports = () => {
  const [activeTab, setActiveTab] = useState('reports');
  const [reports, setReports] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [prescriptionModalOpen, setPrescriptionModalOpen] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadData, setUploadData] = useState({
    reportType: 'Medical Report',
    description: ''
  });
  const [uploading, setUploading] = useState(false);
  
  const getBaseURL = () => {
    return process.env.REACT_APP_API_BASE || "http://localhost:5000";
  };
  
  const apiBaseURL = getBaseURL();

  useEffect(() => {
    if (activeTab === 'reports') {
      fetchReports();
    } else if (activeTab === 'prescriptions') {
      fetchPrescriptions();
    }
  }, [activeTab]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const response = await API.get("/patients/reports");
      setReports(response.data.reports || []);
    } catch (error) {
      console.error("Error fetching reports:", error);
      if (error.response?.status === 401) {
        // Token expired or invalid
        localStorage.removeItem("token");
        window.location.href = "/login";
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchPrescriptions = async () => {
    try {
      setLoading(true);
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      const patientId = userData.id || userData._id;

      if (!patientId) {
        console.error('No patient ID found');
        setPrescriptions([]);
        return;
      }

      const response = await API.get(`/prescriptions/patient/${patientId}`);
      setPrescriptions(response.data.prescriptions || []);
    } catch (error) {
      console.error("Error fetching prescriptions:", error);
      setPrescriptions([]);
      if (error.response?.status === 401) {
        localStorage.removeItem("token");
        window.location.href = "/login";
      }
    } finally {
      setLoading(false);
    }
  };

  const handleView = (report) => {
    setSelectedReport(report);
    setViewModalOpen(true);
  };

  const handleDownload = async (reportId, fileName) => {
    try {
      const response = await API.get(`/patients/reports/download/${reportId}`, {
        responseType: 'blob'
      });

      // Create a blob URL and trigger download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading report:", error);
      alert("Failed to download report");
    }
  };

  const formatDate = (date) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(date).toLocaleDateString(undefined, options);
  };

  const closeModal = () => {
    setViewModalOpen(false);
    setSelectedReport(null);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
      if (!allowedTypes.includes(file.type)) {
        alert('Please select a PDF, JPG, JPEG, or PNG file');
        e.target.value = '';
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10MB');
        e.target.value = '';
        return;
      }
      setUploadFile(file);
    }
  };

  const handleUploadSubmit = async () => {
    if (!uploadFile) {
      alert('Please select a file to upload');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('report', uploadFile);
    formData.append('reportType', uploadData.reportType);
    formData.append('description', uploadData.description || 'Patient uploaded report');

    try {
      // Don't set Content-Type header, let axios set it automatically with boundary
      const response = await API.post('/patients/reports/upload', formData);

      if (response.status === 201) {
        alert('Report uploaded successfully!');
        setUploadModalOpen(false);
        setUploadFile(null);
        setUploadData({ reportType: 'Medical Report', description: '' });

        // Refresh reports list
        fetchReports();
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert(error.response?.data?.message || 'Failed to upload report');
    } finally {
      setUploading(false);
    }
  };

  const closeUploadModal = () => {
    setUploadModalOpen(false);
    setUploadFile(null);
    setUploadData({ reportType: 'Medical Report', description: '' });
  };

  const handleViewPrescription = (prescription) => {
    setSelectedPrescription(prescription);
    setPrescriptionModalOpen(true);
  };

  const closePrescriptionModal = () => {
    setPrescriptionModalOpen(false);
    setSelectedPrescription(null);
  };

  return (
    <>
      <Header />
      <div className="reports-container">
        <BackButton />
        <div className="reports-header">
          <div className="header-content">
            <div>
              <h1>{activeTab === 'reports' ? 'Medical Reports' : 'My Prescriptions'}</h1>
              <p>{activeTab === 'reports' ? 'View and download your medical reports' : 'View prescriptions from your doctors'}</p>
            </div>
            {activeTab === 'reports' && (
              <button
                className="upload-report-btn"
                onClick={() => setUploadModalOpen(true)}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="17 8 12 3 7 8"></polyline>
                  <line x1="12" y1="3" x2="12" y2="15"></line>
                </svg>
                Upload Report
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="reports-tabs">
          <button
            className={`tab-btn ${activeTab === 'reports' ? 'active' : ''}`}
            onClick={() => setActiveTab('reports')}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
            </svg>
            Medical Reports
          </button>
          <button
            className={`tab-btn ${activeTab === 'prescriptions' ? 'active' : ''}`}
            onClick={() => setActiveTab('prescriptions')}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="9" y1="9" x2="15" y2="9"></line>
              <line x1="9" y1="15" x2="15" y2="15"></line>
            </svg>
            Prescriptions
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'reports' ? (
        loading ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Loading reports...</p>
          </div>
        ) : reports.length === 0 ? (
          <div className="no-reports">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="120"
              height="120"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="12" y1="18" x2="12" y2="12"></line>
              <line x1="9" y1="15" x2="15" y2="15"></line>
            </svg>
            <h3>No Reports Found</h3>
            <p>You haven't uploaded any medical reports yet.</p>
          </div>
        ) : (
        <div className="reports-table-container">
          <table className="reports-table">
            <thead>
              <tr>
                <th>Report Type</th>
                <th>File Name</th>
                <th>Upload Date</th>
                <th>File Size</th>
                <th>File Type</th>
                <th>Description</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report, index) => (
                <tr key={report.id || index}>
                  <td>
                    <div className="report-type">
                      <svg
                        className="report-icon"
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <line x1="16" y1="13" x2="8" y2="13"></line>
                        <line x1="16" y1="17" x2="8" y2="17"></line>
                        <polyline points="10 9 9 9 8 9"></polyline>
                      </svg>
                      {report.reportType}
                    </div>
                  </td>
                  <td>{report.fileName}</td>
                  <td>{formatDate(report.uploadedDate)}</td>
                  <td>{report.fileSize}</td>
                  <td>
                    <span className={`file-type ${report.fileType.toLowerCase()}`}>
                      {report.fileType}
                    </span>
                  </td>
                  <td>{report.description}</td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className="view-btn"
                        onClick={() => handleView(report)}
                        title="View Report"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                          <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                        View
                      </button>
                      <button
                        className="download-btn"
                        onClick={() => handleDownload(report.id, report.fileName)}
                        title="Download Report"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                          <polyline points="7 10 12 15 17 10"></polyline>
                          <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                        Download
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )
      ) : (
        // Prescriptions Tab
        loading ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Loading prescriptions...</p>
          </div>
        ) : prescriptions.length === 0 ? (
          <div className="no-reports">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="120"
              height="120"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="9" y1="9" x2="15" y2="9"></line>
              <line x1="9" y1="15" x2="15" y2="15"></line>
            </svg>
            <h3>No Prescriptions Found</h3>
            <p>You don't have any prescriptions yet. Your doctor will send prescriptions after consultations.</p>
          </div>
        ) : (
          <div className="prescriptions-grid">
            {prescriptions.map((prescription) => (
              <div key={prescription._id} className="prescription-card">
                <div className="prescription-card-header">
                  <div className="doctor-info">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="doctor-icon"
                    >
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                      <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                    <div>
                      <h3>Dr. {prescription.doctor_id?.full_name || 'Unknown'} {prescription.doctor_id?.last_name || ''}</h3>
                      <p className="specialization">{prescription.doctor_id?.specialization || 'General Physician'}</p>
                    </div>
                  </div>
                  <span className="prescription-date">{formatDate(prescription.created_at)}</span>
                </div>

                <div className="prescription-card-body">
                  <div className="diagnosis-section">
                    <h4>Diagnosis</h4>
                    <p>{prescription.diagnosis}</p>
                  </div>

                  <div className="medicines-count">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                      <line x1="9" y1="9" x2="15" y2="9"></line>
                      <line x1="9" y1="15" x2="15" y2="15"></line>
                    </svg>
                    <span>{prescription.medicines?.length || 0} Medicine{prescription.medicines?.length !== 1 ? 's' : ''} Prescribed</span>
                  </div>

                  {prescription.tests_recommended && (
                    <div className="tests-recommended">
                      <strong>Tests Recommended:</strong> {prescription.tests_recommended}
                    </div>
                  )}
                </div>

                <div className="prescription-card-footer">
                  <button
                    className="view-prescription-btn"
                    onClick={() => handleViewPrescription(prescription)}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* View Modal */}
      {viewModalOpen && selectedReport && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>View Report: {selectedReport.fileName}</h2>
              <button className="close-btn" onClick={closeModal}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div className="modal-body">
              {selectedReport.fileType === 'PDF' ? (
                <iframe
                  src={`${apiBaseURL}/api/patients/reports/view/${selectedReport.id}`}
                  title={selectedReport.fileName}
                  width="100%"
                  height="600px"
                  style={{ border: 'none' }}
                />
              ) : (
                <img
                  src={`${apiBaseURL}/api/patients/reports/view/${selectedReport.id}`}
                  alt={selectedReport.fileName}
                  style={{ maxWidth: '100%', height: 'auto' }}
                />
              )}
            </div>
            <div className="modal-footer">
              <button
                className="download-modal-btn"
                onClick={() => handleDownload(selectedReport.id, selectedReport.fileName)}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                Download Report
              </button>
              <button className="close-modal-btn" onClick={closeModal}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {uploadModalOpen && (
        <div className="modal-overlay" onClick={closeUploadModal}>
          <div className="upload-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Upload Medical Report</h2>
              <button className="close-btn" onClick={closeUploadModal}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div className="upload-modal-body">
              <div className="upload-form">
                <div className="form-group">
                  <label>Select Report File *</label>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileChange}
                    className="file-input"
                  />
                  {uploadFile && (
                    <p className="file-selected">
                      Selected: {uploadFile.name} ({(uploadFile.size / 1024).toFixed(2)} KB)
                    </p>
                  )}
                  <p className="file-hint">Accepted formats: PDF, JPG, JPEG, PNG (Max: 10MB)</p>
                </div>

                <div className="form-group">
                  <label>Report Type</label>
                  <select
                    value={uploadData.reportType}
                    onChange={(e) => setUploadData({ ...uploadData, reportType: e.target.value })}
                    className="form-select"
                  >
                    <option value="Medical Report">Medical Report</option>
                    <option value="Lab Report">Lab Report</option>
                    <option value="X-Ray">X-Ray</option>
                    <option value="MRI Scan">MRI Scan</option>
                    <option value="CT Scan">CT Scan</option>
                    <option value="Prescription">Prescription</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Description (Optional)</label>
                  <textarea
                    value={uploadData.description}
                    onChange={(e) => setUploadData({ ...uploadData, description: e.target.value })}
                    placeholder="Enter a brief description of the report..."
                    rows="3"
                    className="form-textarea"
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="upload-submit-btn"
                onClick={handleUploadSubmit}
                disabled={uploading || !uploadFile}
              >
                {uploading ? (
                  <>
                    <span className="loading-spinner"></span>
                    Uploading...
                  </>
                ) : (
                  <>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="17 8 12 3 7 8"></polyline>
                      <line x1="12" y1="3" x2="12" y2="15"></line>
                    </svg>
                    Upload Report
                  </>
                )}
              </button>
              <button className="cancel-upload-btn" onClick={closeUploadModal} disabled={uploading}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Prescription Detail Modal */}
      {prescriptionModalOpen && selectedPrescription && (
        <div className="modal-overlay" onClick={closePrescriptionModal}>
          <div className="prescription-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Prescription Details</h2>
              <button className="close-btn" onClick={closePrescriptionModal}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            <div className="prescription-detail-body">
              {/* Doctor and Patient Info */}
              <div className="prescription-info-section">
                <div className="info-row">
                  <div className="info-item">
                    <strong>Doctor:</strong>
                    <p>Dr. {selectedPrescription.doctor_id?.full_name || 'Unknown'} {selectedPrescription.doctor_id?.last_name || ''}</p>
                    <span className="specialization-badge">{selectedPrescription.doctor_id?.specialization || 'General Physician'}</span>
                  </div>
                  <div className="info-item">
                    <strong>Date:</strong>
                    <p>{formatDate(selectedPrescription.created_at)}</p>
                  </div>
                </div>
                <div className="info-row">
                  <div className="info-item">
                    <strong>Patient:</strong>
                    <p>{selectedPrescription.patient_name}</p>
                  </div>
                  <div className="info-item">
                    <strong>Age:</strong>
                    <p>{selectedPrescription.patient_age} years</p>
                  </div>
                  <div className="info-item">
                    <strong>Gender:</strong>
                    <p>{selectedPrescription.patient_gender}</p>
                  </div>
                </div>
              </div>

              {/* Diagnosis */}
              <div className="prescription-section-detail">
                <h3>Diagnosis</h3>
                <p className="diagnosis-text">{selectedPrescription.diagnosis}</p>
              </div>

              {/* Medicines */}
              {selectedPrescription.medicines && selectedPrescription.medicines.length > 0 && (
                <div className="prescription-section-detail">
                  <h3>Prescribed Medicines</h3>
                  <div className="medicines-list-detail">
                    {selectedPrescription.medicines.map((medicine, index) => (
                      <div key={index} className="medicine-item-detail">
                        <div className="medicine-number">{index + 1}</div>
                        <div className="medicine-details">
                          <h4>{medicine.medicine_name}</h4>
                          <div className="medicine-meta">
                            <span><strong>Dosage:</strong> {medicine.dosage}</span>
                            <span><strong>Duration:</strong> {medicine.duration}</span>
                          </div>
                          {medicine.notes && (
                            <p className="medicine-notes">{medicine.notes}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tests Recommended */}
              {selectedPrescription.tests_recommended && (
                <div className="prescription-section-detail">
                  <h3>Recommended Tests</h3>
                  <p>{selectedPrescription.tests_recommended}</p>
                </div>
              )}

              {/* Additional Advice */}
              {selectedPrescription.additional_advice && (
                <div className="prescription-section-detail">
                  <h3>Additional Advice</h3>
                  <p>{selectedPrescription.additional_advice}</p>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="print-btn" onClick={() => window.print()}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="6 9 6 2 18 2 18 9"></polyline>
                  <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                  <rect x="6" y="14" width="12" height="8"></rect>
                </svg>
                Print Prescription
              </button>
              <button className="close-modal-btn" onClick={closePrescriptionModal}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Reports;