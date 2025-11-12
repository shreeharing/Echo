import jwt from "jsonwebtoken"
import nodemailer from "nodemailer";

// 1. Create the "transporter"
// This is the object that knows how to send an email
console.log("--- DEBUG EMAIL SERVICE ---");
console.log("EMAIL_USER:", process.env.EMAIL_USER);
console.log("EMAIL_PASS:", process.env.EMAIL_PASS ? "********" : undefined);
const transporter = nodemailer.createTransport({
  service: 'gmail', // We are using Gmail
  auth: {
    user: process.env.EMAIL_USER, // From your .env file
    pass: process.env.EMAIL_PASS, // From your .env file
  },
});

// 2. Create the function to send the verification email
const sendVerificationEmail = async (user) => {
  try {
    // 3. Create the verification token
    // This token will be in the link we send
    const token = jwt.sign(
      { id: user._id },          // The "payload" (what we want to identify)
      process.env.JWT_SECRET,   // The "secret" from .env
      { expiresIn: '1h' }        // The token expires in 1 hour
    );

    // 4. Create the verification URL
    // This is the link the user will click in their email
    const verificationLink = `http://localhost:5000/api/auth/verify-email/${token}`;
    // NOTE: 'localhost:5000' should be your backend's address

    // 5. Define the email's content
    const mailOptions = {
      from: 'Echo App <your-email-address@gmail.com>', // Sender
      to: user.email,                                 // Recipient
      subject: 'Verify Your Email for Echo App',      // Subject line
      html: `
        <h1>Welcome to Echo, ${user.fullName}!</h1>
        <p>Please click the link below to verify your email address:</p>
        <a href="${verificationLink}" style="padding: 10px 15px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">Click to Verify</a>
        <br>
        <p>If the button doesn't work, copy and paste this link:</p>
        <p>${verificationLink}</p>
        <br>
        <p>This link will expire in 1 hour.</p>
      `,
    };

    // 6. Send the email!
    await transporter.sendMail(mailOptions);
    console.log('Verification email sent to:', user.email);

  } catch (error) {
    console.error('Error sending verification email:', error);
  }
};

export default {sendVerificationEmail};