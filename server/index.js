// server/index.js
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const cors = require('cors');
const compression = require('compression');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const dotenv = require('dotenv');
const { redis } = require('./services/redisClient');

// Import security middleware
const setupSecurity = require('./middleware/security');

// Route imports
const authRoutes = require('./routes/auth');
const dataRoutes = require('./routes/data');
const adminRoutes = require('./routes/admin');
const aiRoutes = require('./routes/ai');

// Middleware imports
const { authenticateJWT } = require('./middleware/auth');

// Service imports
const socketService = require('./services/socketService');
const securityRules = require('./services/securityRules');
const aiService = require('./services/aiService');

// Load environment variables
dotenv.config();

// Create Express app
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Apply enhanced security middleware
setupSecurity(app);
app.use(compression());

// Logging middleware
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// Body parsing middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/data', authenticateJWT, dataRoutes);
app.use('/api/admin', authenticateJWT, adminRoutes);
app.use('/api/ai', aiRoutes);

// Serve static files from the client build directory in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
  
  // Serve index.html for any unknown routes
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build/index.html'));
  });
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Initialize socket service
socketService.init(io);

// Initialize security rules
securityRules.init().then(() => {
  console.log('Security rules initialized');
}).catch(error => {
  console.error('Error initializing security rules:', error);
});

// Test Redis connection
redis.ping().then(() => {
  console.log('Redis connection successful');
}).catch(error => {
  console.error('Redis connection error:', error);
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = { app, server };
