// src/components/pages/Register/register.js

import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import API from "../../../api/axiosConfig";
import AvailabilityGrid from "../../shared/AvailabilityGrid/AvailabilityGrid";
import "./register.css";

// Define constants for days and time slots
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const SLOTS = ['8AM', '9AM', '10AM', '11AM', '12PM', '1PM', '2PM', '3PM', '4PM', '5PM', '6PM', '7PM', '8PM', '9PM', '10PM', '11PM'];

function Register() {
  const navigate = useNavigate();
  const [role, setRole] = useState("patient");
  const [currentStep, setCurrentStep] = useState(1);

  const [form, setForm] = useState({
    full_name: "", last_name: "", email: "", phone: "", password: "", confirm_password: "",
    dob: "", gender: "", address: "",
    emergency_contact: "", blood_group: "", medical_history: "", current_medications: "",
    height: "", weight: "", bpm: "",
    specialization: "", experience: "", available_day: "",
    start_time: "", end_time: "", clinic_name: "", clinic_address: ""
  });

  const [file, setFile] = useState(null);
  const [message, setMessage] = useState("");

  const [validationErrors, setValidationErrors] = useState({
    full_name: "", last_name: "", email: "", phone: "", emergency_contact: ""
  });

  // ✅ new state for password mismatch
  const [passwordMismatch, setPasswordMismatch] = useState("");

  // Load state from sessionStorage on mount
  useEffect(() => {
    const savedRole = sessionStorage.getItem('register_role');
    const savedStep = sessionStorage.getItem('register_step');
    const savedForm = sessionStorage.getItem('register_form');
    const savedAvailability = sessionStorage.getItem('register_availability');

    if (savedRole) setRole(savedRole);
    if (savedStep) setCurrentStep(Number(savedStep));
    if (savedForm) setForm(JSON.parse(savedForm));
    if (savedAvailability) setAvailability(JSON.parse(savedAvailability));
  }, []);

  // Save state to sessionStorage on change
  useEffect(() => {
    sessionStorage.setItem('register_role', role);
    sessionStorage.setItem('register_step', String(currentStep));
    sessionStorage.setItem('register_form', JSON.stringify(form));
    sessionStorage.setItem('register_availability', JSON.stringify(availability));
  }, [role, currentStep, form, availability]);

    // Initialize availability schedule for doctors 
    const initializeAvailability = () => {
        const availability = {};
        
        // Constants for doctor availability
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const SLOTS = ["09:00-11:00", "11:00-13:00", "14:00-16:00", "16:00-18:00"];
        DAYS.forEach(day => {
            availability[day] = {};
            SLOTS.forEach(time => { 
                availability[day][time] = false;
            });
        });
        return availability;
    };

    const [availability, setAvailability] = useState(initializeAvailability());
    // NOTE: Removed `selectedSlots` state for multiple selection.


  // Step validation logic
  const isStep1Complete = form.full_name && form.last_name && form.email && form.phone && form.dob && form.gender && form.address;
  const isStep2Complete = form.password && form.confirm_password && form.password === form.confirm_password;
  const isStep3Complete =
    role === "patient"
      ? (form.emergency_contact && form.blood_group)
      : (form.specialization && form.experience);

    const nextStep = () => {
        // ensure the account security step has matching passwords before allowing
        // the user to progress; otherwise display a message but still keep the
        // button clickable so the user can see the warning.
        if (currentStep === 2 && !isStep2Complete) {
            setMessage('Please make sure both passwords are entered and match.');
            return;
        }
        if (currentStep < 4) setCurrentStep(currentStep + 1);
        // clear any previous messages when moving forward
        setMessage('');
    };

    const prevStep = () => {
        if (currentStep > 1) setCurrentStep(currentStep - 1);
    };

  // Validation functions
  const validateName = (name, value) => {
    const nameRegex = /^[A-Za-z\s]+$/;
    if (!value) return "";
    if (!nameRegex.test(value)) return "Only letters and spaces are allowed";
    return "";
  };

  const validateEmail = (value) => {
    if (!value) return "";
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) return "Enter a valid email address (example@domain.com)";
    return "";
  };

  const validatePhone = (value) => {
    if (!value) return "";
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(value)) return "Enter a valid 10-digit phone number";
    return "";
  };

    const handleChange = e => {
        const { name, value } = e.target;

    // ✅ Live password mismatch validation
    if (name === "password" || name === "confirm_password") {
      const updatedForm = { ...form, [name]: value };
      setForm(updatedForm);

      if (updatedForm.password && updatedForm.confirm_password && updatedForm.password !== updatedForm.confirm_password) {
        setPasswordMismatch("Passwords do not match");
      } else {
        setPasswordMismatch("");
      }
      return;
    }

    if (name === "phone" || name === "emergency_contact") {
      const digitsOnly = value.replace(/\D/g, "").slice(0, 10);
      setForm({ ...form, [name]: digitsOnly });
      setValidationErrors({ ...validationErrors, [name]: validatePhone(digitsOnly) });
      return;
    }

    if (name === "full_name" || name === "last_name") {
      setForm({ ...form, [name]: value });
      setValidationErrors({ ...validationErrors, [name]: validateName(name, value) });
      return;
    }

    if (name === "email") {
      setForm({ ...form, [name]: value });
      setValidationErrors({ ...validationErrors, [name]: validateEmail(value) });
      return;
    }

    setForm({ ...form, [name]: value });
  };

    const handleFileChange = e => setFile(e.target.files[0]);

  const toggleAvailability = (day, time) => {
    setAvailability(prev => ({
      ...prev,
      [day]: { ...prev[day], [time]: !prev[day][time] }
    }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (form.password !== form.confirm_password) {
      setMessage("Passwords do not match");
      return;
    }

    try {
      const formData = new FormData();
      Object.keys(form).forEach(key => formData.append(key, form[key]));
      if (file) formData.append(role === "patient" ? "medical_reports" : "cert_docs", file);

      // Explicit informed consent (the terms checkbox is `required`, so reaching
      // here means the user accepted). Backend records consent_version + timestamp.
      formData.append("agreed_terms", "true");
      formData.append("consent_version", "1.0");

      if (role === "doctor") {
        const availabilityArray = [];
        Object.keys(availability).forEach(day => {
          Object.keys(availability[day]).forEach(timeSlot => {
            availabilityArray.push({
              day,
              time_slot: timeSlot,
              is_available: availability[day][timeSlot]
            });
          });
        });
        formData.append("availability_schedule", JSON.stringify(availabilityArray));
      }

      const url = `/auth/${role === "patient" ? "patients" : "doctors"}/register`;
      const res = await API.post(url, formData, { headers: { "Content-Type": "multipart/form-data" } });

            setMessage(res.data.message);

      // Clear sessionStorage on successful submission
      sessionStorage.removeItem('register_role');
      sessionStorage.removeItem('register_step');
      sessionStorage.removeItem('register_form');
      sessionStorage.removeItem('register_availability');

      // The register endpoints do not issue an auth token, so we cannot send
      // the user straight to a protected dashboard (ProtectedRoute would bounce
      // them to /login). Send them to the login page with a success message.
      if (res.data.token) {
        // Future-proof: if the backend ever returns a token on register, log in
        // the same way login.js does before navigating to the dashboard.
        localStorage.setItem("token", res.data.token);
        localStorage.setItem("userRole", role);
        localStorage.setItem("user", JSON.stringify(res.data.user || res.data.doctor || {}));
        navigate(role === "patient" ? "/patient/dashboard" : "/doctor/home");
      } else if (role === "doctor" && res.data.requiresApproval) {
        setTimeout(() => navigate("/login"), 3000);
      } else {
        navigate("/login", {
          state: { message: res.data.message || "Registration successful! Please sign in." }
        });
      }
    } catch (err) {
      setMessage(err.response?.data?.message || "Error");
    }
  };

  return (
    <div className="register-container">
      <div className="register-left">
        <div className="register-header">
          <h1 className="register-title">Join MEDviz</h1>
          <p className="register-subtitle">Start your healthcare journey with us</p>
        </div>

        <div className="step-indicator">
          <div className="step">
            <div className={`step-number ${isStep1Complete ? "completed" : ""}`}>1</div>
            <div className="step-text">Personal Information</div>
          </div>
          <div className="step">
            <div className={`step-number ${isStep2Complete ? "completed" : ""}`}>2</div>
            <div className="step-text">Account Security</div>
          </div>
          <div className="step">
            <div className={`step-number ${isStep3Complete ? "completed" : ""}`}>3</div>
            <div className="step-text">{role === "patient" ? "Medical Info" : "Professional Info"}</div>
          </div>
          <div className="step">
            <div className="step-number">4</div>
            <div className="step-text">Terms & Completion</div>
          </div>
        </div>
      </div>

      <div className="register-box">
        <form className="register-form" onSubmit={handleSubmit}>
          {/* show feedback message on any step (not only final) */}
          {message && <p className="message">{message}</p>}
          {/* STEP 1 */}
          {currentStep === 1 && (
            <div className="form-section">
              <h3 className="section-title">Personal Information</h3>
              
              <div className="input-group" style={{ marginBottom: '20px' }}>
                <label>Account Type</label>
                <select 
                  value={role} 
                  onChange={(e) => setRole(e.target.value)}
                >
                  <option value="patient">Patient</option>
                  <option value="doctor">Doctor</option>
                </select>
              </div>

              <div className="form-row">
                <div className="input-group">
                  <label>First Name</label>
                  <input name="full_name" value={form.full_name} placeholder="Enter first name" onChange={handleChange} required />
                  {validationErrors.full_name && <span className="validation-error">{validationErrors.full_name}</span>}
                </div>

                <div className="input-group">
                  <label>Last Name</label>
                  <input name="last_name" value={form.last_name} placeholder="Enter last name" onChange={handleChange} required />
                  {validationErrors.last_name && <span className="validation-error">{validationErrors.last_name}</span>}
                </div>
              </div>

                            <div className="form-row">
                                <div className="input-group">
                                    <label>Email Address</label>
                                    <input type="email" name="email" value={form.email} placeholder="Enter email" onChange={handleChange} required />
                                    {validationErrors.email && <span className="validation-error">{validationErrors.email}</span>}
                                </div>
                                <div className="input-group">
                                    <label>Phone Number</label>
                                    <input name="phone" value={form.phone} placeholder="Enter 10-digit phone number" onChange={handleChange} required maxLength="10" />
                                    {validationErrors.phone && <span className="validation-error">{validationErrors.phone}</span>}
                                </div>
                            </div>

              <div className="form-row">
                <div className="input-group">
                  <label>Date of Birth</label>
                  <input type="date" name="dob" value={form.dob} onChange={handleChange} required />
                </div>
                <div className="input-group">
                  <label>Gender</label>
                  <select name="gender" value={form.gender} onChange={handleChange} required>
                    <option value="">Select</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

                            <div className="input-group">
                                <label>Address</label>
                                <input name="address" value={form.address} placeholder="Enter full address" onChange={handleChange} required />
                            </div>
                        </div>
                    )}

          {/* STEP 2 */}
          {currentStep === 2 && (
            <div className="form-section">
              <h3 className="section-title">Account Security</h3>
              <div className="form-row">
                <div className="input-group">
                  <label>Password</label>
                  <input type="password" name="password" value={form.password} placeholder="Create password" onChange={handleChange} required />
                </div>

                <div className="input-group">
                  <label>Confirm Password</label>
                  <input type="password" name="confirm_password" value={form.confirm_password} placeholder="Confirm password" onChange={handleChange} required />
                  {passwordMismatch && <span className="validation-error">{passwordMismatch}</span>}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3 — PATIENT */}
          {currentStep === 3 && role === "patient" && (
            <div className="form-section">
              <h3 className="section-title">Medical Information</h3>
              <div className="form-row">
                <div className="input-group">
                  <label>Emergency Contact</label>
                  <input name="emergency_contact" value={form.emergency_contact} placeholder="Enter 10-digit emergency contact" onChange={handleChange} required maxLength="10" />
                  {validationErrors.emergency_contact && <span className="validation-error">{validationErrors.emergency_contact}</span>}
                </div>
                <div className="input-group">
                  <label>Blood Group</label>
                  <input name="blood_group" value={form.blood_group} placeholder="e.g., O+, A-, B+" onChange={handleChange} required />
                </div>
              </div>

              <div className="form-row">
                <div className="input-group">
                  <label>Height (Optional)</label>
                  <input name="height" value={form.height} placeholder="e.g., 5.8 ft or 175 cm" onChange={handleChange} />
                </div>
                <div className="input-group">
                  <label>Weight (Optional)</label>
                  <input name="weight" value={form.weight} placeholder="e.g., 67 kg" onChange={handleChange} />
                </div>
              </div>

              <div className="input-group">
                <label>Medical History (Optional)</label>
                <textarea name="medical_history" value={form.medical_history} placeholder="Any existing conditions" onChange={handleChange} rows="2"></textarea>
              </div>
            </div>
          )}

          {/* STEP 3 — DOCTOR */}
          {currentStep === 3 && role === "doctor" && (
            <div className="form-section">
              <h3 className="section-title">Professional Information</h3>
              <div className="form-row">
                <div className="input-group">
                  <label>Specialization</label>
                  <input name="specialization" value={form.specialization} placeholder="e.g., Cardiology" onChange={handleChange} />
                </div>
                <div className="input-group">
                  <label>Years of Experience</label>
                  <input name="experience" value={form.experience} type="number" placeholder="Years" onChange={handleChange} />
                </div>
              </div>

              <p style={{ fontSize: '0.95rem', color: '#475569', marginTop: '12px' }}>
                Select a day from the dropdown below and then choose the time slots when you are available.
              </p>
              <AvailabilityGrid availability={availability} onToggle={toggleAvailability} />

              <div className="input-group">
                <label>Upload License/Certificate</label>
                <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileChange} className="file-input" />
              </div>
            </div>
          )}

          {/* STEP 4 */}
          {currentStep === 4 && (
            <div className="form-section">
              <h3 className="section-title">Review & Submit</h3>
              <div className="terms">
                <input type="checkbox" required id="terms" />
                <label htmlFor="terms">
                  I agree to the Terms &amp; the{" "}
                  <a href="/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a>,
                  including the processing of my health information as described.
                </label>
              </div>
            </div>
          )}

          {/* ✅ Navigation Buttons */}
          <div className="form-navigation">
            {currentStep > 1 && (
              <button type="button" className="nav-btn prev-btn" onClick={prevStep}>
                Previous
              </button>
            )}

            {currentStep < 4 ? (
              <button
                type="button"
                className="nav-btn next-btn"
                onClick={nextStep}
              >
                Next
              </button>
            ) : (
              <button type="submit" className="register-btn">Create Account</button>
            )}
          </div>
        </form>

        {/* THIS WAS MISPLACED EARLIER */}
        <p className="signin-text">
          Already have an account? <Link to="/login">Sign In</Link>
        </p>
      </div>
    </div>
  );
}

export default Register;