import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../../../api/axiosConfig';
import Header from '../PatientHeader/Header';
import BackButton from '../../common/BackButton/BackButton';
import './Notifications.css';

const Notifications = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    fetchNotifications();

    // Auto-refresh every 15 seconds
    const intervalId = setInterval(() => {
      fetchNotifications();
    }, 15000);

    return () => clearInterval(intervalId);
  }, []);

  const fetchNotifications = async () => {
    try {
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      const patientId = userData.id || userData._id;

      if (!patientId) {
        console.error('No patient ID found');
        setLoading(false);
        return;
      }

      const response = await API.get(`/notifications/patient/${patientId}`);
      console.log('Notifications Response:', response.data);

      if (response.data && response.data.success) {
        setNotifications(response.data.notifications || []);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await API.put(`/notifications/${notificationId}/read`);
      // Update local state
      setNotifications(notifications.map(notif =>
        notif._id === notificationId ? { ...notif, is_read: true } : notif
      ));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      const patientId = userData.id || userData._id;

      await API.put(`/notifications/patient/${patientId}/read-all`);
      // Update local state
      setNotifications(notifications.map(notif => ({ ...notif, is_read: true })));
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      await API.delete(`/notifications/${notificationId}`);
      setNotifications(notifications.filter(notif => notif._id !== notificationId));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const getNotificationIcon = (type) => {
    // Icons removed for professional appearance
    return '';
  };

  const getNotificationTitle = (notification) => {
    if (notification.title) return notification.title;

    switch (notification.type) {
      case 'appointment':
        return 'Appointment Update';
      case 'appointment_accepted':
        return 'Appointment Approved';
      case 'appointment_rejected':
        return 'Appointment Declined';
      case 'appointment_rescheduled':
        return 'Appointment Rescheduled';
      case 'appointment_cancelled':
        return 'Appointment Cancelled';
      case 'reminder':
        return 'Reminder';
      case 'report':
        return 'Report Ready';
      case 'message':
        return 'New Message';
      case 'prescription':
        return 'New Prescription';
      case 'system':
        return 'System Notification';
      default:
        return 'Notification';
    }
  };

  const getSenderInfo = (notification) => {
    // Use new sender fields first, fallback to legacy fields
    if (notification.sender_name) {
      return `From: ${notification.sender_name}`;
    }
    if (notification.sender_type === 'System') {
      return 'From: MEDviz System';
    }
    if (notification.doctor_id && notification.doctor_id.full_name) {
      return `From: Dr. ${notification.doctor_id.full_name} ${notification.doctor_id.last_name}`;
    }
    return null;
  };

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  const filteredNotifications = filterType === 'all'
    ? notifications
    : filterType === 'unread'
    ? notifications.filter(n => !n.is_read)
    : filterType === 'appointment'
    ? notifications.filter(n =>
        n.type === 'appointment' ||
        n.type === 'appointment_accepted' ||
        n.type === 'appointment_rejected' ||
        n.type === 'appointment_rescheduled' ||
        n.type === 'appointment_cancelled'
      )
    : notifications.filter(n => n.type === filterType);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="notifications-page">
      <Header />
      <div className="notifications-container">
        <BackButton />
        <div className="notifications-header">
          <div>
            <h1>Notifications</h1>
            <p className="notifications-subtitle">
              {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
            </p>
          </div>
          {unreadCount > 0 && (
            <button className="mark-all-read-btn" onClick={markAllAsRead}>
              Mark All as Read
            </button>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="notification-filters">
          <button
            className={`filter-btn ${filterType === 'all' ? 'active' : ''}`}
            onClick={() => setFilterType('all')}
          >
            All ({notifications.length})
          </button>
          <button
            className={`filter-btn ${filterType === 'unread' ? 'active' : ''}`}
            onClick={() => setFilterType('unread')}
          >
            Unread ({unreadCount})
          </button>
          <button
            className={`filter-btn ${filterType === 'appointment' ? 'active' : ''}`}
            onClick={() => setFilterType('appointment')}
          >
            Appointments ({notifications.filter(n =>
              n.type === 'appointment' ||
              n.type === 'appointment_accepted' ||
              n.type === 'appointment_rejected' ||
              n.type === 'appointment_rescheduled' ||
              n.type === 'appointment_cancelled'
            ).length})
          </button>
        </div>

        {/* Notifications List */}
        <div className="notifications-list">
          {loading ? (
            <div className="loading-state">
              <div className="loader"></div>
              <p>Loading notifications...</p>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon"></div>
              <h3>No notifications</h3>
              <p>
                {filterType === 'unread'
                  ? "You're all caught up!"
                  : 'No notifications yet. Check back later!'}
              </p>
            </div>
          ) : (
            filteredNotifications.map((notification) => (
              <div
                key={notification._id}
                className={`notification-card ${!notification.is_read ? 'unread' : ''}`}
                onClick={() => !notification.is_read && markAsRead(notification._id)}
              >
                <div className="notification-icon">
                  {getNotificationIcon(notification.type)}
                </div>
                <div className="notification-content">
                  <div className="notification-header-row">
                    <h3 className="notification-title">
                      {getNotificationTitle(notification)}
                    </h3>
                    <span className="notification-time">
                      {formatTimeAgo(notification.created_at)}
                    </span>
                  </div>
                  <p className="notification-message">{notification.message}</p>
                  {getSenderInfo(notification) && (
                    <p className="notification-sender">
                      {getSenderInfo(notification)}
                    </p>
                  )}
                  {!notification.is_read && (
                    <span className="unread-indicator">●</span>
                  )}
                </div>
                <button
                  className="delete-notification-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteNotification(notification._id);
                  }}
                >
                  ×
                </button>
              </div>
            ))
          )}
        </div>

        {/* Quick Actions */}
        <div className="notification-actions">
          <button
            className="action-btn primary"
            onClick={() => navigate('/patient/appointments')}
          >
            View All Appointments
          </button>
          <button
            className="action-btn secondary"
            onClick={() => navigate('/patient/dashboard')}
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default Notifications;
