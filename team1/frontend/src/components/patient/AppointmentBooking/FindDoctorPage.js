import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../PatientHeader/Header';
import BackButton from '../../common/BackButton/BackButton';
import DoctorProfileModal from './DoctorProfileModal';
import API from '../../../api/axiosConfig';
import './FindDoctorPage.css';

const FindDoctorPage = () => {
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState([]);
  const [filteredDoctors, setFilteredDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Search and Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    department: 'all',
    availability: 'all',
    consultationType: 'all', // New filter for consultation type
    location: 'all',
    gender: 'all'
  });

  // Sample data (replace with API call)
  useEffect(() => {
    fetchDoctors();
  }, []);

  const fetchDoctors = async () => {
    try {
      setLoading(true);

      // Fetch doctors from backend API
      const response = await API.get('/doctors/available');

      if (response.data && response.data.success) {
        const doctorsData = response.data.doctors || response.data.data || [];
        setDoctors(doctorsData);
        setFilteredDoctors(doctorsData);
      } else {
        // If no success field, assume data is directly in response
        const doctorsData = Array.isArray(response.data) ? response.data : [];
        setDoctors(doctorsData);
        setFilteredDoctors(doctorsData);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching doctors:', error);
      setLoading(false);

      // Show error message to user
      if (error.response) {
        console.error('Server Error:', error.response.status, error.response.data);
      } else if (error.request) {
        console.error('Network Error: No response from server');
      } else {
        console.error('Error:', error.message);
      }
    }
  };

  // Apply filters
  useEffect(() => {
    let filtered = [...doctors];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(doctor =>
        (doctor.name?.toLowerCase() || '').includes(query) ||
        (doctor.full_name?.toLowerCase() || '').includes(query) ||
        (doctor.last_name?.toLowerCase() || '').includes(query) ||
        (doctor.specialization?.toLowerCase() || '').includes(query)
      );
    }

    // Department filter
    if (filters.department !== 'all') {
      filtered = filtered.filter(doctor => {
        const spec = (doctor.specialization || '').toLowerCase();
        return spec === filters.department.toLowerCase() || spec.includes(filters.department.toLowerCase());
      });
    }

    // Availability filter
    if (filters.availability !== 'all') {
      filtered = filtered.filter(doctor =>
        (doctor.availability?.toLowerCase() || '') === filters.availability.toLowerCase()
      );
    }

    // Consultation Type filter
    if (filters.consultationType !== 'all') {
      filtered = filtered.filter(doctor => {
        const availability = (doctor.availability || 'offline').toLowerCase();
        if (filters.consultationType === 'online') {
          return availability === 'online';
        } else if (filters.consultationType === 'offline') {
          // Show all doctors for offline consultation (all can do in-person)
          return true;
        }
        return true;
      });
    }

    // Location filter
    if (filters.location !== 'all') {
      filtered = filtered.filter(doctor => {
        const location = (doctor.location || '').toLowerCase();
        return location === filters.location.toLowerCase() || location.includes(filters.location.toLowerCase());
      });
    }

    // Gender filter
    if (filters.gender !== 'all') {
      filtered = filtered.filter(doctor => {
        const gender = (doctor.gender || '').toLowerCase();
        return gender === filters.gender.toLowerCase();
      });
    }

    setFilteredDoctors(filtered);
  }, [searchQuery, filters, doctors]);

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({ ...prev, [filterType]: value }));
  };

  const handleConsultClick = (doctor) => {
    setSelectedDoctor(doctor);
    setShowProfileModal(true);
  };

  const handleCloseModal = () => {
    setShowProfileModal(false);
    setSelectedDoctor(null);
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
    <div className="find-doctor-page">
      <Header />
      <div style={{ marginTop: '75px' }}>
        <BackButton />
      </div>
      <div className="find-doctor-container">
        <div className="page-header-section">
          <h1>Find the Right Doctor</h1>
          <p>Search for doctors by name, specialization, or filter by your preferences</p>
        </div>

        {/* Search Bar */}
        <div className="search-section">
          <div className="search-bar-wrapper">
            <span className="search-icon"></span>
            <input
              type="text"
              className="search-input-main"
              placeholder="Search by doctor name or specialization..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Filters */}
        <div className="filters-section">
          <div className="filter-group">
            <label>Department</label>
            <select
              value={filters.department}
              onChange={(e) => handleFilterChange('department', e.target.value)}
            >
              <option value="all">All Departments</option>
              <option value="cardiology">Cardiology</option>
              <option value="neurology">Neurology</option>
              <option value="pediatrics">Pediatrics</option>
              <option value="orthopedics">Orthopedics</option>
              <option value="dermatology">Dermatology</option>
              <option value="gastroenterology">Gastroenterology</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Availability</label>
            <select
              value={filters.availability}
              onChange={(e) => handleFilterChange('availability', e.target.value)}
            >
              <option value="all">All</option>
              <option value="online">Online</option>
              <option value="offline">Offline</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Consultation Type</label>
            <select
              value={filters.consultationType}
              onChange={(e) => handleFilterChange('consultationType', e.target.value)}
            >
              <option value="all">All Types</option>
              <option value="online">Online Consultation</option>
              <option value="offline">In-Person / Clinic Visit</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Location</label>
            <select
              value={filters.location}
              onChange={(e) => handleFilterChange('location', e.target.value)}
            >
              <option value="all">All Locations</option>
              <option value="new york">New York</option>
              <option value="los angeles">Los Angeles</option>
              <option value="chicago">Chicago</option>
              <option value="houston">Houston</option>
              <option value="miami">Miami</option>
              <option value="boston">Boston</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Gender</label>
            <select
              value={filters.gender}
              onChange={(e) => handleFilterChange('gender', e.target.value)}
            >
              <option value="all">All</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>
        </div>

        {/* Results Count */}
        <div className="results-count">
          <p>Found {filteredDoctors.length} {filteredDoctors.length === 1 ? 'doctor' : 'doctors'}</p>
        </div>

        {/* Doctors List */}
        {loading ? (
          <div className="loading-state">
            <div className="loader"></div>
            <p>Loading doctors...</p>
          </div>
        ) : filteredDoctors.length === 0 ? (
          <div className="no-results">
            <p>No doctors found matching your criteria</p>
            <button onClick={() => {
              setSearchQuery('');
              setFilters({ department: 'all', availability: 'all', location: 'all', gender: 'all' });
            }}>
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="doctors-grid">
            {filteredDoctors.map(doctor => (
              <div key={doctor.id || doctor._id} className="doctor-card-main">
                <div className="doctor-card-header">
                  <div className="doctor-avatar-large">
                    {doctor.image ? (
                      <img src={doctor.image} alt={doctor.name || 'Doctor'} />
                    ) : (
                      <span className="avatar-initials">
                        {(doctor.name || 'DR').split(' ').map(n => n[0]).join('')}
                      </span>
                    )}
                  </div>
                  <div className={`availability-badge ${(doctor.availability || 'offline').toLowerCase()}`}>
                    <span className="status-dot"></span>
                    {doctor.availability || 'Offline'}
                  </div>
                </div>

                <div className="doctor-card-body">
                  <h3>{doctor.name || 'Doctor Name'}</h3>
                  <p className="specialization">{doctor.specialization || 'General Medicine'}</p>
                  <p className="qualification">{doctor.qualification || 'MBBS'}</p>

                  <div className="doctor-stats">
                    <div className="stat-item">
                      <span className="stat-label">Experience:</span>
                      <span>{doctor.experience || 'N/A'}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Location:</span>
                      <span>{doctor.location || 'N/A'}</span>
                    </div>
                  </div>

                  <div className="rating-section">
                    <div className="stars">
                      {renderStars(doctor.rating || 0)}
                    </div>
                    <span className="rating-text">
                      {doctor.rating || 0} ({doctor.reviews || 0} reviews)
                    </span>
                  </div>
                </div>

                <div className="doctor-card-footer">
                  <button
                    className="consult-btn"
                    onClick={() => handleConsultClick(doctor)}
                  >
                    Consult Doctor
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Doctor Profile Modal */}
      {showProfileModal && selectedDoctor && (
        <DoctorProfileModal
          doctor={selectedDoctor}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
};

export default FindDoctorPage;
