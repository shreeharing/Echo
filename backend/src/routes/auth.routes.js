import express from 'express';
import { body } from 'express-validator';
import { manualSignup, googleAuth, verifyEmail } from "../controllers/auth.controller.js";
import path from 'path';
import { fileURLToPath } from 'url'; // Needed for ES Modules

// --- This setup gets the correct directory path ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const router = express.Router();

// POST /api/auth/signup (You already have this)
router.post(
  '/signup',
  // --- Add this validation middleware ---
  [
    body('fullName', 'Full name is required').notEmpty().trim(),
    body('email', 'Please include a valid email').isEmail().normalizeEmail(),
    body('password', 'Password must be at least 8 characters long').isLength({ min: 8 }),
  ],
  // ---
  manualSignup
);
// POST /api/auth/google (You already have this)
router.post('/google', googleAuth);

router.get('/signup', (req, res) => {
    // 1. Use res.sendFile
    // 2. Use path.join to create an absolute path
    // This example assumes your HTML file is in a folder called 'public'
    // in your project's root.
    res.sendFile(path.join(__dirname, '..', '..', 'public', 'signUpPage.html'));
});
// --- ADD THIS NEW ROUTE ---
// GET /api/auth/verify-email/:token
// This :token is the dynamic part from the URL
router.get('/verify-email/:token', verifyEmail);

export default router;