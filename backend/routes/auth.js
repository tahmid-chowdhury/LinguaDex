const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();

// Redis client and JWT_SECRET are passed from server.js
module.exports = function(client, JWT_SECRET) {
  // User Registration
  router.post('/register', async (req, res) => {
    try {
      const { username, password, email, native_language, target_language } = req.body;
      
      // Check if user already exists
      const existingUser = await client.hGet('users', username);
      if (existingUser) {
        return res.status(409).json({ error: 'Username already exists' });
      }
      
      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      
      // Create user object
      const user = {
        username,
        email,
        passwordHash: hashedPassword,
        nativeLanguage: native_language,
        targetLanguage: target_language,
        createdAt: new Date().toISOString()
      };
      
      // Save to Redis (store as JSON string)
      await client.hSet('users', username, JSON.stringify(user));
      
      // Create token
      const token = jwt.sign(
        { username: user.username },
        JWT_SECRET,
        { expiresIn: '7d' }
      );
      
      // Return user data and token
      const { passwordHash, ...userWithoutPassword } = user;
      res.status(201).json({
        user: userWithoutPassword,
        token
      });
    } catch (err) {
      console.error('Registration error:', err);
      res.status(500).json({ error: 'Failed to register user' });
    }
  });
  
  // User Login
  router.post('/login', async (req, res) => {
    try {
      const { username, password } = req.body;
      
      // Find user in Redis
      const userJson = await client.hGet('users', username);
      if (!userJson) {
        return res.status(401).json({ error: 'Invalid username or password' });
      }
      
      const user = JSON.parse(userJson);
      
      // Verify password
      const validPassword = await bcrypt.compare(password, user.passwordHash);
      if (!validPassword) {
        return res.status(401).json({ error: 'Invalid username or password' });
      }
      
      // Create and return token
      const token = jwt.sign(
        { username: user.username },
        JWT_SECRET,
        { expiresIn: '7d' }
      );
      
      // Return user data without password and the token
      const { passwordHash, ...userWithoutPassword } = user;
      res.json({
        user: userWithoutPassword,
        token
      });
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ error: 'Failed to log in' });
    }
  });

  // Verify Token
  router.get('/verify-token', async (req, res) => {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      
      if (!token) {
        return res.status(401).json({ authenticated: false, error: 'No token provided' });
      }
      
      // Verify the token
      const decoded = jwt.verify(token, JWT_SECRET);
      
      // Get user from Redis
      const userJson = await client.hGet('users', decoded.username);
      if (!userJson) {
        return res.status(401).json({ authenticated: false, error: 'User not found' });
      }
      
      const user = JSON.parse(userJson);
      const { passwordHash, ...userWithoutPassword } = user;
      
      res.json({
        authenticated: true,
        user: userWithoutPassword
      });
    } catch (error) {
      console.error('Token verification error:', error);
      res.status(401).json({ 
        authenticated: false, 
        error: error.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token' 
      });
    }
  });

  return router;
};