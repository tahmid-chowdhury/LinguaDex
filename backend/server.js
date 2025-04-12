const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
// Import Redis using the node-redis library instead of ioredis
const redis = require('redis');
const path = require('path');

// Initialize Redis client with promises
const initRedisClient = async () => {
  try {
    // Create Redis client with default connection
    const client = redis.createClient();
    
    // Add event handlers for logging
    client.on('error', (err) => console.error('Redis Client Error:', err));
    client.on('connect', () => console.log('Redis Client Connected'));
    client.on('reconnecting', () => console.log('Redis Client Reconnecting'));
    
    // Connect to Redis
    await client.connect();
    
    return client;
  } catch (error) {
    console.error('Failed to initialize Redis:', error);
    // Return a fallback in-memory store for testing purposes
    return createFallbackStore();
  }
};

// Fallback storage if Redis connection fails
const createFallbackStore = () => {
  console.log('Using in-memory fallback store instead of Redis');
  const store = {};
  
  return {
    hSet: async (hash, key, value) => {
      if (!store[hash]) store[hash] = {};
      store[hash][key] = value;
      return true;
    },
    hGet: async (hash, key) => {
      if (!store[hash]) return null;
      return store[hash][key];
    },
    hGetAll: async (hash) => {
      return store[hash] || {};
    },
    on: () => {}, // No-op for event handling
    connect: async () => {} // No-op for connect
  };
};

// Initialize Express app
const app = express();
const port = process.env.PORT || 880;

// JWT secret (use environment variable in production)
const JWT_SECRET = process.env.JWT_SECRET || 'linguadex_default_secret_key_for_development';

// CORS configuration
const corsOptions = {
  origin: 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// Middleware
app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Debug middleware to log requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Initialize Redis and start server
const startServer = async () => {
  try {
    // Initialize Redis client
    const redisClient = await initRedisClient();
    
    // Import routes and pass Redis client
    const authRoutes = require('./routes/auth')(redisClient, JWT_SECRET);
    app.use('/api/auth', authRoutes);
    
    // Error handling middleware
    app.use((err, req, res, next) => {
      console.error('Server error:', err);
      res.status(500).json({ error: 'Internal server error' });
    });
    
    // Start server
    app.listen(port, () => {
      console.log(`Express server running on port ${port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();