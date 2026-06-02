import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../../../api/axiosConfig";
import "./ForgotPassword.css";

function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: Reset Password
  const [email, setEmail] = useState("");
  const [otp, setOTP] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [userType, setUserType] = useState("");

  // Step 1: Request OTP
  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setErrorMessage("");
    setLoading(true);

    try {
      const res = await API.post("/auth/forgot-password", { email });
      setMessage(res.data.message);
      setUserType(res.data.userType);
      setStep(2); // Move to OTP verification
    } catch (error) {
      setErrorMessage(error.response?.data?.message || "Failed to send OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleOTPSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setErrorMessage("");
    setLoading(true);

    try {
      const res = await API.post("/auth/verify-otp", { email, otp });
      setMessage(res.data.message);
      setResetToken(res.data.resetToken);
      setStep(3); // Move to password reset
    } catch (error) {
      setErrorMessage(error.response?.data?.message || "Failed to verify OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Reset Password
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setErrorMessage("");

    if (newPassword.length < 6) {
      setErrorMessage("Password must be at least 6 characters long");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const res = await API.post("/auth/reset-password", {
        email,
        newPassword,
        confirmPassword,
        resetToken
      });
      setMessage(res.data.message);
      // Redirect to login after 2 seconds
      setTimeout(() => navigate("/login"), 2000);
    } catch (error) {
      setErrorMessage(error.response?.data?.message || "Failed to reset password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forgot-password-container">
      <div className="forgot-password-left">
        <div className="forgot-password-branding">
          <h1 className="brand-logo-text">MEDviz</h1>
          <p className="brand-tagline">Your Health, Our Priority</p>
          <div className="feature-list">
            <div className="feature-item">
              <span className="feature-icon">✓</span>
              <span>Secure Password Reset</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">✓</span>
              <span>OTP Verification</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">✓</span>
              <span>Easy Recovery</span>
            </div>
          </div>
        </div>
      </div>

      <div className="forgot-password-right">
        <div className="forgot-password-box">
          <h2 className="forgot-password-title">Reset Your Password</h2>
          <p className="forgot-password-subtitle">
            {step === 1 && "Enter your email to receive an OTP"}
            {step === 2 && "Enter the OTP sent to your email"}
            {step === 3 && "Create a new password"}
          </p>

          {/* Step 1: Email Input */}
          {step === 1 && (
            <form onSubmit={handleEmailSubmit} className="forgot-password-form">
              <div className="input-group">
                <label>Email Address</label>
                <input
                  type="email"
                  placeholder="Enter your registered email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              {errorMessage && <p className="error-message">{errorMessage}</p>}
              {message && <p className="success-message">{message}</p>}

              <button type="submit" className="forgot-password-btn" disabled={loading}>
                {loading ? "Sending OTP..." : "Send OTP"}
              </button>
            </form>
          )}

          {/* Step 2: OTP Verification */}
          {step === 2 && (
            <form onSubmit={handleOTPSubmit} className="forgot-password-form">
              <div className="input-group">
                <label>One-Time Password (OTP)</label>
                <input
                  type="text"
                  placeholder="Enter the 6-digit OTP"
                  value={otp}
                  onChange={(e) => setOTP(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  required
                  disabled={loading}
                  maxLength="6"
                />
                <p className="otp-info">OTP has been sent to {email}</p>
              </div>

              {errorMessage && <p className="error-message">{errorMessage}</p>}
              {message && <p className="success-message">{message}</p>}

              <button type="submit" className="forgot-password-btn" disabled={loading}>
                {loading ? "Verifying OTP..." : "Verify OTP"}
              </button>

              <button
                type="button"
                className="back-btn"
                onClick={() => {
                  setStep(1);
                  setMessage("");
                  setErrorMessage("");
                }}
              >
                Back
              </button>
            </form>
          )}

          {/* Step 3: Password Reset */}
          {step === 3 && (
            <form onSubmit={handlePasswordSubmit} className="forgot-password-form">
              <div className="input-group">
                <label>New Password</label>
                <input
                  type="password"
                  placeholder="Enter your new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <div className="input-group">
                <label>Confirm Password</label>
                <input
                  type="password"
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              {errorMessage && <p className="error-message">{errorMessage}</p>}
              {message && <p className="success-message">{message}</p>}

              <button type="submit" className="forgot-password-btn" disabled={loading}>
                {loading ? "Resetting Password..." : "Reset Password"}
              </button>

              <button
                type="button"
                className="back-btn"
                onClick={() => {
                  setStep(2);
                  setMessage("");
                  setErrorMessage("");
                }}
              >
                Back
              </button>
            </form>
          )}

          <div className="back-to-login">
            <button onClick={() => navigate("/login")} className="login-link">
              ← Back to Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;
