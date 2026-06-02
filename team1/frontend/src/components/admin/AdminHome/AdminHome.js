import React, { useState, useEffect } from 'react';
import {
  FiUsers,
  FiUserCheck,
  FiUserPlus,
  FiFileText,
  FiCheck,
  FiTrendingUp
} from 'react-icons/fi';
import API from '../../../api/axiosConfig';
import './AdminHome.css';
import '../AdminTheme.css';

const AdminHome = () => {
  const [metrics, setMetrics] = useState({
    patients: { total: 0, todayCases: 0 },
    doctors: { total: 0, scheduled: 0 },
    prescriptions: { total: 0, addedToday: 0 },
    reports: { total: 0, updated: 0 }
  });

  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAllActivities, setShowAllActivities] = useState(false);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const response = await API.get('/admin/metrics');

      if (response.data.success) {
        setMetrics(response.data.metrics);
        setRecentActivity(response.data.recentActivity || []);
      }
    } catch (error) {
      console.error('Error fetching metrics', error);
    } finally {
      setLoading(false);
    }
  };

  const visibleActivities = showAllActivities
    ? recentActivity
    : recentActivity.slice(0, 4);

  return (
    <div className="admin-home premium-theme">
      {/* Header */}
      <div className="admin-page-header">
        <h1>Admin Dashboard Overview</h1>
        <p className="admin-page-subtitle">
          Welcome back! Here's what's happening today
        </p>
      </div>

      {/* Metrics */}
      <div className="admin-metrics-grid">
        <MetricCard
          icon={<FiUsers />}
          title="Patients"
          value={metrics.patients.total}
          detail={`${metrics.patients.todayCases} cases solved today`}
          type="patients"
        />
        <MetricCard
          icon={<FiUserCheck />}
          title="Doctors"
          value={metrics.doctors.total}
          detail={`${metrics.doctors.scheduled} scheduled today`}
          type="doctors"
        />
        <MetricCard
          icon={<FiFileText />}
          title="Prescriptions"
          value={metrics.prescriptions.total}
          detail={`${metrics.prescriptions.addedToday} added today`}
          type="prescriptions"
        />
        <MetricCard
          icon={<FiTrendingUp />}
          title="Reports"
          value={metrics.reports.total}
          detail={`${metrics.reports.updated} updated consultations`}
          type="reports"
        />
      </div>

      {/* Recent Activity */}
      <div className="admin-recent-activity">
        <h2>Recent Activity</h2>

        {loading ? (
          <p className="admin-activity-loading">Loading...</p>
        ) : recentActivity.length === 0 ? (
          <p className="admin-no-activity">No recent activity</p>
        ) : (
          <>
            <div className="admin-activity-list">
              {visibleActivities.map((activity, index) => (
                <div key={index} className="admin-activity-item">
                  <div className={`admin-activity-icon ${activity.type}`}>
                    {activity.type === 'doctor_approved' && <FiUserCheck />}
                    {activity.type === 'doctor_registered' && <FiUserPlus />}
                    {activity.type === 'patient_registered' && <FiUsers />}
                    {activity.type === 'prescription_added' && <FiFileText />}
                    {!['doctor_approved','doctor_registered','patient_registered','prescription_added'].includes(activity.type) && (
                      <FiCheck />
                    )}
                  </div>

                  <div className="admin-activity-content">
                    <p className="admin-activity-title">{activity.title}</p>
                    <p className="admin-activity-time">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>

            {recentActivity.length > 4 && (
              <div className="admin-view-all-wrapper">
                <span
                  className="admin-view-all-link"
                  onClick={() => setShowAllActivities(!showAllActivities)}
                >
                  {showAllActivities ? 'Show Less' : 'View All'}
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

/* Reusable Metric Card */
const MetricCard = ({ icon, title, value, detail, type }) => (
  <div className="admin-metric-card">
    <div className={`admin-metric-icon ${type}`}>{icon}</div>
    <div className="admin-metric-content">
      <h3>{title}</h3>
      <div className="admin-metric-value">{value}</div>
      <div className="admin-metric-detail">{detail}</div>
    </div>
  </div>
);

export default AdminHome;