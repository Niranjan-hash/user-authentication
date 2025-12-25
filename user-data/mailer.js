const nodemailer = require('nodemailer');
require('dotenv').config();

console.log('📧 Email config check:');
console.log('   EMAIL exists:', !!process.env.EMAIL);
console.log('   EMAIL_PASSWORD exists:', !!process.env.EMAIL_PASSWORD);

// Remove spaces from password
const cleanedPassword = process.env.EMAIL_PASSWORD ? 
  process.env.EMAIL_PASSWORD.replace(/\s/g, '') : '';

let transporter;

if (!process.env.EMAIL || !cleanedPassword) {
  console.log('⚠️  Using dummy email service (no real emails will be sent)...');
  
  // Create a dummy transporter for development
  transporter = {
    sendMail: (options, callback) => {
      console.log('📧 Email would be sent (dummy mode):', {
        to: options.to,
        subject: options.subject
      });
      // Simulate successful email sending
      setTimeout(() => {
        callback(null, { 
          messageId: 'dummy-' + Date.now(),
          previewUrl: 'https://ethereal.email'
        });
      }, 100);
    }
  };
} else {
  console.log('✅ Using Gmail service');
  
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL,
      pass: cleanedPassword
    }
  });
  
  // Test connection
  transporter.verify((error, success) => {
    if (error) {
      console.log('❌ Email connection failed:', error.message);
      console.log('   Current password (first 4 chars):', cleanedPassword.substring(0, 4) + '...');
      console.log('   Make sure:');
      console.log('   1. You enabled 2-factor authentication on Gmail');
      console.log('   2. You created an App Password (not regular password)');
      console.log('   3. The App Password has no spaces');
    } else {
      console.log('✅ Email server is ready to send');
    }
  });
}

module.exports = transporter;