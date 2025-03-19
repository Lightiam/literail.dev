// server/models/User.js
const { redis, prefixKey } = require('../services/redisClient');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

class User {
  /**
   * Create a new user
   * @param {Object} userData - User data
   * @returns {Promise<Object>} Created user
   */
  static async create(userData) {
    try {
      // Generate user ID if not provided
      const uid = userData.uid || uuidv4();
      
      // Check if email already exists
      const emailExists = await redis.exists(prefixKey(`email:${userData.email}`));
      
      if (emailExists) {
        throw new Error('Email already in use');
      }
      
      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(userData.password, salt);
      
      // Prepare user data
      const user = {
        uid,
        email: userData.email,
        password: hashedPassword,
        displayName: userData.displayName || userData.email.split('@')[0],
        role: userData.role || 'user',
        createdAt: userData.createdAt || new Date().toISOString(),
        updatedAt: userData.updatedAt || new Date().toISOString(),
        disabled: userData.disabled || false,
        emailVerified: userData.emailVerified || false,
        ...userData
      };
      
      // Remove password from user data
      delete user.password;
      
      // Store user data
      await redis.hmset(prefixKey(`user:${uid}`), user);
      
      // Create email to uid mapping
      await redis.set(prefixKey(`email:${userData.email}`), uid);
      
      return user;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }
  
  /**
   * Get a user by ID
   * @param {string} uid - User ID
   * @returns {Promise<Object|null>} User or null
   */
  static async findById(uid) {
    try {
      const user = await redis.hgetall(prefixKey(`user:${uid}`));
      
      if (!user || Object.keys(user).length === 0) {
        return null;
      }
      
      return user;
    } catch (error) {
      console.error(`Error finding user by ID ${uid}:`, error);
      throw error;
    }
  }
  
  /**
   * Get a user by email
   * @param {string} email - User email
   * @returns {Promise<Object|null>} User or null
   */
  static async findByEmail(email) {
    try {
      const uid = await redis.get(prefixKey(`email:${email}`));
      
      if (!uid) {
        return null;
      }
      
      return User.findById(uid);
    } catch (error) {
      console.error(`Error finding user by email ${email}:`, error);
      throw error;
    }
  }
  
  /**
   * Update a user
   * @param {string} uid - User ID
   * @param {Object} userData - User data to update
   * @returns {Promise<Object>} Updated user
   */
  static async update(uid, userData) {
    try {
      // Get existing user
      const existingUser = await User.findById(uid);
      
      if (!existingUser) {
        throw new Error('User not found');
      }
      
      // Handle email change
      if (userData.email && userData.email !== existingUser.email) {
        const emailExists = await redis.exists(prefixKey(`email:${userData.email}`));
        
        if (emailExists) {
          throw new Error('Email already in use');
        }
        
        // Update email mapping
        await redis.del(prefixKey(`email:${existingUser.email}`));
        await redis.set(prefixKey(`email:${userData.email}`), uid);
      }
      
      // Handle password change
      if (userData.password) {
        const salt = await bcrypt.genSalt(10);
        userData.password = await bcrypt.hash(userData.password, salt);
      }
      
      // Update user data
      const updatedUser = {
        ...existingUser,
        ...userData,
        updatedAt: new Date().toISOString()
      };
      
      // Store updated user data
      await redis.hmset(prefixKey(`user:${uid}`), updatedUser);
      
      // Remove password from returned data
      const returnedUser = { ...updatedUser };
      delete returnedUser.password;
      
      return returnedUser;
    } catch (error) {
      console.error(`Error updating user ${uid}:`, error);
      throw error;
    }
  }
  
  /**
   * Delete a user
   * @param {string} uid - User ID
   * @returns {Promise<boolean>} Success
   */
  static async delete(uid) {
    try {
      // Get user email
      const user = await User.findById(uid);
      
      if (!user) {
        return false;
      }
      
      // Delete email mapping
      await redis.del(prefixKey(`email:${user.email}`));
      
      // Delete user data
      await redis.del(prefixKey(`user:${uid}`));
      
      return true;
    } catch (error) {
      console.error(`Error deleting user ${uid}:`, error);
      throw error;
    }
  }
  
  /**
   * Authenticate a user
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<Object>} Authentication result
   */
  static async authenticate(email, password) {
    try {
      // Get user by email
      const uid = await redis.get(prefixKey(`email:${email}`));
      
      if (!uid) {
        throw new Error('Invalid credentials');
      }
      
      // Get user data including password
      const userData = await redis.hgetall(prefixKey(`user:${uid}`));
      
      if (!userData || Object.keys(userData).length === 0) {
        throw new Error('Invalid credentials');
      }
      
      // Check if user is disabled
      if (userData.disabled === 'true') {
        throw new Error('Account disabled');
      }
      
      // Get stored password
      const storedPassword = await redis.hget(prefixKey(`user:${uid}`), 'password');
      
      if (!storedPassword) {
        throw new Error('Invalid credentials');
      }
      
      // Compare passwords
      const isMatch = await bcrypt.compare(password, storedPassword);
      
      if (!isMatch) {
        throw new Error('Invalid credentials');
      }
      
      // Generate tokens
      const accessToken = jwt.sign(
        { uid: userData.uid, email: userData.email, role: userData.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_ACCESS_EXPIRATION || '30m' }
      );
      
      const refreshToken = jwt.sign(
        { uid: userData.uid },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: process.env.JWT_REFRESH_EXPIRATION || '7d' }
      );
      
      // Store refresh token
      await redis.set(
        prefixKey(`refresh:${userData.uid}`),
        refreshToken,
        'EX',
        60 * 60 * 24 * 7 // 7 days
      );
      
      // Remove password from user data
      const user = { ...userData };
      delete user.password;
      
      return {
        user,
        accessToken,
        refreshToken
      };
    } catch (error) {
      console.error('Authentication error:', error);
      throw error;
    }
  }
  
