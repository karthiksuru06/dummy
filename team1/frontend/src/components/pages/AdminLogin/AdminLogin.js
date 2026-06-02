import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../../../api/axiosConfig";
import "./AdminLogin.css";

function AdminLogin() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const res = await API.post("/auth/admin/login", {
        email: form.email,
        password: form.password,
      });

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("userRole", "admin");
      localStorage.setItem("user", JSON.stringify(res.data.admin || res.data.user || {}));

      setMessage(res.data.message || "Login successful");
      setTimeout(() => {
        navigate("/admin/home");
      }, 1000);
    } catch (err) {
      setMessage(err.response?.data?.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-container">
      <div className="admin-login-left">
        <div className="admin-branding">
          <div className="admin-icon-wrapper">
            <div className="admin-icon">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 17L12 22L22 17" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 12L12 17L22 12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
          <h1 className="admin-brand-title">MEDviz Admin</h1>
          <p className="admin-brand-subtitle">Secure Administrative Access</p>

          <div className="admin-features">
            <div className="admin-feature">
              <div className="feature-dot"></div>
              <span>Complete System Control</span>
            </div>
            <div className="admin-feature">
              <div className="feature-dot"></div>
              <span>User Management</span>
            </div>
            <div className="admin-feature">
              <div className="feature-dot"></div>
              <span>Analytics & Reports</span>
            </div>
          </div>
        </div>
      </div>

      <div className="admin-login-right">
        <div className="admin-login-box">
          <div className="admin-login-header">
            <h2 className="admin-login-title">Admin Login</h2>
            <p className="admin-login-subtitle">Enter your credentials to access the admin panel</p>
          </div>

          <form className="admin-login-form" onSubmit={handleSubmit}>
            <div className="admin-input-group">
              <label htmlFor="email">Email Address</label>
              <div className="input-wrapper">
                <svg className="input-icon" width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M4 4H20C21.1 4 22 4.9 22 6V18C22 19.1 21.1 20 20 20H4C2.9 20 2 19.1 2 18V6C2 4.9 2.9 4 4 4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M22 6L12 13L2 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <input
                  type="email"
                  id="email"
                  name="email"
                  placeholder="admin@medviz.com"
                  value={form.email}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="admin-input-group">
              <label htmlFor="password">Password</label>
              <div className="input-wrapper">
                <svg className="input-icon" width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M7 11V7C7 5.67392 7.52678 4.40215 8.46447 3.46447C9.40215 2.52678 10.6739 2 12 2C13.3261 2 14.5979 2.52678 15.5355 3.46447C16.4732 4.40215 17 5.67392 17 7V11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <input
                  type="password"
                  id="password"
                  name="password"
                  placeholder="Enter your password"
                  value={form.password}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            {message && (
              <div className={`admin-message ${message.includes("successful") ? "success" : "error"}`}>
                {message}
              </div>
            )}

            <button type="submit" className="admin-login-btn" disabled={loading}>
              {loading ? (
                <>
                  <span className="spinner"></span>
                  Signing In...
                </>
              ) : (
                <>
                  Sign In
                  <svg className="arrow-icon" width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </>
              )}
            </button>
          </form>

          <div className="admin-footer">
            <p>Protected by MEDviz Security • <a href="#">Need Help?</a></p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminLogin;
