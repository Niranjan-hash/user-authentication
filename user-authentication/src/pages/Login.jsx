
import axios from 'axios'
import React, { useState } from 'react'
import './login.css'

function Login() {
  const [data, setData] = useState({
    email: "",
    password: ""
  })
  
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    setData({...data, [e.target.name]: e.target.value})
    if (error) setError("")
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const response = await axios.post("http://localhost:5000/login", {
        email: data.email,
        password: data.password
      })
      
      console.log("Login successful:", response.data)
      
      if (response.data.user) {
        localStorage.setItem('user', JSON.stringify(response.data.user))
        localStorage.setItem('token', response.data.token || 'dummy-token')
      }
      
    } catch (error) {
      console.error("Login error:", error)
      
      if (error.response) {
        setError(error.response.data?.message || "Login failed. Please check your credentials.")
      } else if (error.request) {
        setError("Unable to connect to server. Please check your connection.")
      } else {
        setError("An error occurred. Please try again.")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <h2 className="login-title">Login to Your Account</h2>
        
        {error && (
          <div className="login-error">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="login-form">
          <div className="input-group">
            <label htmlFor="email" className="input-label">Email Address</label>
            <input
              type="email"
              name="email"
              id="email"
              placeholder="Enter your email"
              value={data.email}
              onChange={handleChange}
              className="login-input"
              required
            />
          </div>
          
          <div className="input-group">
            <label htmlFor="password" className="input-label">Password</label>
            <input
              type="password"
              name="password"
              id="password"
              placeholder="Enter your password"
              value={data.password}
              onChange={handleChange}
              className="login-input"
              required
            />
          </div>
          
          <button 
            type="submit" 
            className="login-button"
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        
        <div className="links-container">
          <a href="/" className="register-link">Create New Account</a>
        </div>
      </div>
    </div>
  )
}    

export default Login