  /**
   * Refresh access token
   * @param {string} refreshToken - Refresh token
   * @returns {Promise<Object>} New tokens
   */
  static async refreshToken(refreshToken) {
    try {
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
      
      // Check if refresh token exists in Redis
      const storedToken = await redis.get(prefixKey(`refresh:${decoded.uid}`));
      
      if (!storedToken || storedToken !== refreshToken) {
        throw new Error('Invalid refresh token');
      }
      
      // Get user data
      const user = await User.findById(decoded.uid);
      
      if (!user) {
        throw new Error('User not found');
      }
      
      // Check if user is disabled
      if (user.disabled === 'true') {
        throw new Error('Account disabled');
      }
      
      // Generate new access token
      const accessToken = jwt.sign(
        { uid: user.uid, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_ACCESS_EXPIRATION || '30m' }
      );
      
      return {
        accessToken
      };
    } catch (error) {
      console.error('Token refresh error:', error);
      throw error;
    }
  }
  
  /**
   * Logout user
   * @param {string} uid - User ID
   * @returns {Promise<boolean>} Success
   */
  static async logout(uid) {
    try {
      // Delete refresh token
      await redis.del(prefixKey(`refresh:${uid}`));
      
      return true;
    } catch (error) {
      console.error(`Error logging out user ${uid}:`, error);
      throw error;
    }
  }
  
  /**
   * Request password reset
   * @param {string} email - User email
   * @returns {Promise<string>} Reset token
   */
  static async requestPasswordReset(email) {
    try {
      // Get user by email
      const user = await User.findByEmail(email);
      
      if (!user) {
        throw new Error('User not found');
      }
      
      // Generate reset token
      const resetToken = uuidv4();
      
      // Store reset token
      await redis.set(
        prefixKey(`reset:${user.uid}`),
        resetToken,
        'EX',
        60 * 60 // 1 hour
      );
      
      return resetToken;
    } catch (error) {
      console.error(`Error requesting password reset for ${email}:`, error);
      throw error;
    }
  }
  
  /**
   * Reset password
   * @param {string} uid - User ID
   * @param {string} resetToken - Reset token
   * @param {string} newPassword - New password
   * @returns {Promise<boolean>} Success
   */
  static async resetPassword(uid, resetToken, newPassword) {
    try {
      // Check if reset token exists
      const storedToken = await redis.get(prefixKey(`reset:${uid}`));
      
      if (!storedToken || storedToken !== resetToken) {
        throw new Error('Invalid or expired reset token');
      }
      
      // Update password
      await User.update(uid, { password: newPassword });
      
      // Delete reset token
      await redis.del(prefixKey(`reset:${uid}`));
      
      return true;
    } catch (error) {
      console.error(`Error resetting password for user ${uid}:`, error);
      throw error;
    }
  }
  
  /**
   * List all users
   * @param {number} limit - Maximum number of users to return
   * @param {number} offset - Number of users to skip
   * @returns {Promise<Array>} Users
   */
  static async list(limit = 100, offset = 0) {
    try {
      // Get all user keys
      const keys = await redis.keys(prefixKey('user:*'));
      
      if (keys.length === 0) {
        return [];
      }
      
      // Apply pagination
      const paginatedKeys = keys.slice(offset, offset + limit);
      
      // Get users
      const users = [];
      
      for (const key of paginatedKeys) {
        const userData = await redis.hgetall(key);
        
        if (userData && Object.keys(userData).length > 0) {
          // Remove password from user data
          delete userData.password;
          
          users.push(userData);
        }
      }
      
      return users;
    } catch (error) {
      console.error('Error listing users:', error);
      throw error;
    }
  }
  
  /**
   * Count users
   * @returns {Promise<number>} User count
   */
  static async count() {
    try {
      const keys = await redis.keys(prefixKey('user:*'));
      return keys.length;
    } catch (error) {
      console.error('Error counting users:', error);
      throw error;
    }
  }
}

module.exports = User;
