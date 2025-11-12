import mongoose  from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {OAuth2Client} from "google-auth-library";
import emailService from '../utils/emailService.js'; // <-- 1. IMPORT IT 
import UserCredentials  from "../models/userCredentials.js"

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Helper function to create your app's JWT (for googleAuth)
// <-- ADD THIS
const generateAppToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: '7d', // User stays logged in for 7 day
  });
};

export const manualSignup = async (req, res) => {
  try {
    const { fullName, email, password } = req.body;

    // --- Validation ---
    if (!fullName || !email || !password) {
      return res.status(400).json({ message: 'Please fill in all required fields.' });
    }

    // --- NEW LOGIC START ---
    
    // 1. Find the user by email
    const existingUser = await UserCredentials.findOne({ email });

    if (existingUser) {
      // 2. User *does* exist.
      
      if (existingUser.isVerified) {
        // --- CASE A: User exists AND is verified ---
        // This is the only time we block them.
        return res.status(400).json({ message: 'This email is already registered. Please log in.' });
      
      } else {
        // --- CASE B: User exists but is NOT verified ---
        // They lost the first email. Let's update them and resend.
        console.log("User found, but not verified. Updating and resending email...");

        // Hash the new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Update their details with the new ones
        existingUser.fullName = fullName;
        existingUser.password = hashedPassword;
        
        // Save the updated user
        await existingUser.save();

        // Send a new verification email
        await emailService.sendVerificationEmail(existingUser);

        // Send a success response
        return res.status(200).json({
          message: 'User created successfully! Please check your email to verify.',
        });
      }
    }

    // --- CASE C: User does NOT exist ---
    // If we're here, it means existingUser was null.
    // This is the original "create user" logic.
    console.log("No user found with this email. Creating a new account...");

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create the new user
    const newCredential = new UserCredentials({
      fullName,
      email,
      password: hashedPassword,
      authMethod: 'local',
      isVerified: false,
    });

    // Save 
    await newCredential.save();

    // Send verification email
    await emailService.sendVerificationEmail(newCredential);

    // Respond
    res.status(201).json({
      message: 'User created successfully! Please check your email to verify.',
    });
    // --- NEW LOGIC END ---

  } catch (error) {
    console.error('SIGNUP ERROR:', error);
    res.status(500).json({ message: 'Server error during signup.' });
  }
};

// ... (your other functions: googleAuth, verifyEmail, etc.)
//google Oauth
export const googleAuth = async (req, res) => {
  try {
    const { token } = req.body;

    // 1. Verify the Google token
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { email, name, picture } = payload; // 'name' is fullName

    // 2. Check if user already exists
    let userCred = await UserCredentials.findOne({ email: email });

    if (userCred) {
      // --- USER EXISTS (Log In) ---

      if (userCred.authMethod === 'local') {
        
        // --- THIS IS THE "STUCK USER" FIX ---
        // If the user signed up with 'local' but is NOT verified,
        // we can "rescue" them by linking their account to Google.
        if (!userCred.isVerified) {
          console.log('User found with unverified local account. Linking to Google...');

          // Update the account to be a Google account
          userCred.authMethod = 'google';
          userCred.isVerified = true;
          userCred.fullName = name; // Update their name from Google's data
          
          await userCred.save();

          // Now, log them in
          const appToken = generateAppToken(userCred._id);

          return res.status(200).json({
            message: 'Account successfully linked to Google and logged in.',
            appToken,
            isNewUser: false,
          });
        }
        // --- END OF FIX ---

        // If we are here, the user is 'local' AND 'verified'.
        // In this case, we block them.
        return res.status(400).json({
          message: 'This email is already registered. Please log in with your password.',
        });
      }
      
      // If we are here, the user's authMethod is already 'google'.
      // This is a normal, successful Google login.
      const appToken = generateAppToken(userCred._id);

      res.status(200).json({
        message: 'Logged in successfully',
        appToken,
        isNewUser: false,
      });

    } else {
      // --- NEW USER (Sign Up) ---
      // (This part of your logic remains the same)
      const newCredential = new UserCredentials({
        fullName: name,
        email: email,
        authMethod: 'google',
        isVerified: true, // Google verifies email for us
      });

      await newCredential.save();
      const appToken = generateAppToken(newCredential._id);

      res.status(201).json({
        message: 'User created successfully',
        appToken,
        isNewUser: true, // Signal to frontend to ask for DOB
      });
    }
  } catch (error) {
    console.error('GOOGLE AUTH ERROR:', error);
    res.status(500).json({ message: 'Server error during Google authentication.' });
  }
};

//verifying email logic
export const verifyEmail = async (req, res) => {
  try {
    // 1. Get the token from the URL parameters
    const { token } = req.params;

    // 2. Check if token exists
    if (!token) {
      return res.status(400).send('Verification failed. Token not provided.');
    }

    // 3. Verify the token
    // This will throw an error if the token is invalid or expired
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 4. Find the user by the ID from the token
    const user = await UserCredentials.findById(decoded.id);

    if (!user) {
      return res.status(404).send('User not found. Verification failed.');
    }

    // 5. Check if user is already verified
    if (user.isVerified) {
      return res.status(200).send('Email is already verified. You can log in.');
    }

    // 6. Update the user
    user.isVerified = true;
    await user.save();

    // 7. Send a success response
    // Since the user is in their browser, we send a simple HTML message.
    res.status(200).send(`
      <div style="font-family: sans-serif; text-align: center; padding: 50px;">
        <h1>Email Verified!</h1>
        <p>Your email has been successfully verified. You can now close this tab and log in to the Echo app.</p>
      </div>
    `);

  } catch (error) {
    console.error('EMAIL VERIFICATION ERROR:', error);
    // Handle specific errors
    if (error.name === 'TokenExpiredError') {
      return res.status(400).send('Verification link has expired. Please sign up again to get a new link.');
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(400).send('Invalid verification link. Please sign up again.');
    }
    res.status(500).send('Server error. Please try again later.');
  }
};