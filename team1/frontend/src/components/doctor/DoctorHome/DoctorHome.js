import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaCalendarAlt, FaUserMd, FaClipboardCheck, FaBell,
  FaClock, FaCheckCircle, FaExclamationCircle, FaUserInjured, 
  FaArrowRight, FaChartLine, FaTimesCircle, FaUsers,
  FaSearch, FaFileMedical, FaStickyNote, FaPlus, FaBolt, FaStethoscope
} from 'react-icons/fa';
import { MdToday, MdTrendingUp, MdSpaceDashboard, MdLibraryAdd } from 'react-icons/md';
import './DoctorHome.css';
import doctorService from '../../../services/doctorService';

const DoctorHome = () => {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState({
    upcomingAppointments: [],
    pendingApprovals: [],
    consultationMetrics: {
      totalConsultations: 0,
      monthConsultations: 0,
      todayAppointments: 0,
      pendingApprovals: 0
    },
    notifications: []
  });
  const [loading, setLoading] = useState(true);
  const [doctorInfo, setDoctorInfo] = useState(null);
  const [memo, setMemo] = useState("");
  const [activeTab, setActiveTab] = useState('queue');
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user'));
    if (userData) {
      setDoctorInfo(userData);
      fetchDashboardData(userData._id || userData.id);
    }
  }, []);

  const formatRelativeTime = (timestamp) => {
    if (!timestamp) return '';
    const diffMs = Date.now() - new Date(timestamp).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  const fetchDashboardData = async (doctorId) => {
    try {
      setLoading(true);
      let metricsRes = { metrics: null };
      let upcomingRes = { appointments: [] };
      let pendingRes = { appointments: [] };
      let notificationsRes = { notifications: [] };

      try { metricsRes = await doctorService.getDashboardData(doctorId); } catch (err) { console.error(err); }
      try { upcomingRes = await doctorService.getUpcomingAppointments(doctorId); } catch (err) { console.error(err); }
      try { pendingRes = await doctorService.getAppointmentsByStatus(doctorId, 'pending'); } catch (err) { console.error(err); }
      try { notificationsRes = await doctorService.getNotifications(doctorId); } catch (err) { console.error(err); }

      const formattedUpcoming = upcomingRes.appointments?.slice(0, 5).map(apt => ({
        id: apt._id,
        patientName: apt.patient_name,
        time: apt.appointment_time,
        type: apt.service_type,
        status: apt.status
      })) || [];

      const formattedPending = pendingRes.appointments?.slice(0, 4).map(apt => ({
        id: apt._id,
        patientName: apt.patient_name,
        requestedTime: apt.appointment_time,
        reason: apt.reason || 'General Checkup'
      })) || [];

      const formattedNotifications = notificationsRes.notifications?.slice(0, 5).map(notif => ({
        id: notif._id,
        message: notif.message,
        time: formatRelativeTime(notif.created_at),
        unread: !notif.is_read
      })) || [];

      setDashboardData({
        upcomingAppointments: formattedUpcoming,
        pendingApprovals: formattedPending,
        consultationMetrics: metricsRes.metrics || {
          totalConsultations: 0,
          monthConsultations: 0,
          todayAppointments: 0,
          pendingApprovals: 0
        },
        notifications: formattedNotifications
      });

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const pushToast = (message, type) => {
    const newNotif = { id: Date.now(), message, type };
    setNotifications(prev => [newNotif, ...prev]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== newNotif.id));
    }, 3000);
  };

  const handleAction = async (id, type) => {
    try {
      if (type === 'approve') {
        await doctorService.approveAppointment(id);
      } else {
        await doctorService.rejectAppointment(id);
      }

      setDashboardData(prev => ({
        ...prev,
        pendingApprovals: prev.pendingApprovals.filter(a => a.id !== id)
      }));

      pushToast(type === 'approve' ? 'Appointment Confirmed' : 'Request Declined', type);
    } catch (error) {
      console.error('Error updating appointment:', error);
      pushToast(type === 'approve' ? 'Failed to confirm appointment' : 'Failed to decline request', 'reject');
    }
  };

  if (loading) {
    return (
      <div className="dr-loading-overlay">
        <div className="loader-box">
          <div className="loader-pulse" />
          <h2>Commanding Portal...</h2>
        </div>
      </div>
    );
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.08 } }
  };

  const cardVariants = {
    hidden: { scale: 0.95, opacity: 0 },
    show: { scale: 1, opacity: 1, transition: { duration: 0.5, ease: "easeOut" } }
  };

  return (
    <motion.div 
      initial="hidden" 
      animate="show" 
      variants={containerVariants} 
      className="dr-prestige-dashboard"
    >
      {/* 🔔 Contextual Toast Hub */}
      <div className="dr-toast-hub">
        <AnimatePresence>
          {notifications.map(n => (
            <motion.div 
              key={n.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className={`dr-toast ${n.type}`}
            >
              {n.type === 'approve' ? <FaCheckCircle /> : <FaTimesCircle />}
              <span>{n.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="dr-dashboard-header-flex">
        <motion.div variants={cardVariants} className="dr-prestige-greeting">
          <h1>Good Day, Dr. {doctorInfo?.full_name?.split(' ')[0] || 'seershika'}</h1>
          <p className="dr-greeting-subtext">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
        </motion.div>
        
        <motion.button 
           whileHover={{ scale: 1.05 }}
           whileTap={{ scale: 0.95 }}
           className="dr-quick-add"
           onClick={() => navigate('/doctor/appointments')}
        >
           <FaPlus /> <span>New Session</span>
        </motion.button>
      </div>

      {/* 🚀 High-Octane Metric Hub */}
      <div className="dr-metrics-grid">
         {[
           { label: 'Consultations', val: dashboardData.consultationMetrics.totalConsultations, icon: <FaChartLine />, color: '#6366f1', path: '/doctor/patients' },
           { label: 'This Month', val: dashboardData.consultationMetrics.monthConsultations, icon: <MdTrendingUp />, color: '#10b981', path: '/doctor/appointments' },
           { label: 'Today\'s Load', val: dashboardData.consultationMetrics.todayAppointments, icon: <FaUserInjured />, color: '#0ea5e9', path: '/doctor/appointments' },
           { label: 'Inbox Status', val: dashboardData.pendingApprovals.length, icon: <FaBell />, color: '#f43f5e', path: '/doctor/appointments' }
         ].map((stat, i) => (
           <motion.div
             key={i}
             variants={cardVariants}
             whileHover={{ y: -5, boxShadow: "0 10px 25px -5px rgba(0,0,0,0.05)" }}
             className="dr-metric-pill"
             onClick={() => navigate(stat.path)}
           >
              <div className="pill-icon" style={{ backgroundColor: `${stat.color}15`, color: stat.color }}>{stat.icon}</div>
              <div className="pill-data">
                 <p>{stat.label}</p>
                 <h2>{stat.val}</h2>
              </div>
           </motion.div>
         ))}
      </div>

      {/* 🍱 PRESTIGE BENTO GRID */}
      <div className="dr-bento-prestige">
        
        {/* 01: Live Patient Queue (The Big Card) */}
        <motion.section variants={cardVariants} className="bento-card x-span-2 y-span-2 dr-queue-prestige">
           <div className="card-head">
              <h3><MdToday /> Clinical Queue</h3>
              <button className="head-btn" onClick={() => navigate('/doctor/appointments')}>Full History</button>
           </div>
           <div className="card-body scrollable">
              {dashboardData.upcomingAppointments.length > 0 ? (
                dashboardData.upcomingAppointments.map((apt, i) => (
                  <div key={apt.id} className="dr-patient-row">
                     <div className="p-time">{apt.time.split(' ')[0]}</div>
                     <div className="p-info">
                        <h4>{apt.patientName}</h4>
                        <p>{apt.type}</p>
                     </div>
                     <div className="p-action">
                        <span className={`status-pill ${apt.status}`}>{apt.status[0]}</span>
                     </div>
                  </div>
                ))
              ) : <div className="empty-prestige">Clinic Clear</div>}
           </div>
        </motion.section>

        {/* 02: Pending Requests (The Action Card) */}
        <motion.section variants={cardVariants} className="bento-card dr-approval-prestige">
           <div className="card-head">
              <h3>Inbox Review</h3>
              <span className="badge-red">{dashboardData.pendingApprovals.length}</span>
           </div>
           <div className="card-body">
              <div className="req-stack">
                 {dashboardData.pendingApprovals.length > 0 ? dashboardData.pendingApprovals.slice(0, 3).map(req => (
                   <motion.div 
                     layout
                     initial={{ opacity: 0, x: -10 }}
                     animate={{ opacity: 1, x: 0 }}
                     key={req.id} 
                     className="req-row"
                   >
                      <div className="req-meta">
                        <h4>{req.patientName.split(' ')[0]}</h4>
                         <p>{req.requestedTime}</p>
                      </div>
                      <div className="req-actions">
                         <button className="confirm-btn" onClick={() => handleAction(req.id, 'approve')}><FaCheckCircle size={18} /></button>
                         <button className="reject-btn" onClick={() => handleAction(req.id, 'reject')}><FaTimesCircle size={18} /></button>
                      </div>
                   </motion.div>
                 )) : <div className="empty-prestige">Inbox Clear</div>}
              </div>
              <button className="view-more-btn" onClick={() => navigate('/doctor/appointments')}>Respond to all</button>
           </div>
        </motion.section>

        <motion.section variants={cardVariants} className="bento-card dr-commands-prestige">
           <div className="card-head">
              <h3>Command Center</h3>
           </div>
           <div className="hub-grid">
              {[
                { lbl: 'Registry', ico: <FaUsers size={28} />, path: '/doctor/patients', col: '#6366f1' },
                { lbl: 'Clinical', ico: <FaFileMedical size={28} />, path: '/doctor/patients', col: '#10b981' },
                { lbl: 'Roster', ico: <FaCalendarAlt size={28} />, path: '/doctor/appointments', col: '#0ea5e9' },
                { lbl: 'Inbox', ico: <FaBell size={28} />, path: '/doctor/notifications', col: '#f43f5e' }
              ].map((h, i) => (
                <div key={i} className="hub-tile" onClick={() => navigate(h.path)}>
                   <div className="hub-ico" style={{ color: h.col }}>{h.ico}</div>
                   <p>{h.lbl}</p>
                </div>
              ))}
           </div>
        </motion.section>

        {/* 04: Clinical Memo (The Tool Card) */}
        <motion.section variants={cardVariants} className="bento-card dr-memo-prestige">
           <div className="card-head">
              <h3><FaStickyNote /> Digital Slate</h3>
              <span className="auto-save">SAVED</span>
           </div>
           <textarea 
             value={memo} 
             onChange={(e) => setMemo(e.target.value)}
             placeholder="Notes..."
           />
        </motion.section>

        {/* 05: Recent Activity (notifications feed) */}
        <motion.section variants={cardVariants} className="bento-card dr-feed-prestige">
           <div className="card-head">
              <h3>Recent Activity</h3>
           </div>
           <div className="insight-body">
              {dashboardData.notifications.length > 0 ? (
                dashboardData.notifications.map(notif => (
                  <div key={notif.id} className={`activity-row ${notif.unread ? 'unread' : ''}`}>
                     <p className="activity-msg">{notif.message}</p>
                     {notif.time && <span className="activity-time">{notif.time}</span>}
                  </div>
                ))
              ) : <div className="empty-prestige">No activity yet</div>}
           </div>
        </motion.section>

      </div>
    </motion.div>
  );
};

export default DoctorHome;