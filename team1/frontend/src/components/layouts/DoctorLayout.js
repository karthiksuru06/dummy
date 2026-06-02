import React from 'react';
import { Outlet } from 'react-router-dom';
import DoctorNavbar from '../doctor/DoctorNavbar/DoctorNavbar';
import './DoctorLayout.css';

const DoctorLayout = () => {
  return (
    <div className="doctor-layout">
      <DoctorNavbar />
      <div className="doctor-content">
        <Outlet />
      </div>
    </div>
  );
};

export default DoctorLayout;
