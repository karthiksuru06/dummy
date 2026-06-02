import React from 'react';
import { Outlet } from 'react-router-dom';
import PatientHeader from '../patient/PatientHeader/Header';

const PatientLayout = () => {
  return (
    <div className="patient-portal-layout" style={{ background: '#F5F7FA', minHeight: '100vh', paddingTop: '64px' }}>
      <PatientHeader />
      <Outlet />
    </div>
  );
};

export default PatientLayout;
