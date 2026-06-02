import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

// Doctor Dashboard Theme
import "./components/doctor/doctorTheme.css";
import "./components/doctor/doctorColorOverride.css";

// Landing page components
import Header from "./components/landingpage/header/header";
import Home from "./components/landingpage/herohomepage/home";
import Service from "./components/landingpage/ourservice/service";
import About from "./components/landingpage/aboutus/about";
import Doctor from "./components/landingpage/doctors/doc";
import Getintouch from "./components/landingpage/getin/contact";
import Footer from "./components/landingpage/footer/footer";
import AdminLogin from './components/pages/AdminLogin/AdminLogin';

// Auth pages
import Login from "./components/pages/login/login";
import ForgotPassword from "./components/pages/login/ForgotPassword";
import Register from "./components/pages/Register/register";

// Patient components
import PatientLayout from "./components/layouts/PatientLayout";
import HealthcareDashboard from "./components/patient/PatientDashboard/PatientDashboard";
import PatientProfile from "./components/patient/PatientProfile/PatientProfile";
import Reports from "./components/patient/Reports/Reports";
import FindDoctors from "./components/pages/FindDoctors";
import Chatbot from "./components/patient/Chatbot/Chatbot";
import FindDoctorPage from "./components/patient/AppointmentBooking/FindDoctorPage";
import MyAppointments from "./components/patient/MyAppointments/MyAppointments";
import Notifications from "./components/patient/Notifications/Notifications";
import Settings from "./components/patient/Settings/Settings";

// Doctor components
import DoctorLayout from "./components/layouts/DoctorLayout";
import DoctorHome from "./components/doctor/DoctorHome/DoctorHome";
import DoctorPatients from "./components/doctor/DoctorPatients/DoctorPatients";
import DoctorAppointments from "./components/doctor/DoctorAppointments/DoctorAppointments";
import DoctorPendingTasks from "./components/doctor/DoctorPendingTasks/DoctorPendingTasks";
import DoctorNotifications from "./components/doctor/DoctorNotifications/DoctorNotifications";
import DoctorProfile from "./components/doctor/DoctorProfile/DoctorProfile";
import DoctorSettings from "./components/doctor/DoctorSettings/DoctorSettings";

// Admin components
import AdminLayout from "./components/admin/AdminLayout/AdminLayout";
import AdminHome from "./components/admin/AdminHome/AdminHome";
import AdminPatients from "./components/admin/AdminPatients/AdminPatients";
import AdminDoctors from "./components/admin/AdminDoctors/AdminDoctors";
import AdminAnalytics from "./components/admin/AdminAnalytics/AdminAnalytics";
import AdminMedicalRecords from "./components/admin/AdminMedicalRecords/AdminMedicalRecords";

// Protected Route
import ProtectedRoute from "./components/ProtectedRoute";

function LandingLayout() {
  return (
    <div>
      <Header />
      <Home />
      <About />
      <Service />
      <Doctor />
      <Getintouch />
      <Footer />
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        {/* Landing page route */}
        <Route path="/" element={<LandingLayout />} />

        {/* Auth routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/register" element={<Register />} />
        <Route path="/admin-login" element={<AdminLogin />} />

        {/* Patient routes with layout wrapper */}
        <Route path="/patient" element={
          <ProtectedRoute requiredRole="patient">
            <PatientLayout />
          </ProtectedRoute>
        }>
          <Route path="dashboard" element={<HealthcareDashboard />} />
          <Route path="profile" element={<PatientProfile />} />
          <Route path="reports" element={<Reports />} />
          <Route path="appointments" element={<MyAppointments />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="settings" element={<Settings />} />
          <Route path="finddoctors" element={<FindDoctorPage />} />
          <Route path="chatbot" element={<Chatbot />} />
        </Route>

        {/* Doctor routes with layout wrapper */}
        <Route path="/doctor" element={
          <ProtectedRoute requiredRole="doctor">
            <DoctorLayout />
          </ProtectedRoute>
        }>
          <Route path="home" element={<DoctorHome />} />
          <Route path="patients" element={<DoctorPatients />} />
          <Route path="appointments" element={<DoctorAppointments />} />
          <Route path="pending-tasks" element={<DoctorPendingTasks />} />
          <Route path="notifications" element={<DoctorNotifications />} />
          <Route path="profile" element={<DoctorProfile />} />
          <Route path="settings" element={<DoctorSettings />} />
          {/* Default doctor route */}
          <Route index element={<DoctorHome />} />
        </Route>

        {/* Admin routes with layout wrapper */}
        <Route path="/admin" element={
          <ProtectedRoute requiredRole="admin">
            <AdminLayout />
          </ProtectedRoute>
        }>
          <Route path="home" element={<AdminHome />} />
          <Route path="patients" element={<AdminPatients />} />
          <Route path="doctors" element={<AdminDoctors />} />
          <Route path="analytics" element={<AdminAnalytics />} />
          <Route path="medical-records" element={<AdminMedicalRecords />} />
          {/* Default admin route */}
          <Route index element={<AdminHome />} />
        </Route>

        {/* Backward compatibility routes - redirect to new structure */}
        <Route path="/profile" element={
          <ProtectedRoute requiredRole="patient">
            <PatientProfile />
          </ProtectedRoute>
        } />
        <Route path="/reports" element={
          <ProtectedRoute requiredRole="patient">
            <Reports />
          </ProtectedRoute>
        } />
        <Route path="/finddoctors" element={
          <ProtectedRoute requiredRole="patient">
            <FindDoctorPage />
          </ProtectedRoute>
        } />

        {/* Default/fallback route */}
        <Route path="*" element={<LandingLayout />} />
      </Routes>
    </Router>
  );
}

export default App;