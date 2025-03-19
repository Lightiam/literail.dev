// server/middleware/security.js
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const xss = require('xss-clean');
const hpp = require('hpp');

const setupSecurity = (app) => {
  // Set security HTTP headers
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
  
  // Enable CORS with restrictive options
  app.use(cors({
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 3600
  }));
  
  // Rate limiting
  const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes by default
    max: parseInt(process.env.RATE_LIMIT_MAX) || 100, // 100 requests per window by default
    standardHeaders: true,
    message: 'Too many requests from this IP, please try again later'
  });
  app.use('/api/', limiter);
  
  // AI service specific stronger rate limit
  const aiLimiter = rateLimit({
    windowMs: parseInt(process.env.AI_RATE_LIMIT_WINDOW_MS) || 60 * 60 * 1000, // 1 hour by default
    max: parseInt(process.env.AI_RATE_LIMIT_MAX) || 50, // 50 requests per window by default
    message: 'Too many AI requests, please try again later'
  });
  app.use('/api/ai/', aiLimiter);
  
  // Data sanitization against XSS
  app.use(xss());
  
  // Prevent parameter pollution
  app.use(hpp({
    whitelist: [
      'orderBy', 'limit', 'startAt', 'endAt'
    ]
  }));
};

module.exports = setupSecurity;
