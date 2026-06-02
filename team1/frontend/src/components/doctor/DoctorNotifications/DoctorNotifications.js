import React, { useState, useEffect } from 'react';
import { FaBell, FaCalendarAlt, FaUser, FaFileAlt, FaExclamationCircle } from 'react-icons/fa';
import './DoctorNotifications.css';
import doctorService from '../../../services/doctorService';

const DoctorNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, [dateFilter, customFrom, customTo]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const userData = JSON.parse(localStorage.getItem('user'));
      if (userData) {
        const doctorId = userData._id || userData.id;
        const params = {};

        // Build date params based on selection
        if (dateFilter === 'today') {
          const start = new Date(); start.setHours(0,0,0,0);
          const end = new Date(); end.setHours(23,59,59,999);
          params.start_date = start.toISOString();
          params.end_date = end.toISOString();
        } else if (dateFilter === '7') {
          const start = new Date(); start.setDate(start.getDate() - 6); start.setHours(0,0,0,0);
          const end = new Date(); end.setHours(23,59,59,999);
          params.start_date = start.toISOString();
          params.end_date = end.toISOString();
        } else if (dateFilter === '30') {
          const start = new Date(); start.setDate(start.getDate() - 29); start.setHours(0,0,0,0);
          const end = new Date(); end.setHours(23,59,59,999);
          params.start_date = start.toISOString();
          params.end_date = end.toISOString();
        } else if (dateFilter === 'custom' && customFrom && customTo) {
          const start = new Date(customFrom); start.setHours(0,0,0,0);
          const end = new Date(customTo); end.setHours(23,59,59,999);
          params.start_date = start.toISOString();
          params.end_date = end.toISOString();
        }

        const response = await doctorService.getNotifications(doctorId, params);
        setNotifications(response.notifications || []);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error.message);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'appointment':
        return <FaCalendarAlt />;
      case 'appointment_accepted':
        return <FaCalendarAlt />;
      case 'appointment_rejected':
        return <FaCalendarAlt />;
      case 'appointment_rescheduled':
        return <FaCalendarAlt />;
      case 'appointment_cancelled':
        return <FaCalendarAlt />;
      case 'prescription':
        return <FaFileAlt />;
      case 'alert':
        return <FaExclamationCircle />;
      default:
        return <FaBell />;
    }
  };

  const getNotificationTitle = (notification) => {
    if (notification.title) return notification.title;

    switch (notification.type) {
      case 'appointment':
        return 'New Appointment Request';
      case 'appointment_accepted':
        return 'Appointment Approved';
      case 'appointment_rejected':
        return 'Appointment Declined';
      case 'appointment_rescheduled':
        return 'Appointment Rescheduled';
      case 'appointment_cancelled':
        return 'Appointment Cancelled';
      case 'prescription':
        return 'Prescription';
      case 'alert':
        return 'Alert';
      default:
        return 'Notification';
    }
  };

  const getSenderInfo = (notification) => {
    // Use new sender fields first, fallback to legacy fields
    if (notification.sender_name) {
      return `From: ${notification.sender_name}`;
    }
    if (notification.sender_type === 'Patient' && notification.patient_name) {
      return `From: ${notification.patient_name}`;
    }
    if (notification.sender_type === 'System') {
      return 'System Notification';
    }
    return null;
  };

  const formatTimeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    const intervals = {
      year: 31536000,
      month: 2592000,
      week: 604800,
      day: 86400,
      hour: 3600,
      minute: 60
    };

    for (const [name, secondsInInterval] of Object.entries(intervals)) {
      const interval = Math.floor(seconds / secondsInInterval);
      if (interval >= 1) {
        return `${interval} ${name}${interval > 1 ? 's' : ''} ago`;
      }
    }
    return 'Just now';
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      await doctorService.markNotificationAsRead(notificationId);
      // Refresh notifications
      fetchNotifications();
    } catch (error) {
      console.error('Error marking notification as read:', error.message);
    }
  };

  if (loading) {
    return (
      <div className="doctor-loading-container">
        <div className="doctor-loading-spinner"></div>
        <p>Loading notifications...</p>
      </div>
    );
  }

  return (
    <div className="doctor-notifications">
      <div className="doctor-notifications-header">
        <h1>Notifications</h1>
        <p className="doctor-notifications-subtitle">
          {notifications.filter(n => !n.is_read).length > 0
            ? `${notifications.filter(n => !n.is_read).length} unread notification${notifications.filter(n => !n.is_read).length > 1 ? 's' : ''}`
            : 'All caught up!'}
        </p>
      </div>

      {/* Date Filters */}
      <div className="doctor-notifications-filters">
        <label>Filter by date:</label>
        <select
          value={dateFilter}
          onChange={(e) => { setDateFilter(e.target.value); if (e.target.value !== 'custom') { setCustomFrom(''); setCustomTo(''); } }}
          className="doctor-filter-select"
        >
          <option value="all">All</option>
          <option value="today">Today</option>
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="custom">Custom Range</option>
        </select>

        {dateFilter === 'custom' && (
          <div className="doctor-custom-date-inputs">
            <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="doctor-date-input" />
            <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="doctor-date-input" />
          </div>
        )}

        <button className="doctor-clear-filter-btn" onClick={() => { setDateFilter('all'); setCustomFrom(''); setCustomTo(''); }}>Clear</button>
      </div>

      <div className="doctor-notifications-container">
        {notifications.length > 0 ? (
          notifications.map(notification => (
            <div
              key={notification._id}
              className={`doctor-notification-item ${!notification.is_read ? 'unread' : ''}`}
              onClick={() => handleMarkAsRead(notification._id)}
              style={{ cursor: 'pointer' }}
            >
              <div className="doctor-notification-icon-wrapper">
                {getNotificationIcon(notification.type)}
              </div>
              <div className="doctor-notification-content">
                <div className="doctor-notification-header-row">
                  <h3 className="doctor-notification-title">{getNotificationTitle(notification)}</h3>
                  <span className="doctor-notification-time">{formatTimeAgo(notification.created_at)}</span>
                </div>
                <p className="doctor-notification-message">{notification.message}</p>
                {getSenderInfo(notification) && (
                  <p className="doctor-notification-sender-info">{getSenderInfo(notification)}</p>
                )}
              </div>
              {!notification.is_read && <div className="doctor-unread-dot"></div>}
            </div>
          ))
        ) : (
          <div className="doctor-empty-state">
            <FaBell style={{ fontSize: '48px', color: '#ccc' }} />
            <p>No notifications yet</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DoctorNotifications;