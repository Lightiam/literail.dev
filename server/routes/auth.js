// server/routes/auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const { authenticateJWT, isAuthenticated, refreshUser } = require('../middleware/auth');

/**
 * @route POST /api/auth/register
 * @desc Register a new user
 * @access Public
 */
router.post('/register', async (req, res) => {
  try {
    const { email, password, displayName } = req.body;
    
    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Generate email verification token
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');
    const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    
    // Create user
    const user = await User.create({
      email,
      password: hashedPassword,
      displayName: displayName || email.split('@')[0],
      emailVerified: false,
      emailVerificationToken,
      emailVerificationExpires,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    
    // Save refresh token to user
    await User.findOneAndUpdate(
      { uid: user.uid },
      { refreshToken }
    );
    
    // TODO: Send verification email
    // This would be implemented with an email service
    
    res.status(201).json({
      message: 'User registered successfully',
      user: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        emailVerified: user.emailVerified
      },
      accessToken,
      refreshToken
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @route POST /api/auth/login
 * @desc Login user and return JWT token
 * @access Public
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Check if user is disabled
    if (user.disabled) {
      return res.status(403).json({ error: 'Account disabled' });
    }
    
    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    
    // Update user with refresh token and last login
    await User.findOneAndUpdate(
      { uid: user.uid },
      {
        refreshToken,
        lastLoginAt: new Date()
      }
    );
    
    res.json({
      message: 'Login successful',
      user: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        emailVerified: user.emailVerified,
        role: user.role
      },
      accessToken,
      refreshToken
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @route POST /api/auth/refresh-token
 * @desc Refresh access token
 * @access Public
 */
router.post('/refresh-token', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }
    
    // Verify refresh token
    let userData;
    try {
      userData = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch (error) {
      return res.status(403).json({ error: 'Invalid refresh token' });
    }
    
    // Find user
    const user = await User.findOne({ uid: userData.uid });
    if (!user) {
      return res.status(403).json({ error: 'User not found' });
    }
    
    // Check if refresh token matches
    if (user.refreshToken !== refreshToken) {
      return res.status(403).json({ error: 'Refresh token invalid' });
    }
    
    // Check if user is disabled
    if (user.disabled) {
      return res.status(403).json({ error: 'Account disabled' });
    }
    
    // Generate new tokens
    const accessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);
    
    // Update user with new refresh token
    await User.findOneAndUpdate(
      { uid: user.uid },
      { refreshToken: newRefreshToken }
    );
    
    res.json({
      accessToken,
      refreshToken: newRefreshToken
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @route POST /api/auth/forgot-password
 * @desc Request password reset
 * @access Public
 */
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal that user doesn't exist
      return res.json({ message: 'Password reset email sent if account exists' });
    }
    
    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour
    
    // Update user with reset token
    await User.findOneAndUpdate(
      { uid: user.uid },
      {
        passwordResetToken: resetToken,
        passwordResetExpires: resetExpires
      }
    );
    
    // TODO: Send password reset email
    // This would be implemented with an email service
    
    res.json({ message: 'Password reset email sent if account exists' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @route POST /api/auth/reset-password
 * @desc Reset password with token
 * @access Public
 */
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    
    if (!token || !password) {
      return res.status(400).json({ error: 'Token and password are required' });
    }
    
    // Find user with valid reset token
    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: new Date() }
    });
    
    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }
    
    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Update user with new password
    await User.findOneAndUpdate(
      { uid: user.uid },
      {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null,
        passwordUpdatedAt: new Date()
      }
    );
    
    res.json({ message: 'Password reset successful' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @route POST /api/auth/verify-email
 * @desc Verify email with token
 * @access Public
 */
router.post('/verify-email', async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }
    
    // Find user with valid verification token
    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: new Date() }
    });
    
    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }
    
    // Update user as verified
    await User.findOneAndUpdate(
      { uid: user.uid },
      {
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null
      }
    );
    
    res.json({ message: 'Email verified successfully' });
  } catch (error) {
    console.error('Verify email error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @route POST /api/auth/logout
 * @desc Logout user by invalidating refresh token
 * @access Private
 */
router.post('/logout', authenticateJWT, isAuthenticated, async (req, res) => {
  try {
    // Clear refresh token
    await User.findOneAndUpdate(
      { uid: req.user.uid },
      { refreshToken: null }
    );
    
    res.json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @route GET /api/auth/me
 * @desc Get current user
 * @access Private
 */
router.get('/me', authenticateJWT, isAuthenticated, refreshUser, (req, res) => {
  // Remove sensitive data
  const user = { ...req.user };
  delete user.password;
  delete user.refreshToken;
  delete user.emailVerificationToken;
  delete user.passwordResetToken;
  
  res.json({ user });
});

/**
 * @route PUT /api/auth/update-profile
 * @desc Update user profile
 * @access Private
 */
router.put('/update-profile', authenticateJWT, isAuthenticated, refreshUser, async (req, res) => {
  try {
    const { displayName, photoURL, phoneNumber } = req.body;
    
    // Update user
    const updatedUser = await User.findOneAndUpdate(
      { uid: req.user.uid },
      {
        displayName: displayName || req.user.displayName,
        photoURL: photoURL || req.user.photoURL,
        phoneNumber: phoneNumber || req.user.phoneNumber
      }
    );
    
    // Remove sensitive data
    const user = { ...updatedUser };
    delete user.password;
    delete user.refreshToken;
    delete user.emailVerificationToken;
    delete user.passwordResetToken;
    
    res.json({ user });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @route PUT /api/auth/change-password
 * @desc Change user password
 * @access Private
 */
router.put('/change-password', authenticateJWT, isAuthenticated, refreshUser, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }
    
    // Check current password
    const isMatch = await bcrypt.compare(currentPassword, req.user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    
    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    // Update user with new password
    await User.findOneAndUpdate(
      { uid: req.user.uid },
      {
        password: hashedPassword,
        passwordUpdatedAt: new Date()
      }
    );
    
    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * Generate JWT access token
 * @param {Object} user - User object
 * @returns {string} JWT token
 */
const generateAccessToken = (user) => {
  return jwt.sign(
    {
      uid: user.uid,
      email: user.email,
      role: user.role || 'user'
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRATION || '30m' }
  );
};

/**
 * Generate JWT refresh token
 * @param {Object} user - User object
 * @returns {string} JWT token
 */
const generateRefreshToken = (user) => {
  return jwt.sign(
    {
      uid: user.uid,
      email: user.email
    },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRATION || '7d' }
  );
};

module.exports = router;
