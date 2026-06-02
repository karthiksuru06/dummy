import React, { useState, useEffect, useRef, useCallback } from 'react';
import './Header.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBell,
  faCircleUser,   // 👈 ADD THIS
  faCog,
  faSignOutAlt,
  faCalendarAlt,
  faUser,
  faTimes
} from '@fortawesome/free-solid-svg-icons';
import { useNavigate, useLocation } from 'react-router-dom';
import API from '../../../api/axiosConfig';


function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [avatarDropdownOpen, setAvatarDropdownOpen] = useState(false);
  const [activeNav, setActiveNav] = useState('Home');
  const [notificationCount, setNotificationCount] = useState(3);
  const [activeDropdownItem, setActiveDropdownItem] = useState(null);

  const avatarRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Set activeNav based on current route
  useEffect(() => {
    const pathname = location.pathname;
    if (pathname.includes('/patient/dashboard') || pathname === '/patient') {
      setActiveNav('Home');
    } else if (pathname.includes('/patient/chatbot')) {
      setActiveNav('Chatbot');
    } else if (pathname.includes('/patient/appointments')) {
      setActiveNav('Book Appointments');
    }
  }, [location.pathname]);

  // Close avatar dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (avatarRef.current && !avatarRef.current.contains(event.target)) {
        setAvatarDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Prevent body scroll when mobile menu open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : 'unset';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [menuOpen]);

  // Close menus with Escape key
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        setAvatarDropdownOpen(false);
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const handleHamburgerClick = useCallback(() => {
    setMenuOpen((prev) => {
      const next = !prev;
      if (next) setAvatarDropdownOpen(false); // avoid overlap
      return next;
    });
  }, []);

  const handleNavClick = useCallback(
    (event, navItem) => {
      if (event?.preventDefault) event.preventDefault();

      setActiveNav(navItem);
      setMenuOpen(false);

      if (navItem === 'Home') navigate('/patient/dashboard');
      if (navItem === 'Chatbot') navigate('/patient/chatbot');
      if (navItem === 'Book Appointments') navigate('/patient/appointments');
    },
    [navigate]
  );

  const handleAvatarClick = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation(); // prevent odd bubbling
    setAvatarDropdownOpen((prev) => {
      const next = !prev;
      if (next) setMenuOpen(false); // avoid overlap with mobile nav
      return next;
    });
  }, []);

  const handleNotificationClick = useCallback(() => {
    navigate('/patient/notifications');
    setNotificationCount(0);
    setMenuOpen(false);
  }, [navigate]);

  const handleLogout = useCallback(() => {
    console.log('Logging out...');
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = '/login';
  }, []);

  const handleDropdownItemClick = useCallback(
    (event, action) => {
      if (event?.preventDefault) event.preventDefault();
      if (event?.stopPropagation) event.stopPropagation();

      setActiveDropdownItem(action);
      setAvatarDropdownOpen(false);

      if (action === 'logout') {
        handleLogout();
        return;
      }

      // Small delay for others to show active state
      setTimeout(() => {
        switch (action) {
          case 'profile':
            navigate('/patient/profile');
            break;
          case 'reports':
            navigate('/patient/reports');
            break;
          case 'settings':
            navigate('/patient/settings');
            break;
          default:
            break;
        }
      }, 100);
    },
    [navigate, handleLogout]
  );

  const [patientProfile, setPatientProfile] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const userData = JSON.parse(localStorage.getItem('user') || '{}');
        const patientId = userData.id || userData._id;
        if (patientId) {
          const res = await API.get(`/patient/${patientId}/profile`);
          if (res.data && res.data.success) {
            setPatientProfile(res.data.profile);
          }
        }
      } catch (err) {
        console.error('Error fetching profile in header:', err);
      }
    };
    fetchProfile();
  }, []);

  const renderAvatar = () => {
    if (patientProfile?.profile_photo || patientProfile?.image) {
      return <img src={patientProfile.profile_photo || patientProfile.image} alt="P" className="nav-avatar-img" />;
    }
    return <span className="nav-avatar-initial">{(patientProfile?.full_name || 'K').charAt(0).toUpperCase()}</span>;
  };

  return (
    <>
      <header className="patient-header" role="banner">
        <div
          className="patient-logo"
          role="button"
          tabIndex={0}
          onClick={(e) => handleNavClick(e, 'Home')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') handleNavClick(e, 'Home');
          }}
        >
          <span className="patient-sr-only">MEDviz - Healthcare Platform</span>
          MEDviz
        </div>

        <div className="patient-header-right">
          {/* Desktop Navigation */}
          <nav className="patient-nav" role="navigation" aria-label="Main navigation">
            <a
              href="#"
              className={`header-nav-link ${activeNav === 'Home' ? 'active' : ''}`}
              onClick={(e) => handleNavClick(e, 'Home')}
            >
              Home
            </a>

            <a
              href="#"
              className={`header-nav-link ${activeNav === 'Chatbot' ? 'active' : ''}`}
              onClick={(e) => handleNavClick(e, 'Chatbot')}
            >
              Chatbot
            </a>

            <a
              href="#"
              className={`header-nav-link ${activeNav === 'Book Appointments' ? 'active' : ''}`}
              onClick={(e) => handleNavClick(e, 'Book Appointments')}
            >
              Book Appointments
            </a>

            {/* Notification Bell - Inside Nav */}
            <button
              type="button"
              className="patient-notification-bell"
              onClick={handleNotificationClick}
              aria-label="Notifications"
            >
              <FontAwesomeIcon icon={faBell} color="#fff" size="lg" />
              {notificationCount > 0 && (
                <span className="patient-notification-badge" aria-label={`${notificationCount} new notifications`}>
                  {notificationCount > 9 ? '9+' : notificationCount}
                </span>
              )}
            </button>

            {/* Profile Avatar - Inside Nav */}
            <div className="patient-avatar" ref={avatarRef}>
              <button
                type="button"
                className="patient-avatar-btn"
                onClick={handleAvatarClick}
                aria-haspopup="menu"
                aria-expanded={avatarDropdownOpen}
                aria-label="Open profile menu"
              >
                {renderAvatar()}
              </button>

              <div
                className={`avatar-dropdown ${avatarDropdownOpen ? 'show' : ''}`}
                role="menu"
                onClick={(e) => e.stopPropagation()} // keep dropdown clicks from bubbling
              >
                <a
                  href="#"
                  role="menuitem"
                  className={`dropdown-item ${activeDropdownItem === 'profile' ? 'active' : ''}`}
                  onClick={(e) => handleDropdownItemClick(e, 'profile')}
                >
                  <FontAwesomeIcon icon={faUser} /> Profile
                </a>

                <a
                  href="#"
                  role="menuitem"
                  className={`dropdown-item ${activeDropdownItem === 'reports' ? 'active' : ''}`}
                  onClick={(e) => handleDropdownItemClick(e, 'reports')}
                >
                  <FontAwesomeIcon icon={faCalendarAlt} /> Reports
                </a>

                <a
                  href="#"
                  role="menuitem"
                  className={`dropdown-item ${activeDropdownItem === 'settings' ? 'active' : ''}`}
                  onClick={(e) => handleDropdownItemClick(e, 'settings')}
                >
                  <FontAwesomeIcon icon={faCog} /> Settings
                </a>

                <a
                  href="#"
                  role="menuitem"
                  className={`dropdown-item ${activeDropdownItem === 'logout' ? 'active' : ''}`}
                  onClick={(e) => handleDropdownItemClick(e, 'logout')}
                >
                  <FontAwesomeIcon icon={faSignOutAlt} /> Logout
                </a>
              </div>
            </div>
          </nav>

          {/* Mobile Hamburger */}
          <div className="patient-header-actions">
            <button
              type="button"
              className="patient-hamburger"
              onClick={handleHamburgerClick}
              aria-label="Toggle navigation menu"
              aria-expanded={menuOpen}
            >
              <span
                style={{
                  transform: menuOpen ? 'rotate(45deg) translate(6px, 6px)' : 'none'
                }}
              />
              <span style={{ opacity: menuOpen ? 0 : 1 }} />
              <span
                style={{
                  transform: menuOpen ? 'rotate(-45deg) translate(7px, -7px)' : 'none'
                }}
              />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Navigation */}
      <div className={`mobile-nav${menuOpen ? ' open' : ''}`}>
        <button
          type="button"
          className="patient-close-button"
          onClick={() => setMenuOpen(false)}
          aria-label="Close menu"
        >
          <FontAwesomeIcon icon={faTimes} />
        </button>

        <a
          href="#"
          className={`header-nav-link ${activeNav === 'Home' ? 'active' : ''}`}
          onClick={(e) => handleNavClick(e, 'Home')}
        >
          Home
        </a>

        <a
          href="#"
          className={`header-nav-link ${activeNav === 'Chatbot' ? 'active' : ''}`}
          onClick={(e) => handleNavClick(e, 'Chatbot')}
        >
          Chatbot
        </a>

        <a
          href="#"
          className={`header-nav-link ${activeNav === 'Book Appointments' ? 'active' : ''}`}
          onClick={(e) => handleNavClick(e, 'Book Appointments')}
        >
          Book Appointments
        </a>

        <a
          href="#"
          className="header-nav-link logout-nav-link"
          onClick={(e) => {
            e.preventDefault();
            handleLogout();
          }}
          style={{ color: '#ff6b6b' }} // Slightly different to indicate logout
        >
          Logout
        </a>

        <div className="patient-mobile-header-icons">
          <button
            type="button"
            className="patient-notification"
            onClick={handleNotificationClick}
            aria-label="Notifications"
          >
            <FontAwesomeIcon icon={faBell} color="#fff" size="lg" />
            {notificationCount > 0 && (
              <span className="patient-notification-badge">
                {notificationCount > 9 ? '9+' : notificationCount}
              </span>
            )}
          </button>

          <button
            type="button"
            className="patient-avatar"
            onClick={() => {
              setMenuOpen(false);
              navigate('/patient/profile');
            }}
            aria-label="Go to profile"
          >
            {renderAvatar()}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div
          className="patient-mobile-nav-backdrop"
          onClick={() => setMenuOpen(false)}
          role="presentation"
        />
      )}
    </>
  );
}

export default Header;