import React, { useState, useEffect } from 'react';
import { FiSearch, FiCheck, FiX, FiPower, FiFileText, FiMail } from 'react-icons/fi';
import API from '../../../api/axiosConfig';
import './AdminDoctors.css';
import '../AdminTheme.css';

const AdminDoctors = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSpec, setSelectedSpec] = useState(null);

  useEffect(() => {
    fetchDoctors();
  }, [statusFilter]);

  const fetchDoctors = async () => {
    try {
      setLoading(true);
      const response = await API.get('/admin/doctors', {
        params: { status: statusFilter }
      });

      if (response.data.success) {
        setDoctors(response.data.doctors);
      }
    } catch (error) {
      console.error('Error fetching doctors:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredDoctors = doctors.filter(doctor => {
    const matchesSearch = doctor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doctor.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doctor.specialization.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || doctor.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Get specialization counts
  const specializationCounts = doctors.reduce((acc, doctor) => {
    if (doctor.status === 'approved') {
      acc[doctor.specialization] = (acc[doctor.specialization] || 0) + 1;
    }
    return acc;
  }, {});

  const handleApprove = async (doctor) => {
    try {
      const response = await API.put(`/admin/doctors/${doctor.id}/approve`);

      if (response.data.success) {
        // Update local state
        setDoctors(doctors.map(d => d.id === doctor.id ? { ...d, status: 'approved' } : d));
        alert('Doctor approved successfully!');
      }
    } catch (error) {
      console.error('Error approving doctor:', error);
      alert('Failed to approve doctor. Please try again.');
    }
  };

  const handleReject = async (doctor) => {
    try {
      const response = await API.put(`/admin/doctors/${doctor.id}/reject`);

      if (response.data.success) {
        // Update local state
        setDoctors(doctors.map(d => d.id === doctor.id ? { ...d, status: 'rejected' } : d));
        alert('Doctor rejected successfully!');
      }
    } catch (error) {
      console.error('Error rejecting doctor:', error);
      alert('Failed to reject doctor. Please try again.');
    }
  };

  const handleDeactivate = async (doctor) => {
    if (!window.confirm(`Are you sure you want to deactivate ${doctor.name}? An email notification will be sent.`)) {
      return;
    }

    try {
      const response = await API.put(`/admin/doctors/${doctor.id}/deactivate`);

      if (response.data.success) {
        // Update local state
        setDoctors(doctors.map(d => d.id === doctor.id ? { ...d, status: 'deactivated' } : d));
        alert('Doctor deactivated successfully! Email notification sent.');
      }
    } catch (error) {
      console.error('Error deactivating doctor:', error);
      alert('Failed to deactivate doctor. Please try again.');
    }
  };

  return (
    <div className="admin-doctors premium-theme">
      <div className="admin-page-header">
        <h1>Doctor Management</h1>
        <p className="admin-page-subtitle">Manage doctor registrations and approvals</p>
      </div>

      {/* Search and Filter */}
      <div className="admin-controls-section">
        <div className="admin-search-box">
          <FiSearch />
          <input
            type="text"
            placeholder="Search by name, email, or specialization..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          className="admin-status-filter"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All Statuses</option>
          <option value="approved">Approved</option>
          <option value="pending">Pending</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Specialization Overview */}
      <div className="admin-specialization-section">
        <h2>Department Overview</h2>
        <div className="admin-spec-cards">
          {Object.entries(specializationCounts).map(([spec, count]) => (
            <div key={spec} className="admin-spec-card" onClick={() => setSelectedSpec(spec === selectedSpec ? null : spec)}>
              <div className="admin-spec-icon">{spec.charAt(0)}</div>
              <div className="admin-spec-content">
                <h3>{spec}</h3>
                <p>{count} Doctor{count !== 1 ? 's' : ''}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Doctors Table */}
      <div className="admin-table-container">
        {loading ? (
          <div className="admin-loading-state">
            <div className="admin-loading-spinner"></div>
            <p>Loading doctors...</p>
          </div>
        ) : filteredDoctors.length === 0 ? (
          <div className="admin-empty-state">
            <p>No doctors found</p>
          </div>
        ) : (
          <div className="admin-doctors-list-wrapper">
            <div className="admin-table-header">
              <div className="admin-header-item doctor-col">Doctor Information</div>
              <div className="admin-header-item spec-col">Specialization</div>
              <div className="admin-header-item contact-col">Contact Details</div>
              <div className="admin-header-item experience-col">Experience</div>
              <div className="admin-header-item status-col">Status</div>
              <div className="admin-header-item date-col">Registered</div>
              <div className="admin-header-item actions-col">Actions</div>
            </div>
            <div className="admin-table-body">
              {filteredDoctors.map((doctor) => (
                <div key={doctor.id} className={`admin-doctor-row ${doctor.status}`}>
                  <div className="admin-cell doctor-col">
                    <div className="admin-doctor-info">
                      <div className="admin-doctor-avatar-large">
                        {doctor.name.split(' ').map(n => n.charAt(0)).join('')}
                      </div>
                      <div className="admin-doctor-details">
                        <div className="admin-doctor-name-text">{doctor.name}</div>
                        <div className="admin-doctor-id">ID: #{doctor.id.slice(-6)}</div>
                      </div>
                    </div>
                  </div>
                  <div className="admin-cell spec-col">
                    <div className="admin-spec-badge-new">
                      <div className="admin-spec-icon-small">{doctor.specialization.charAt(0)}</div>
                      <span>{doctor.specialization}</span>
                    </div>
                  </div>
                  <div className="admin-cell contact-col">
                    <div className="admin-contact-info">
                      <div className="admin-contact-row">
                        <FiMail className="admin-contact-icon"/>
                        <span>{doctor.email}</span>
                      </div>
                      {doctor.phone && (
                        <div className="admin-contact-row admin-phone">
                          <span>📞 {doctor.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="admin-cell experience-col">
                    <div className="admin-experience-badge">
                      <span className="admin-exp-number">{doctor.experience || 'N/A'}</span>
                      {doctor.experience && <span className="admin-exp-label">years</span>}
                    </div>
                  </div>
                  <div className="admin-cell status-col">
                    <div className={`admin-status-badge-new ${doctor.status}`}>
                      <span className="admin-status-dot"></span>
                      <span className="admin-status-text">{doctor.status}</span>
                    </div>
                  </div>
                  <div className="admin-cell date-col">
                    <div className="admin-date-info">
                      {new Date(doctor.registration_date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </div>
                  </div>
                  <div className="admin-cell actions-col">
                    <div className="admin-action-buttons-new">
                      {doctor.status === 'pending' && (
                        <>
                          <button className="admin-action-btn-new admin-approve" onClick={() => handleApprove(doctor)}>
                            <FiCheck />
                            <span>Approve</span>
                          </button>
                          <button className="admin-action-btn-new admin-reject" onClick={() => handleReject(doctor)}>
                            <FiX />
                            <span>Reject</span>
                          </button>
                        </>
                      )}
                      {doctor.status === 'approved' && (
                        <button className="admin-action-btn-new admin-deactivate" onClick={() => handleDeactivate(doctor)}>
                          <FiPower />
                          <span>Deactivate</span>
                        </button>
                      )}
                      {doctor.cert_docs && (
                        <button className="admin-action-btn-new admin-view">
                          <FiFileText />
                          <span>View Docs</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDoctors;