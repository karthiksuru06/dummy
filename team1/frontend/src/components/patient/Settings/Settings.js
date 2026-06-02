import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../../../api/axiosConfig';
import Header from '../PatientHeader/Header';
import BackButton from '../../common/BackButton/BackButton';
import './Settings.css';

const Settings = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Profile Data
  const [profileData, setProfileData] = useState({
    full_name: '',
    last_name: '',
    email: '',
    phone: '',
    gender: '',
    dob: '',
    address: ''
  });

  // Medical Data
  const [medicalData, setMedicalData] = useState({
    blood_group: '',
    medical_history: '',
    current_medications: '',
    emergency_contact: '',
    height: '',
    weight: '',
    bpm: ''
  });

  // Password Data
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Communication Preferences
  const [communicationPrefs, setCommunicationPrefs] = useState({
    emailNotifications: true,
    smsNotifications: false
  });

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      const patientId = userData.id || userData._id;

      if (!patientId) {
        setErrorMessage('User session not found. Please login again.');
        setLoading(false);
        return;
      }

      const response = await API.get(`/patient/${patientId}/profile`);

      if (response.data && response.data.success) {
        const profile = response.data.profile;

        setProfileData({
          full_name: profile.full_name || '',
          last_name: profile.last_name || '',
          email: profile.email || '',
          phone: profile.phone || '',
          gender: profile.gender || '',
          dob: profile.dob ? profile.dob.split('T')[0] : '',
          address: profile.address || ''
        });

        setMedicalData({
          blood_group: profile.blood_group || '',
          medical_history: profile.medical_history || '',
          current_medications: profile.current_medications || '',
          emergency_contact: profile.emergency_contact || '',
          height: profile.height || '',
          weight: profile.weight || '',
          bpm: profile.bpm || ''
        });
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching profile:', error);
      setErrorMessage('Failed to load profile data');
      setLoading(false);
    }
  };

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleMedicalChange = (e) => {
    const { name, value } = e.target;
    setMedicalData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCommunicationChange = (pref) => {
    setCommunicationPrefs(prev => ({
      ...prev,
      [pref]: !prev[pref]
    }));
  };

  const validateProfile = () => {
    if (!profileData.full_name || !profileData.last_name) {
      setErrorMessage('First name and last name are required');
      return false;
    }
    if (!profileData.phone || profileData.phone.length < 10) {
      setErrorMessage('Valid phone number is required');
      return false;
    }
    return true;
  };

  const validatePassword = () => {
    if (!passwordData.currentPassword) {
      setErrorMessage('Current password is required');
      return false;
    }
    if (!passwordData.newPassword || passwordData.newPassword.length < 6) {
      setErrorMessage('New password must be at least 6 characters');
      return false;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setErrorMessage('New passwords do not match');
      return false;
    }
    return true;
  };

  const handleSaveProfile = async () => {
    if (!validateProfile()) return;

    try {
      setSaving(true);
      setErrorMessage('');

      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      const patientId = userData.id || userData._id;

      const updateData = {
        ...profileData,
        ...medicalData
      };

      const response = await API.put(`/patient/${patientId}/profile`, updateData);

      if (response.data && response.data.success) {
        setSuccessMessage('Profile updated successfully!');
        setTimeout(() => setSuccessMessage(''), 3000);
      }

      setSaving(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      setErrorMessage(error.response?.data?.message || 'Failed to update profile');
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!validatePassword()) return;

    try {
      setSaving(true);
      setErrorMessage('');

      const response = await API.put('/patient/changePassword', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });

      if (response.data && response.data.success) {
        setSuccessMessage('Password changed successfully!');
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        setTimeout(() => setSuccessMessage(''), 3000);
      }

      setSaving(false);
    } catch (error) {
      console.error('Error changing password:', error);
      setErrorMessage(error.response?.data?.message || 'Failed to change password');
      setSaving(false);
    }
  };

  const handleCancel = () => {
    fetchProfileData();
    setPasswordData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    setErrorMessage('');
    setSuccessMessage('');
  };

  if (loading) {
    return (
      <>
        <Header />
        <div className="settings-page">
          <div className="settings-container">
            <BackButton />
            <div className="loading-state">
              <div className="loader"></div>
              <p>Loading settings...</p>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="settings-page">
        <div className="settings-container">
          <BackButton />

          <div className="settings-header">
            <h1>Settings</h1>
            <p>Manage your account settings and preferences</p>
          </div>

          {/* Success/Error Messages */}
          {successMessage && (
            <div className="notification success-notification">
              <span className="notification-icon">✓</span>
              <span>{successMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="notification error-notification">
              <span className="notification-icon">✕</span>
              <span>{errorMessage}</span>
              <button className="close-notification" onClick={() => setErrorMessage('')}>×</button>
            </div>
          )}

          {/* Tabs */}
          <div className="settings-tabs">
            <button
              className={`tab-button ${activeTab === 'profile' ? 'active' : ''}`}
              onClick={() => setActiveTab('profile')}
            >
              Profile
            </button>
            <button
              className={`tab-button ${activeTab === 'medical' ? 'active' : ''}`}
              onClick={() => setActiveTab('medical')}
            >
              Medical Info
            </button>
            <button
              className={`tab-button ${activeTab === 'account' ? 'active' : ''}`}
              onClick={() => setActiveTab('account')}
            >
              Account
            </button>
          </div>

          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="settings-content">
              <div className="settings-section">
                <h2>Personal Information</h2>
                <div className="form-grid">
                  <div className="form-group">
                    <label>First Name *</label>
                    <input
                      type="text"
                      name="full_name"
                      value={profileData.full_name}
                      onChange={handleProfileChange}
                      placeholder="Enter first name"
                    />
                  </div>

                  <div className="form-group">
                    <label>Last Name *</label>
                    <input
                      type="text"
                      name="last_name"
                      value={profileData.last_name}
                      onChange={handleProfileChange}
                      placeholder="Enter last name"
                    />
                  </div>

                  <div className="form-group">
                    <label>Email Address</label>
                    <input
                      type="email"
                      name="email"
                      value={profileData.email}
                      disabled
                      className="disabled-input"
                    />
                    <span className="input-hint">Email cannot be changed</span>
                  </div>

                  <div className="form-group">
                    <label>Phone Number *</label>
                    <input
                      type="tel"
                      name="phone"
                      value={profileData.phone}
                      onChange={handleProfileChange}
                      placeholder="Enter phone number"
                    />
                  </div>

                  <div className="form-group">
                    <label>Gender *</label>
                    <select
                      name="gender"
                      value={profileData.gender}
                      onChange={handleProfileChange}
                    >
                      <option value="">Select gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Date of Birth *</label>
                    <input
                      type="date"
                      name="dob"
                      value={profileData.dob}
                      onChange={handleProfileChange}
                    />
                  </div>
                </div>

                <div className="form-group full-width">
                  <label>Address</label>
                  <textarea
                    name="address"
                    value={profileData.address}
                    onChange={handleProfileChange}
                    placeholder="Enter your address"
                    rows="3"
                  />
                </div>
              </div>

              <div className="settings-actions">
                <button className="btn-cancel" onClick={handleCancel} disabled={saving}>
                  Cancel
                </button>
                <button className="btn-save" onClick={handleSaveProfile} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          )}

          {/* Medical Tab */}
          {activeTab === 'medical' && (
            <div className="settings-content">
              <div className="settings-section">
                <h2>Medical Information</h2>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Blood Group</label>
                    <select
                      name="blood_group"
                      value={medicalData.blood_group}
                      onChange={handleMedicalChange}
                    >
                      <option value="">Select blood group</option>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Emergency Contact</label>
                    <input
                      type="tel"
                      name="emergency_contact"
                      value={medicalData.emergency_contact}
                      onChange={handleMedicalChange}
                      placeholder="Emergency contact number"
                    />
                  </div>

                  <div className="form-group">
                    <label>Height</label>
                    <input
                      type="text"
                      name="height"
                      value={medicalData.height}
                      onChange={handleMedicalChange}
                      placeholder="e.g., 175 cm"
                    />
                  </div>

                  <div className="form-group">
                    <label>Weight</label>
                    <input
                      type="text"
                      name="weight"
                      value={medicalData.weight}
                      onChange={handleMedicalChange}
                      placeholder="e.g., 70 kg"
                    />
                  </div>
                </div>

                <div className="form-group full-width">
                  <label>Medical History / Allergies</label>
                  <textarea
                    name="medical_history"
                    value={medicalData.medical_history}
                    onChange={handleMedicalChange}
                    placeholder="Enter any medical conditions, allergies, or past medical history"
                    rows="4"
                  />
                </div>

                <div className="form-group full-width">
                  <label>Current Medications</label>
                  <textarea
                    name="current_medications"
                    value={medicalData.current_medications}
                    onChange={handleMedicalChange}
                    placeholder="List any medications you are currently taking"
                    rows="3"
                  />
                </div>
              </div>

              <div className="settings-actions">
                <button className="btn-cancel" onClick={handleCancel} disabled={saving}>
                  Cancel
                </button>
                <button className="btn-save" onClick={handleSaveProfile} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          )}

          {/* Account Tab */}
          {activeTab === 'account' && (
            <div className="settings-content">
              <div className="settings-section">
                <h2>Change Password</h2>
                <p className="section-description">
                  Update your password to keep your account secure
                </p>

                <div className="form-group">
                  <label>Current Password *</label>
                  <input
                    type="password"
                    name="currentPassword"
                    value={passwordData.currentPassword}
                    onChange={handlePasswordChange}
                    placeholder="Enter current password"
                  />
                </div>

                <div className="form-group">
                  <label>New Password *</label>
                  <input
                    type="password"
                    name="newPassword"
                    value={passwordData.newPassword}
                    onChange={handlePasswordChange}
                    placeholder="Enter new password (min. 6 characters)"
                  />
                </div>

                <div className="form-group">
                  <label>Confirm New Password *</label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordChange}
                    placeholder="Confirm new password"
                  />
                </div>

                <div className="settings-actions">
                  <button className="btn-cancel" onClick={handleCancel} disabled={saving}>
                    Cancel
                  </button>
                  <button className="btn-save" onClick={handleChangePassword} disabled={saving}>
                    {saving ? 'Changing...' : 'Change Password'}
                  </button>
                </div>
              </div>

              <div className="settings-section">
                <h2>Communication Preferences</h2>
                <p className="section-description">
                  Choose how you'd like to receive notifications
                </p>

                <div className="preference-item">
                  <div className="preference-info">
                    <h3>Email Notifications</h3>
                    <p>Receive appointment reminders and updates via email</p>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={communicationPrefs.emailNotifications}
                      onChange={() => handleCommunicationChange('emailNotifications')}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>

                <div className="preference-item">
                  <div className="preference-info">
                    <h3>SMS Notifications</h3>
                    <p>Receive appointment reminders via text message</p>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={communicationPrefs.smsNotifications}
                      onChange={() => handleCommunicationChange('smsNotifications')}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Settings;
