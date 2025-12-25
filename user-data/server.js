const express = require("express");
const mongoose = require("mongoose");
const jwt = require('jsonwebtoken')
const cors = require("cors");
const dotenv = require("dotenv");
const bcrypt = require("bcrypt");
const rateLimit = require("express-rate-limit");
const PendingUser = require("./model/pendinguser");
const User = require("./model/userDetail");
const transporter = require("./mailer");
const userDetail = require("./model/userDetail");

dotenv.config();
const app = express();

// Middleware
app.use(cors({
  origin: "http://localhost:3000", // Your React app URL
  credentials: true
}));
app.use(express.json());

// Rate limiting
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: { message: "Too many OTP requests. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Database connection
mongoose
  .connect(process.env.Mongo_url)
  .then(() => console.log("MongoDB connected successfully"))
  .catch(err => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });

/* REGISTER ENDPOINT */
app.post("/user/register", otpLimiter, async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Input validation
    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Email format validation
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Please enter a valid email address" });
    }

    // Password length check
    if (password.length < 6) {
      return res.status(400).json({ 
        message: "Password must be at least 6 characters long" 
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists (verified)
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ 
        message: "This email is already registered. Please login instead." 
      });
    }

    // Check if pending verification exists
    const existingPending = await PendingUser.findOne({ email: normalizedEmail });
    if (existingPending) {
      // If OTP is still valid, inform user
      if (existingPending.verificationcodeExpire > Date.now()) {
        return res.status(400).json({ 
          message: "OTP already sent to this email. Please check your inbox or wait to resend." 
        });
      }
      // If expired, delete old record
      await PendingUser.deleteOne({ email: normalizedEmail });
    }

    // Hash password and generate OTP
    const hash = await bcrypt.hash(password, 10);
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Create pending user
    const pendingUser = await PendingUser.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hash,
      verificationcode: otp,
      verificationcodeExpire: Date.now() + 10 * 60 * 1000, // 10 minutes
      createdAt: new Date()
    });

    // Send OTP email
    try {
      await transporter.sendMail({
        from: `"Registration System" <${process.env.EMAIL}>`,
        to: normalizedEmail,
        subject: "Your OTP Verification Code",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Verify Your Email Address</h2>
            <p>Hello ${name.trim()},</p>
            <p>Thank you for registering. Use the OTP below to verify your email address:</p>
            <div style="background-color: #f4f4f4; padding: 20px; text-align: center; margin: 20px 0;">
              <h1 style="color: #4CAF50; font-size: 36px; letter-spacing: 5px; margin: 0;">${otp}</h1>
            </div>
            <p>This OTP will expire in <strong>10 minutes</strong>.</p>
            <p>If you didn't request this, please ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
            <p style="color: #666; font-size: 12px;">This is an automated message, please do not reply.</p>
          </div>
        `,
      });
    } catch (emailError) {
      console.error("Email sending failed:", emailError);
      // Clean up pending user if email fails
      await PendingUser.deleteOne({ email: normalizedEmail });
      return res.status(500).json({ 
        message: "Failed to send OTP email. Please try again later." 
      });
    }

    res.status(200).json({ 
      message: "OTP sent successfully to your email address",
      email: normalizedEmail
    });

  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ 
      message: "An error occurred during registration. Please try again." 
    });
  }
});

/* VERIFY OTP ENDPOINT */
app.post("/user/verification", async (req, res) => {
  try {
    const { email, otp } = req.body;

    // Input validation
    if (!email || !otp) {
      return res.status(400).json({ 
        message: "Email and OTP are required" 
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const cleanOtp = otp.trim();

    // Find pending user
    const pendingUser = await PendingUser.findOne({ email: normalizedEmail });
    
    if (!pendingUser) {
      return res.status(400).json({ 
        message: "No pending registration found for this email. Please register again." 
      });
    }

    // Check OTP
    if (pendingUser.verificationcode !== cleanOtp) {
      return res.status(400).json({ 
        message: "Invalid OTP. Please check the code and try again." 
      });
    }

    // Check OTP expiry
    if (pendingUser.verificationcodeExpire < Date.now()) {
      await PendingUser.deleteOne({ email: normalizedEmail });
      return res.status(400).json({ 
        message: "OTP has expired. Please request a new one." 
      });
    }

    // Create verified user
    await User.create({
      name: pendingUser.name,
      email: pendingUser.email,
      password: pendingUser.password,
      isverified: true,
      createdAt: new Date()
    });

    // Clean up pending user
    await PendingUser.deleteOne({ email: normalizedEmail });

    res.status(200).json({ 
      message: "Email verified successfully! You can now login to your account.",
      verified: true
    });

  } catch (err) {
    console.error("OTP verification error:", err);
    res.status(500).json({ 
      message: "An error occurred during verification. Please try again." 
    });
  }
});

/* RESEND OTP ENDPOINT */
app.post("/user/resend-otp", otpLimiter, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ 
        message: "Email is required" 
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Find pending user
    const pendingUser = await PendingUser.findOne({ email: normalizedEmail });
    
    if (!pendingUser) {
      return res.status(400).json({ 
        message: "No pending registration found. Please register again." 
      });
    }

    // Generate new OTP
    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();

    // Update pending user with new OTP
    pendingUser.verificationcode = newOtp;
    pendingUser.verificationcodeExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
    await pendingUser.save();

    // Send new OTP email
    try {
      await transporter.sendMail({
        from: `"Registration System" <${process.env.EMAIL}>`,
        to: normalizedEmail,
        subject: "New OTP Verification Code",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">New OTP Verification Code</h2>
            <p>Hello ${pendingUser.name},</p>
            <p>Here is your new OTP verification code:</p>
            <div style="background-color: #f4f4f4; padding: 20px; text-align: center; margin: 20px 0;">
              <h1 style="color: #4CAF50; font-size: 36px; letter-spacing: 5px; margin: 0;">${newOtp}</h1>
            </div>
            <p>This OTP will expire in <strong>10 minutes</strong>.</p>
            <p>If you didn't request this, please ignore this email.</p>
          </div>
        `,
      });
    } catch (emailError) {
      console.error("Resend email failed:", emailError);
      return res.status(500).json({ 
        message: "Failed to send new OTP. Please try again." 
      });
    }

    res.status(200).json({ 
      message: "New OTP sent successfully to your email address"
    });

  } catch (err) {
    console.error("Resend OTP error:", err);
    res.status(500).json({ 
      message: "An error occurred while resending OTP. Please try again." 
    });
  }
});

