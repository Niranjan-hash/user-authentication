
import { useState } from "react";
import axios from "axios";
import "./register.css";

function Register() {
  const [data, setData] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [showOtp, setShowOtp] = useState(false);
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setData({ ...data, [e.target.name]: e.target.value });
    if (error) setError("");
  };

  const validateInputs = () => {
    if (!data.name.trim()) return "Name is required";
    if (!data.email.trim()) return "Email is required";
    if (!/\S+@\S+\.\S+/.test(data.email)) return "Please enter a valid email address";
    if (!data.password) return "Password is required";
    if (data.password.length < 6) return "Password must be at least 6 characters";
    return null;
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    const validationError = validateInputs();
    if (validationError) {
      setError(validationError);
      return;
    }
    
    setLoading(true);
    setError("");
    setSuccess("");
    
    try {
      const response = await axios.post("http://localhost:5000/user/register", data);
      setShowOtp(true);
      setSuccess(response.data.message || "OTP sent to your email!");
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (!otp.trim() || otp.length !== 6 || !/^\d+$/.test(otp)) {
      setError("Please enter a valid 6-digit OTP");
      return;
    }
 
    setLoading(true);
    setError("");
    
    try {
      const res = await axios.post("http://localhost:5000/user/verification", {
        email: data.email,
        otp: otp,
      });
      
      setSuccess(res.data.message);      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        window.location.href = "/login";
      }, 2000);
      
    } catch (err) {
      setError(err.response?.data?.message || "OTP verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setLoading(true);
    setError("");
    
    try {
      const response = await axios.post("http://localhost:5000/user/resend-otp", {
        email: data.email
      });
      setSuccess(response.data.message || "New OTP sent to your email!");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to resend OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-container">
      <h2>Create Account</h2>
      
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {!showOtp ? (
        <form onSubmit={handleRegister} className="register-form">
          <div className="form-group">
            <input 
              name="name" 
              placeholder="Full Name" 
              value={data.name}
              onChange={handleChange}
              disabled={loading}
              required
            />
          </div>
          
          <div className="form-group">
            <input 
              name="email" 
              type="email"
              placeholder="Email Address" 
              value={data.email}
              onChange={handleChange}
              disabled={loading}
              required
            />
          </div>
          
          <div className="form-group">
            <input 
              name="password" 
              type="password" 
              placeholder="Password (minimum 6 characters)" 
              value={data.password}
              onChange={handleChange}
              disabled={loading}
              required
            />
          </div>
          
          <button 
            type="submit" 
            className="submit-btn"
            disabled={loading}
          >
            {loading ? "Sending OTP..." : "Register"}
          </button>
          
          <p className="login-link">
            Already have an account? <a href="/login">Login here</a>
          </p>
        </form>
      ) : (
        <div className="otp-verification">
          <div className="otp-header">
            <h3>Verify Your Email</h3>
            <p>Enter the 6-digit OTP sent to:</p>
            <p className="email-display">{data.email}</p>
          </div>
          
          <div className="form-group">
            <input
              type="text"
              placeholder="Enter 6-digit OTP"
              value={otp}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                setOtp(value);
                if (error) setError("");
              }}
              maxLength={6}
              disabled={loading}
              className="otp-input"
            />
          </div>
          
          <button 
            type="button" 
            className="verify-btn"
            onClick={verifyOtp}
            disabled={loading || otp.length !== 6}
          >
            {loading ? "Verifying..." : "Verify OTP"}
          </button>
          
          <div className="otp-footer">
            <p>Didn't receive the OTP?</p>
            <button 
              type="button" 
              className="resend-btn"
              onClick={handleResendOtp}
              disabled={loading}
            >
              {loading ? "Sending..." : "Resend OTP"}
            </button>
            
            <button 
              type="button" 
              className="back-btn"
              onClick={() => {
                setShowOtp(false);
                setError("");
                setSuccess("");
              }}
              disabled={loading}
            >
              Back to Registration
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Register;
