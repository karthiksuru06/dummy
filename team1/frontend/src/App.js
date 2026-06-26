import React, { Suspense, lazy } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Doctor Dashboard Theme
import "./components/doctor/doctorTheme.css";
import "./components/doctor/doctorColorOverride.css";

// Landing page components (eager — initial route, small/shared shells)
import Header from "./components/landingpage/header/header";
import Home from "./components/landingpage/herohomepage/home";
import Service from "./components/landingpage/ourservice/service";
import About from "./components/landingpage/aboutus/about";
import Doctor from "./components/landingpage/doctors/doc";
import Getintouch from "./components/landingpage/getin/contact";
import Footer from "./components/landingpage/footer/footer";

// Protected Route (tiny wrapper used on every authenticated page — keep eager)
import ProtectedRoute from "./components/ProtectedRoute";

// ---- Lazy-loaded route components (route-level code splitting) ----

// Auth pages
const AdminLogin = lazy(() => import("./components/pages/AdminLogin/AdminLogin"));
const Login = lazy(() => import("./components/pages/login/login"));
const ForgotPassword = lazy(() => import("./components/pages/login/ForgotPassword"));
const Register = lazy(() => import("./components/pages/Register/register"));
const PrivacyPolicy = lazy(() => import("./components/pages/PrivacyPolicy/PrivacyPolicy"));

// Patient components
const PatientLayout = lazy(() => import("./components/layouts/PatientLayout"));
const HealthcareDashboard = lazy(() => import("./components/patient/PatientDashboard/PatientDashboard"));
const PatientProfile = lazy(() => import("./components/patient/PatientProfile/PatientProfile"));
const Reports = lazy(() => import("./components/patient/Reports/Reports"));
const Chatbot = lazy(() => import("./components/patient/Chatbot/Chatbot"));
const FindDoctorPage = lazy(() => import("./components/patient/AppointmentBooking/FindDoctorPage"));
const MyAppointments = lazy(() => import("./components/patient/MyAppointments/MyAppointments"));
const Notifications = lazy(() => import("./components/patient/Notifications/Notifications"));
const Settings = lazy(() => import("./components/patient/Settings/Settings"));

// Doctor components
const DoctorLayout = lazy(() => import("./components/layouts/DoctorLayout"));
const DoctorHome = lazy(() => import("./components/doctor/DoctorHome/DoctorHome"));
const DoctorPatients = lazy(() => import("./components/doctor/DoctorPatients/DoctorPatients"));
const DoctorAppointments = lazy(() => import("./components/doctor/DoctorAppointments/DoctorAppointments"));
const DoctorPendingTasks = lazy(() => import("./components/doctor/DoctorPendingTasks/DoctorPendingTasks"));
const DoctorNotifications = lazy(() => import("./components/doctor/DoctorNotifications/DoctorNotifications"));
const DoctorProfile = lazy(() => import("./components/doctor/DoctorProfile/DoctorProfile"));
const DoctorSettings = lazy(() => import("./components/doctor/DoctorSettings/DoctorSettings"));

// Admin components
const AdminLayout = lazy(() => import("./components/admin/AdminLayout/AdminLayout"));
const AdminHome = lazy(() => import("./components/admin/AdminHome/AdminHome"));
const AdminPatients = lazy(() => import("./components/admin/AdminPatients/AdminPatients"));
const AdminDoctors = lazy(() => import("./components/admin/AdminDoctors/AdminDoctors"));
const AdminAnalytics = lazy(() => import("./components/admin/AdminAnalytics/AdminAnalytics"));
const AdminMedicalRecords = lazy(() => import("./components/admin/AdminMedicalRecords/AdminMedicalRecords"));

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

function RouteFallback() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        width: "100%",
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          border: "4px solid #e5e7eb",
          borderTopColor: "#2563eb",
          borderRadius: "50%",
          animation: "appRouteSpin 0.8s linear infinite",
        }}
        role="status"
        aria-label="Loading"
      />
      <style>{`@keyframes appRouteSpin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function App() {
  return (
    <Router>
      <ToastContainer
        position="top-right"
        autoClose={4000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnHover
        theme="colored"
      />
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          {/* Landing page route */}
          <Route path="/" element={<LandingLayout />} />

          {/* Auth routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/register" element={<Register />} />
          <Route path="/admin-login" element={<AdminLogin />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />

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
      </Suspense>
    </Router>
  );
}

export default App;
