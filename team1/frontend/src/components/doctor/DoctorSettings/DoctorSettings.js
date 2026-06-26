import React, { useState, useEffect } from 'react';
import { FaShieldAlt, FaBell, FaClock, FaSave } from 'react-icons/fa';
import { toast } from 'react-toastify';
import './DoctorSettings.css';
import doctorService from '../../../services/doctorService';

const DoctorSettings = () => {
  const [settings, setSettings] = useState({
    twoFactorAuth: false,
    blockSuspiciousLogin: true,
    sessionTimeout: '30',
    allowNotifications: true,
    emailNotifications: true,
    smsNotifications: false
  });

  const [loading, setLoading] = useState(true);
  const [doctorId, setDoctorId] = useState(null);

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user'));
    if (userData) {
      const id = userData._id || userData.id;
      setDoctorId(id);
      fetchSettings(id);
    }
  }, []);

  const fetchSettings = async (docId) => {
    try {
      setLoading(true);
      const response = await doctorService.getSettings(docId);
      const settingsData = response.settings || response;

      setSettings({
        twoFactorAuth: settingsData.two_factor_enabled || false,
        blockSuspiciousLogin: settingsData.block_suspicious_login ?? true,
        sessionTimeout: settingsData.session_timeout || '30',
        allowNotifications: settingsData.allow_notifications ?? true,
        emailNotifications: settingsData.email_notifications || false,
        smsNotifications: settingsData.sms_notifications || false
      });
    } catch (error) {
      console.error('Error fetching settings:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      if (!doctorId) return;

      const settingsData = {
        two_factor_enabled: settings.twoFactorAuth,
        block_suspicious_login: settings.blockSuspiciousLogin,
        session_timeout: settings.sessionTimeout,
        allow_notifications: settings.allowNotifications,
        email_notifications: settings.emailNotifications,
        sms_notifications: settings.smsNotifications
      };

      await doctorService.updateSettings(doctorId, settingsData);
      toast.success('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error.message);
      toast.error('Failed to save settings');
    }
  };

  if (loading) {
    return (
      <div className="doctor-loading-container">
        <div className="doctor-loading-spinner"></div>
        <p>Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="doctor-settings">

      <div className="doctor-settings-header">
        <h1>Settings</h1>
      </div>

      {/* Security Settings */}
      <div className="doctor-settings-section">
        <h3><FaShieldAlt /> Security Settings</h3>

        <div className="doctor-setting-item">
          <div className="doctor-setting-info">
            <label>Enable Two-Factor Authentication</label>
            <p>Add an extra layer of security to your account</p>
          </div>
          <input
            type="checkbox"
            checked={settings.twoFactorAuth}
            onChange={(e) =>
              setSettings({ ...settings, twoFactorAuth: e.target.checked })
            }
            className="doctor-toggle-switch"
          />
        </div>

        <div className="doctor-setting-item">
          <div className="doctor-setting-info">
            <label>Block Suspicious Login Attempts</label>
            <p>Automatically block unusual login activity</p>
          </div>
          <input
            type="checkbox"
            checked={settings.blockSuspiciousLogin}
            onChange={(e) =>
              setSettings({ ...settings, blockSuspiciousLogin: e.target.checked })
            }
            className="doctor-toggle-switch"
          />
        </div>
      </div>

      {/* Session Settings */}
      <div className="doctor-settings-section">
        <h3><FaClock /> Session Settings</h3>

        <div className="doctor-setting-item">
          <div className="doctor-setting-info">
            <label>Session Timeout</label>
            <p>Automatically log out after period of inactivity</p>
          </div>
          <select
            value={settings.sessionTimeout}
            onChange={(e) =>
              setSettings({ ...settings, sessionTimeout: e.target.value })
            }
            className="doctor-setting-select"
          >
            <option value="15">15 minutes</option>
            <option value="30">30 minutes</option>
            <option value="60">1 hour</option>
            <option value="120">2 hours</option>
          </select>
        </div>
      </div>

      {/* Notification Settings */}
      <div className="doctor-settings-section">
        <h3><FaBell /> Notification Settings</h3>

        <div className="doctor-setting-item">
          <div className="doctor-setting-info">
            <label>Allow Notifications</label>
            <p>Receive alerts for appointments and messages</p>
          </div>
          <input
            type="checkbox"
            checked={settings.allowNotifications}
            onChange={(e) =>
              setSettings({ ...settings, allowNotifications: e.target.checked })
            }
            className="doctor-toggle-switch"
          />
        </div>
      </div>

      <button
        className="doctor-save-settings-btn"
        onClick={handleSaveSettings}
      >
        <FaSave /> Save Settings
      </button>

    </div>
  );
};

export default DoctorSettings;