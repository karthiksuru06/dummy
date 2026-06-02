import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaHome, FaUsers, FaCalendarCheck, FaTasks,
  FaBell, FaUser, FaCog, FaBars, FaTimes,
  FaSignOutAlt, FaShieldAlt, FaChevronDown
} from 'react-icons/fa';
import './DoctorNavbar.css';
import logo from '../../../logo.png';
import doctorService from '../../../services/doctorService';

const DoctorNavbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [doctorData, setDoctorData] = useState({
    name: 'Dr. Practitioner',
    specialty: 'Medical Specialist',
    profilePic: '',
    id: null
  });
  
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    if (userData) {
      setDoctorData({
        name: `Dr. ${userData.full_name || 'Practitioner'}`,
        specialty: userData.specialization || 'Healthcare Provider',
        profilePic: userData.profile_picture || '',
        id: userData._id || userData.id
      });

      if (userData._id || userData.id) {
        fetchNotificationCount(userData._id || userData.id);
      }
    }
  }, []);

  const fetchNotificationCount = async (doctorId) => {
    try {
      const response = await doctorService.getUnreadNotificationCount(doctorId);
      setNotificationCount(response.count || 0);
    } catch (error) {
      setNotificationCount(0);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = '/login';
  };

  const navItems = [
    { path: '/doctor/home', label: 'Dashboard', icon: FaHome },
    { path: '/doctor/patients', label: 'Patients', icon: FaUsers },
    { path: '/doctor/appointments', label: 'Appointments', icon: FaCalendarCheck },
    { path: '/doctor/pending-tasks', label: 'Workflow', icon: FaTasks },
  ];

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

  return (
    <nav className="dr-navbar-main">
      <div className="dr-nav-container">
        
        {/* 🏔 Brand Section */}
        <div className="dr-nav-brand" onClick={() => navigate('/doctor/home')}>
          <div className="dr-nav-logo-box">
            <img src={logo} alt="MEDviz" />
          </div>
          <h2 className="dr-nav-title">MEDviz</h2>
        </div>

        {/* 🧭 Desktop Navigation */}
        <div className="dr-nav-links-desktop">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link 
                key={item.path} 
                to={item.path} 
                className={`dr-desktop-link ${isActive ? 'is-active' : ''}`}
              >
                {item.label}
                {isActive && <motion.div layoutId="nav-underline" className="nav-underline" />}
              </Link>
            );
          })}
        </div>

        {/* 👤 Right Actions */}
        <div className="dr-nav-actions">
          <div className="dr-nav-icon-btn dr-bell-active" onClick={() => navigate('/doctor/notifications')}>
            <FaBell />
            {notificationCount > 0 && <span className="dr-nav-badge">{notificationCount}</span>}
          </div>

          <div className="dr-nav-profile-trigger" onClick={() => setIsProfileOpen(!isProfileOpen)}>
            <div className="dr-nav-avatar">
              {doctorData.profilePic ? (
                <img src={doctorData.profilePic} alt="Profile" />
              ) : (
                <div className="dr-avatar-init">{doctorData.name[4]}</div>
              )}
              <div className="dr-online-bullet" />
            </div>
            <div className="dr-nav-user-info">
              <span className="dr-nav-name">{doctorData.name.split(' ')[1]}</span>
              <FaChevronDown className={`dr-chevron ${isProfileOpen ? 'rotate' : ''}`} />
            </div>

            <AnimatePresence>
              {isProfileOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="dr-profile-dropdown"
                >
                  <div className="dr-dropdown-header">
                    <h4>{doctorData.name}</h4>
                    <p>{doctorData.specialty}</p>
                  </div>
                  <div className="dr-dropdown-body">
                    <button onClick={() => navigate('/doctor/profile')}><FaUser /> My Profile</button>
                    <button onClick={() => navigate('/doctor/settings')}><FaCog /> Settings</button>
                    <div className="dr-dropdown-divider" />
                    <button className="dr-logout-btn" onClick={handleLogout}><FaSignOutAlt /> Sign Out</button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* 🍔 Hamburger */}
          <button className="dr-hamburger" onClick={toggleMobileMenu}>
            {isMobileMenuOpen ? <FaTimes /> : <FaBars />}
          </button>
        </div>
      </div>

      {/* 📱 Mobile Menu Dropdown */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="dr-mobile-menu"
          >
            <div className="dr-mobile-links">
              {navItems.map((item) => (
                <Link 
                  key={item.path} 
                  to={item.path} 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={location.pathname === item.path ? 'is-active' : ''}
                >
                  <item.icon /> {item.label}
                </Link>
              ))}
              <div className="dr-mobile-divider" />
              <Link to="/doctor/profile" onClick={() => setIsMobileMenuOpen(false)}><FaUser /> Profile</Link>
              <Link to="/doctor/settings" onClick={() => setIsMobileMenuOpen(false)}><FaCog /> Settings</Link>
              <button className="dr-mobile-logout" onClick={handleLogout}><FaSignOutAlt /> Sign Out</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default DoctorNavbar;