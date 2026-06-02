import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  FiHome,
  FiUsers,
  FiUserCheck,
  FiBarChart2,
  FiFileText,
  FiLogOut,
  FiMenu,
  FiX
} from 'react-icons/fi';
import './AdminLayout.css';
import '../AdminTheme.css';

const AdminLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const navigate = useNavigate();

  const handleLogout = () => {
    console.log('Logging out admin...');
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = '/admin-login';
  };

  const menuItems = [
    { path: '/admin/home', icon: <FiHome />, label: 'Home' },
    { path: '/admin/patients', icon: <FiUsers />, label: 'Patients' },
    { path: '/admin/doctors', icon: <FiUserCheck />, label: 'Doctors' },
    { path: '/admin/analytics', icon: <FiBarChart2 />, label: 'Analytics' },
    { path: '/admin/medical-records', icon: <FiFileText />, label: 'Medical Records' }
  ];

  return (
    <div className="admin-layout premium-theme">
      {/* HEADER */}
      <header className="admin-header">
        <div className="admin-header-left">
          <button
            className="admin-menu-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            aria-expanded={sidebarOpen}
          >
            {sidebarOpen ? <FiX aria-hidden="true" /> : <FiMenu aria-hidden="true" />}
          </button>
          <h1 className="admin-logo">MEDviz Admin</h1>
        </div>

        <div className="admin-header-right">
          <span className="admin-name">Admin</span>
        </div>
      </header>

      {/* SIDEBAR */}
      <aside className={`admin-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <ul className="admin-sidebar-nav">
          {menuItems.map(item => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                className= {({ isActive }) =>
                  isActive ? 'admin-nav-link active' : 'admin-nav-link'
                }
              >
                <span className="admin-nav-icon" aria-hidden="true">{item.icon}</span>
                <span
                  className="admin-nav-label"
                  style={{ display: 'inline-block', opacity: 1, visibility: 'visible', fontSize: '0.95rem', color: 'inherit' }}
                >
                  {item.label}
                </span>
              </NavLink>
            </li>
          ))}
        </ul>

        <button className="admin-logout-btn" onClick={handleLogout}>
          <FiLogOut />
          <span>Logout</span>
        </button>
      </aside>

      {/* MAIN */}
      <main className="admin-main">
        <Outlet />
      </main>

      {/* MOBILE OVERLAY */}
      {sidebarOpen && <div className="admin-sidebar-overlay" onClick={() => setSidebarOpen(false)} />}
    </div>
  );
};

export default AdminLayout;