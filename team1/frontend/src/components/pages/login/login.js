import React,{useState} from "react";
import { useNavigate, Link } from "react-router-dom";
import API from "../../../api/axiosConfig";
import "./login.css";

function Login(){
  const navigate = useNavigate();
  const [form,setForm] = useState({email:"", password:"", role:"patient"});
  const [message,setMessage] = useState("");

  const handleChange = e => setForm({...form, [e.target.name]: e.target.value});

  const handleSubmit = async e => {
    e.preventDefault();
    setMessage(""); // Clear previous messages

    try{
      const url = form.role==="patient"?"/auth/patients/login":"/auth/doctors/login";
      const res = await API.post(url, {email:form.email,password:form.password});

      console.log('Login response:', res.data); // Debug log

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("userRole", form.role);
      localStorage.setItem("user", JSON.stringify(res.data.user || res.data.doctor || {})); // Fix: Store as "user" not "userData"

      setMessage(res.data.message);
      navigate(form.role==="patient"?"/patient/dashboard":"/doctor/home");
    }catch(err){
      // Handle specific error cases for doctor approval
      if (err.response?.status === 403 && err.response?.data?.status) {
        const status = err.response.data.status;
        if (status === 'pending') {
          setMessage('⏳ Your account is pending admin approval. Please wait for approval to login.');
        } else if (status === 'rejected') {
          setMessage('❌ Your account has been rejected. Please contact support.');
        } else if (status === 'deactivated') {
          setMessage('🚫 Your account has been deactivated. Please contact admin.');
        } else {
          setMessage(err.response.data.message);
        }
      } else {
        setMessage(err.response?.data?.message || "Login failed. Please try again.");
      }
    }
  }

  return (
    <div className="login-container">
      <div className="login-left">
        <div className="login-branding">
          <h1 className="brand-logo-text">MEDviz</h1>
          <p className="brand-tagline">Your Health, Our Priority</p>
          <div className="feature-list">
            <div className="feature-item">
              <span className="feature-icon">✓</span>
              <span>Secure & Private</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">✓</span>
              <span>24/7 Access</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">✓</span>
              <span>Expert Care</span>
            </div>
          </div>
        </div>
      </div>

      <div className="login-right">
        <div className="login-box">
          <h2 className="login-title">Welcome Back</h2>
          <p className="login-subtitle">Sign in to continue to your account</p>

          <div className="role-toggle">
            <button
              className={form.role === "patient" ? "active" : ""}
              onClick={() => setForm({...form, role: "patient"})}
            >
              Patient
            </button>
            <button
              className={form.role === "doctor" ? "active" : ""}
              onClick={() => setForm({...form, role: "doctor"})}
            >
              Doctor
            </button>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="input-group">
              <label htmlFor="login-email">Email Address</label>
              <input
                id="login-email"
                type="email"
                name="email"
                placeholder="Enter your email"
                onChange={handleChange}
                required
              />
            </div>

            <div className="input-group">
              <label htmlFor="login-password">Password</label>
              <input
                id="login-password"
                type="password"
                name="password"
                placeholder="Enter your password"
                onChange={handleChange}
                required
              />
            </div>

            <div className="forgot">
              <Link to="/forgot-password">Forgot Password?</Link>
            </div>

            {message && <p className="message">{message}</p>}

            <button type="submit" className="login-btn">Sign In</button>
          </form>

          <p className="signup-text">
            Don't have an account? <Link to="/register">Create Account</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Login;