/* USER LOGIN ENDPOINT - CORRECTED */
app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body; // Changed from user_id to email
    
    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required"
      });
    }
    
    const normalizedEmail = email.toLowerCase().trim();
    
    // Find user with await
    const existingUser = await User.findOne({ email: normalizedEmail });
    
    if (!existingUser) {
      return res.status(401).json({ // Changed from 500 to 401
        message: "Invalid email or password"
      });
    }
    
    // Compare password with bcrypt
    const isPasswordValid = await bcrypt.compare(password, existingUser.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({
        message: "Invalid email or password"
      });
    }
     const token =  await jwt.sign({
      userid:existingUser.name,useremail:existingUser.email
     } ,
     process.env.JWT_SECRET
    )
    
    // Login successful
    return res.status(200).json({
      message: "Login successful",
      user: {
        id: existingUser._id,
        name: existingUser.name,
        email: existingUser.email,
   
      },
      // Consider adding JWT token here for authentication     
      token
    });
    
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      message: "An error occurred during login. Please try again."
    });
  }
});
/* HEALTH CHECK */
app.get("/health", (req, res) => {
  res.status(200).json({ 
    status: "OK", 
    timestamp: new Date().toISOString(),
    service: "Registration Service"
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ 
    message: "Internal server error" 
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    message: "Endpoint not found" 
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});