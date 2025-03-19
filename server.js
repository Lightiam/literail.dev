require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
const { authenticateJWT, refreshUser } = require('./server/middleware/auth');
const securityRules = require('./server/services/securityRules');
const socketService = require('./server/services/socketService');

// Initialize Express app
const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

// Initialize security rules
securityRules.init();

// Initialize Socket.IO
socketService.init(server);

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", 'https://cdnjs.cloudflare.com'],
      styleSrc: ["'self'", 'https://fonts.googleapis.com', "'unsafe-inline'"],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'", process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*'],
    }
  }
}));
app.use(compression());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the client/build directory
app.use(express.static(path.join(__dirname, 'client/build')));

// API routes
app.use('/api/auth', require('./server/routes/auth'));
app.use('/api/ai', require('./server/routes/ai'));

// Database API routes
app.get('/api/data/:path(*)', authenticateJWT, refreshUser, async (req, res) => {
  try {
    const databaseService = require('./server/services/databaseService');
    const path = req.params.path;
    
    const data = await databaseService.getData(path, req.user);
    res.json({ path, data });
  } catch (error) {
    console.error(`Error getting data at path ${req.params.path}:`, error);
    res.status(error.message === 'Permission denied' ? 403 : 500).json({ error: error.message });
  }
});

app.post('/api/data/:path(*)', authenticateJWT, refreshUser, async (req, res) => {
  try {
    const databaseService = require('./server/services/databaseService');
    const path = req.params.path;
    const data = req.body;
    
    const result = await databaseService.setData(path, data, req.user);
    res.json(result);
  } catch (error) {
    console.error(`Error setting data at path ${req.params.path}:`, error);
    res.status(error.message === 'Permission denied' ? 403 : 500).json({ error: error.message });
  }
});

app.put('/api/data/:path(*)', authenticateJWT, refreshUser, async (req, res) => {
  try {
    const databaseService = require('./server/services/databaseService');
    const path = req.params.path;
    const data = req.body;
    
    const result = await databaseService.updateData(path, data, req.user);
    res.json(result);
  } catch (error) {
    console.error(`Error updating data at path ${req.params.path}:`, error);
    res.status(error.message === 'Permission denied' ? 403 : 500).json({ error: error.message });
  }
});

app.delete('/api/data/:path(*)', authenticateJWT, refreshUser, async (req, res) => {
  try {
    const databaseService = require('./server/services/databaseService');
    const path = req.params.path;
    
    const result = await databaseService.deleteData(path, req.user);
    res.json(result);
  } catch (error) {
    console.error(`Error deleting data at path ${req.params.path}:`, error);
    res.status(error.message === 'Permission denied' ? 403 : 500).json({ error: error.message });
  }
});

// Security rules API
app.get('/api/security/rules', authenticateJWT, refreshUser, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    res.json({ rules: securityRules.rules });
  } catch (error) {
    console.error('Error getting security rules:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/security/rules', authenticateJWT, refreshUser, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const rules = req.body;
    await securityRules.updateRules(rules);
    
    res.json({ success: true, rules });
  } catch (error) {
    console.error('Error updating security rules:', error);
    res.status(500).json({ error: error.message });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve index.html for any unknown routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/build/index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Server error', message: err.message });
});

// Start server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
