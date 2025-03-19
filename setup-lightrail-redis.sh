#!/bin/bash

# LightRail.dev Setup Script (Redis Version)
# This script creates the entire project structure and all necessary files

# Exit on any error
set -e

echo "Setting up LightRail.dev project with Redis..."

# Create project directory
mkdir -p lightrail
cd lightrail

# Create directory structure
echo "Creating directory structure..."
mkdir -p server/{routes,services,models,middleware,utils}
mkdir -p client/src/{components,pages,hooks,contexts,utils}
mkdir -p config uploads

# Create .env file
cat > .env.example << 'EOF'
# LightRail.dev Environment Variables

# Server Configuration
NODE_ENV=development
PORT=3000
CORS_ORIGIN=*

# Redis Configuration
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=
REDIS_PREFIX=lightrail:

# Authentication
JWT_SECRET=your_jwt_secret_key_here
JWT_REFRESH_SECRET=your_refresh_secret_key_here
JWT_ACCESS_EXPIRATION=1h
JWT_REFRESH_EXPIRATION=7d

# Email Configuration (optional)
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_USER=your_email@example.com
EMAIL_PASS=your_email_password
EMAIL_FROM=noreply@lightrail.dev

# Storage Configuration (optional)
STORAGE_TYPE=local # or s3
STORAGE_PATH=./uploads
# S3 Config (if using S3)
S3_BUCKET=your-bucket-name
S3_REGION=us-east-1
S3_ACCESS_KEY=your_s3_access_key
S3_SECRET_KEY=your_s3_secret_key

# AI Assistant Configuration (optional)
OPENAI_API_KEY=your_openai_api_key_here
AI_TEMPERATURE=0.3
AI_MAX_TOKENS=2000
AI_MODEL=gpt-4-turbo-preview
EOF

cp .env.example .env

# Create package.json with Redis
cat > package.json << 'EOF'
{
  "name": "lightrail",
  "version": "1.0.0",
  "description": "Open source Firebase alternative with GenAI capabilities",
  "main": "server/index.js",
  "scripts": {
    "start": "node server/index.js",
    "dev": "nodemon server/index.js",
    "client": "cd client && npm start",
    "dev:full": "concurrently \"npm run dev\" \"npm run client\"",
    "test": "jest",
    "lint": "eslint .",
    "build": "cd client && npm run build",
    "prepare": "husky install",
    "install:all": "npm install && cd client && npm install"
  },
  "author": "LightRail.dev Team",
  "license": "MIT",
  "dependencies": {
    "bcryptjs": "^2.4.3",
    "compression": "^1.7.4",
    "cors": "^2.8.5",
    "dotenv": "^16.0.0",
    "express": "^4.17.3",
    "express-rate-limit": "^6.3.0",
    "helmet": "^5.0.2",
    "ioredis": "^5.3.2",
    "jsonwebtoken": "^8.5.1",
    "morgan": "^1.10.0",
    "node-cache": "^5.1.2",
    "nodemailer": "^6.7.3",
    "openai": "^3.2.1",
    "socket.io": "^4.4.1",
    "uuid": "^8.3.2",
    "vm2": "^3.9.9"
  },
  "devDependencies": {
    "concurrently": "^7.1.0",
    "eslint": "^8.13.0",
    "eslint-config-prettier": "^8.5.0",
    "eslint-plugin-jest": "^26.1.4",
    "eslint-plugin-node": "^11.1.0",
    "husky": "^7.0.4",
    "jest": "^27.5.1",
    "lint-staged": "^12.3.7",
    "nodemon": "^2.0.15",
    "prettier": "^2.6.2",
    "supertest": "^6.2.2"
  },
  "engines": {
    "node": ">=14.0.0"
  },
  "jest": {
    "testEnvironment": "node",
    "coveragePathIgnorePatterns": [
      "/node_modules/"
    ]
  },
  "lint-staged": {
    "*.js": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.json": [
      "prettier --write"
    ]
  }
}
EOF

# Create client package.json
cat > client/package.json << 'EOF'
{
  "name": "lightrail-client",
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "@tailwindcss/forms": "^0.5.0",
    "@tailwindcss/typography": "^0.5.2",
    "axios": "^0.26.1",
    "framer-motion": "^6.3.0",
    "lucide-react": "^0.16.29",
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "react-markdown": "^8.0.2",
    "react-router-dom": "^6.3.0",
    "react-scripts": "5.0.1",
    "react-syntax-highlighter": "^15.5.0",
    "react-toastify": "^8.2.0",
    "socket.io-client": "^4.4.1",
    "tailwindcss": "^3.0.24"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test",
    "eject": "react-scripts eject"
  },
  "eslintConfig": {
    "extends": [
      "react-app",
      "react-app/jest"
    ]
  },
  "browserslist": {
    "production": [
      ">0.2%",
      "not dead",
      "not op_mini all"
    ],
    "development": [
      "last 1 chrome version",
      "last 1 firefox version",
      "last 1 safari version"
    ]
  },
  "devDependencies": {
    "autoprefixer": "^10.4.4",
    "postcss": "^8.4.12"
  },
  "proxy": "http://localhost:3000"
}
EOF

# Create docker-compose.yml with Redis
cat > docker-compose.yml << 'EOF'
# docker-compose.yml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - REDIS_URL=redis://redis:6379
      - REDIS_PASSWORD=${REDIS_PASSWORD}
      - REDIS_PREFIX=lightrail:
      - JWT_SECRET=${JWT_SECRET}
      - JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
      - JWT_ACCESS_EXPIRATION=1h
      - JWT_REFRESH_EXPIRATION=7d
      - CORS_ORIGIN=*
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - AI_TEMPERATURE=0.3
      - AI_MAX_TOKENS=2000
      - AI_MODEL=gpt-4-turbo-preview
    depends_on:
      - redis
    restart: unless-stopped
    volumes:
      - ./config:/app/config
      - ./uploads:/app/uploads

  redis:
    image: redis:6-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    command: redis-server --appendonly yes
    restart: unless-stopped

volumes:
  redis-data:
EOF

# Create Dockerfile
cat > Dockerfile << 'EOF'
# Dockerfile
FROM node:16-alpine

WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json ./
RUN npm ci --only=production

# Copy application code
COPY . .

# Create config directory
RUN mkdir -p /app/config

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", "server/index.js"]
EOF

# Create .gitignore
cat > .gitignore << 'EOF'
# Logs
logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Directory for instrumented libs generated by jscoverage/JSCover
lib-cov

# Coverage directory used by tools like istanbul
coverage

# nyc test coverage
.nyc_output

# Dependency directories
node_modules/
jspm_packages/

# TypeScript v1 declaration files
typings/

# Optional npm cache directory
.npm

# Optional eslint cache
.eslintcache

# Optional REPL history
.node_repl_history

# Output of 'npm pack'
*.tgz

# Yarn Integrity file
.yarn-integrity

# dotenv environment variables file
.env
.env.test

# Build output
dist
build

# IDE files
.idea/
.vscode/
EOF

# Create README.md
cat > README.md << 'EOF'
# LightRail.dev - GenAI-Powered Firebase Alternative

LightRail.dev is a self-hosted, open-source alternative to Firebase, providing real-time database capabilities, authentication services, and GenAI-powered database management for non-technical users.

## Features

- **Real-time Database**: Store and sync data in real-time with Redis
- **Authentication**: Email/password authentication with JWT tokens
- **Security Rules**: Firebase-like security rules for fine-grained access control
- **Real-time Updates**: WebSocket-based real-time updates for subscribed paths
- **Client SDK**: Easy-to-use JavaScript SDK with a Firebase-compatible API
- **Offline Support**: Cache operations when offline and sync when back online
- **🔥 NEW: GenAI Database Assistant**: Chat with your database using natural language

## Quick Start

The fastest way to get started is using Docker Compose:

```bash
# Clone the repository
git clone https://github.com/yourusername/lightrail.git
cd lightrail

# Create .env file with secrets
echo "JWT_SECRET=$(openssl rand -hex 32)" >> .env
echo "JWT_REFRESH_SECRET=$(openssl rand -hex 32)" >> .env
# Add OpenAI API key for AI features (optional)
echo "OPENAI_API_KEY=your-api-key" >> .env

# Start the services
docker-compose up -d
```

Then open your browser to `http://localhost:3000` to see the dashboard.

## Installation Without Docker

### Prerequisites

- Node.js 14+ 
- Redis 6+
- OpenAI API key (optional, for advanced AI features)

### Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/lightrail.git
cd lightrail

# Install dependencies
npm run install:all

# Create .env file
cp .env.example .env
# Edit .env file with your configuration

# Start the server
npm run dev:full
```

## License

This project is licensed under the MIT License.
EOF

# Create Redis client service
cat > server/services/redisClient.js << 'EOF'
// server/services/redisClient.js
const Redis = require('ioredis');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Create Redis client
const redis = new Redis(process.env.REDIS_URL, {
  password: process.env.REDIS_PASSWORD || undefined,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  }
});

// Key prefix for namespacing
const prefix = process.env.REDIS_PREFIX || 'lightrail:';

// Add prefix to key
const prefixKey = (key) => `${prefix}${key}`;

redis.on('connect', () => {
  console.log('Connected to Redis');
});

redis.on('error', (error) => {
  console.error('Redis connection error:', error);
});

module.exports = {
  redis,
  prefixKey
};
EOF

# Create server index.js with Redis
cat > server/index.js << 'EOF'
// server/index.js
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const morgan = require('morgan');
const path = require('path');

// Load Redis client
const { redis } = require('./services/redisClient');

// Route imports
const authRoutes = require('./routes/auth');
const databaseRoutes = require('./routes/database');
const storageRoutes = require('./routes/storage');
const adminRoutes = require('./routes/admin');
const aiRoutes = require('./routes/ai');

// Middleware imports
const { authenticateJWT } = require('./middleware/auth');
const errorHandler = require('./middleware/errorHandler');

// Service imports
const socketService = require('./services/socketService');
const securityRules = require('./services/securityRules');
const aiService = require('./services/aiService');

// Load environment variables
dotenv.config();

// Initialize express app
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true
  }
});

// Basic security and performance middleware
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('dev'));

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again after 15 minutes'
});
app.use('/api/', apiLimiter);

// Special rate limit for AI routes
const aiLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20, // limit each IP to 20 AI requests per windowMs
  message: 'Too many AI requests from this IP, please try again after 5 minutes'
});
app.use('/api/ai/', aiLimiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime() });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/database', authenticateJWT, databaseRoutes);
app.use('/api/storage', authenticateJWT, storageRoutes);
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

// Error handling middleware (must be after routes)
app.use(errorHandler);

// Initialize socket service
socketService.init(io);

// Initialize security rules
securityRules.init().then(() => {
  console.log('Security rules initialized');
}).catch(error => {
  console.error('Error initializing security rules:', error);
});

// Test Redis connection
redis.ping().then((result) => {
  if (result === 'PONG') {
    console.log('Redis connection successful');
    
    // Start the server
    const PORT = process.env.PORT || 3000;
    server.listen(PORT, () => {
      console.log(`LightRail.dev server running on port ${PORT}`);
      console.log(`GenAI assistant ${process.env.OPENAI_API_KEY ? 'enabled' : 'running in limited mode'}`);
    });
  }
}).catch(err => {
  console.error('Redis connection failed:', err);
  process.exit(1);
});

// Handle graceful shutdown
const gracefulShutdown = () => {
  console.log('Shutting down gracefully...');
  server.close(() => {
    console.log('HTTP server closed');
    redis.quit().then(() => {
      console.log('Redis connection closed');
      process.exit(0);
    });
  });
  
  // Force close after 10 seconds
  setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
EOF

# Create Redis-based database service
cat > server/services/databaseService.js << 'EOF'
// server/services/databaseService.js
const { redis, prefixKey } = require('./redisClient');
const securityRules = require('./securityRules');
const socketService = require('./socketService');
const { v4: uuidv4 } = require('uuid');

class DatabaseService {
  /**
   * Get data at a specific path
   * @param {string} path - The data path
   * @param {Object} user - User object for permissions
   * @param {Object} options - Query options (limit, orderBy, etc)
   * @returns {Promise<Object>} The data at the specified path
   */
  async getData(path, user, options = {}) {
    // Normalize path
    const normalizedPath = this.normalizePath(path);
    
    // Check read permission
    const hasPermission = await securityRules.canRead(normalizedPath, user);
    if (!hasPermission) {
      throw new Error('Permission denied');
    }

    // If path is root, get all top-level nodes
    if (normalizedPath === '') {
      return this.getRootData(user);
    }

    // Get data from Redis
    const redisKey = prefixKey(`data:${normalizedPath}`);
    const data = await redis.get(redisKey);
    
    if (data) {
      return JSON.parse(data);
    }
    
    // Check if it's a parent path by using pattern matching in Redis
    const childKeys = await redis.keys(prefixKey(`data:${normalizedPath}/*`));
    
    if (childKeys.length > 0) {
      return this.getChildrenData(normalizedPath, user, options);
    }
    
    // Path doesn't exist
    return null;
  }

  /**
   * Get root level data
   * @param {Object} user - User object for permissions check
   * @returns {Promise<Object>} Root level data as object
   */
  async getRootData(user) {
    // Get all top-level keys
    const pattern = prefixKey('data:*');
    const keys = await redis.keys(pattern);
    
    // Extract the top-level paths
    const topLevelPaths = new Set();
    keys.forEach(key => {
      const path = key.replace(prefixKey('data:'), '');
      const topLevel = path.split('/')[0];
      if (topLevel) {
        topLevelPaths.add(topLevel);
      }
    });
    
    // Create result object
    const result = {};
    
    // Get data for each top-level path
    for (const path of topLevelPaths) {
      // Check permission
      const hasPermission = await securityRules.canRead(path, user);
      if (hasPermission) {
        const data = await this.getData(path, user);
        if (data !== null) {
          result[path] = data;
        }
      }
    }
    
    return result;
  }

  /**
   * Get children data at a path
   * @param {string} parentPath - Parent path
   * @param {Object} user - User object for permissions
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Children data
   */
  async getChildrenData(parentPath, user, options = {}) {
    const pathPrefix = parentPath ? `${parentPath}/` : '';
    const pattern = prefixKey(`data:${pathPrefix}*`);
    
    // Get all keys matching the pattern
    const keys = await redis.keys(pattern);
    
    // Filter to direct children only
    const childKeys = keys.filter(key => {
      const path = key.replace(prefixKey('data:'), '');
      const relativePath = path.substring(pathPrefix.length);
      return !relativePath.includes('/');
    });
    
    // Apply limit if specified
    if (options.limit && typeof options.limit === 'number') {
      childKeys.splice(options.limit);
    }
    
    // Create result object
    const result = {};
    
    // Get data for each child
    for (const key of childKeys) {
      const path = key.replace(prefixKey('data:'), '');
      const childKey = path.split('/').pop();
      
      // Check permission
      const hasPermission = await securityRules.canRead(path, user);
      if (hasPermission) {
        const data = await redis.get(key);
        if (data) {
          result[childKey] = JSON.parse(data);
        }
      }
    }
    
    // Apply ordering if specified - note this is done in memory
    // since Redis doesn't support ordering in key scans
    if (options.orderBy && Object.keys(result).length > 0) {
      const [field, direction] = options.orderBy.split(':');
      const sortDir = direction === 'desc' ? -1 : 1;
      
      const sortedEntries = Object.entries(result).sort(([, a], [, b]) => {
        if (a[field] < b[field]) return -1 * sortDir;
        if (a[field] > b[field]) return 1 * sortDir;
        return 0;
      });
      
      return Object.fromEntries(sortedEntries);
    }
    
    return result;
  }

  /**
   * Set data at a specific path
   * @param {string} path - The data path
   * @param {*} value - The data to set
   * @param {Object} user - User object for permissions
   * @returns {Promise<boolean>} Success status
   */
  async setData(path, value, user) {
    // Normalize path
    const normalizedPath = this.normalizePath(path);
    
    // Check write permission
    const hasPermission = await securityRules.canWrite(normalizedPath, user);
    if (!hasPermission) {
      throw new Error('Permission denied');
    }
    
    // Validate value
    if (value === undefined) {
      throw new Error('Value cannot be undefined');
    }
    
    try {
      // If value is null, delete the node
      if (value === null) {
        return this.removeData(normalizedPath, user);
      }
      
      // Set data in Redis
      const redisKey = prefixKey(`data:${normalizedPath}`);
      
      // Add metadata
      const metadata = {
        updatedAt: new Date().toISOString(),
        updatedBy: user ? user.uid : 'system'
      };
      
      // Store data with metadata
      await redis.set(redisKey, JSON.stringify(value));
      
      // Store metadata separately
      await redis.hmset(prefixKey(`meta:${normalizedPath}`), metadata);
      
      // Notify subscribers about the change
      socketService.emitPathChange(normalizedPath, value);
      
      return true;
    } catch (error) {
      console.error('Error setting data:', error);
      throw new Error('Failed to set data');
    }
  }

  /**
   * Update data at a specific path (partial update)
   * @param {string} path - The data path
   * @param {Object} updates - The updates to apply
   * @param {Object} user - User object for permissions
   * @returns {Promise<boolean>} Success status
   */
  async updateData(path, updates, user) {
    // Normalize path
    const normalizedPath = this.normalizePath(path);
    
    // Check write permission
    const hasPermission = await securityRules.canWrite(normalizedPath, user);
    if (!hasPermission) {
      throw new Error('Permission denied');
    }
    
    // Get current data
    const redisKey = prefixKey(`data:${normalizedPath}`);
    const currentData = await redis.get(redisKey);
    
    if (!currentData) {
      // If node doesn't exist, create it with the updates
      return this.setData(normalizedPath, updates, user);
    }
    
    // Merge updates with current value
    const currentValue = JSON.parse(currentData);
    const newValue = this.mergeObjects(currentValue, updates);
    
    // Set the updated value
    return this.setData(normalizedPath, newValue, user);
  }

  /**
   * Push data to a list at a specific path
   * @param {string} path - The data path
   * @param {*} value - The value to push
   * @param {Object} user - User object for permissions
   * @returns {Promise<string>} The generated key
   */
  async pushData(path, value, user) {
    // Normalize path
    const normalizedPath = this.normalizePath(path);
    
    // Check write permission
    const hasPermission = await securityRules.canWrite(normalizedPath, user);
    if (!hasPermission) {
      throw new Error('Permission denied');
    }
    
    // Generate unique key
    const key = this.generatePushKey();
    
    // Create the new path
    const newPath = normalizedPath ? `${normalizedPath}/${key}` : key;
    
    // Set the data
    await this.setData(newPath, value, user);
    
    return key;
  }

  /**
   * Remove data at a specific path
   * @param {string} path - The data path
   * @param {Object} user - User object for permissions
   * @returns {Promise<boolean>} Success status
   */
  async removeData(path, user) {
    // Normalize path
    const normalizedPath = this.normalizePath(path);
    
    // Check write permission
    const hasPermission = await securityRules.canWrite(normalizedPath, user);
    if (!hasPermission) {
      throw new Error('Permission denied');
    }
    
    try {
      // Delete the node
      const redisKey = prefixKey(`data:${normalizedPath}`);
      await redis.del(redisKey);
      
      // Delete metadata
      await redis.del(prefixKey(`meta:${normalizedPath}`));
      
      // Delete all children using pattern matching
      const childPattern = prefixKey(`data:${normalizedPath}/*`);
      const childKeys = await redis.keys(childPattern);
      
      if (childKeys.length > 0) {
        await redis.del(...childKeys);
        
        // Also delete child metadata
        const childMetaPattern = prefixKey(`meta:${normalizedPath}/*`);
        const childMetaKeys = await redis.keys(childMetaPattern);
        
        if (childMetaKeys.length > 0) {
          await redis.del(...childMetaKeys);
        }
      }
      
      // Notify subscribers about the deletion
      socketService.emitPathChange(normalizedPath, null);
      
      return true;
    } catch (error) {
      console.error('Error removing data:', error);
      throw new Error('Failed to remove data');
    }
  }

  /**
   * Run a transaction to update data atomically
   * @param {string} path - The data path
   * @param {Function} updateFn - Update function that takes current value and returns new value
   * @param {Object} user - User object for permissions
   * @returns {Promise<*>} The result of the transaction
   */
  async transaction(path, updateFn, user) {
    // Normalize path
    const normalizedPath = this.normalizePath(path);
    
    // Check write permission
    const hasPermission = await securityRules.canWrite(normalizedPath, user);
    if (!hasPermission) {
      throw new Error('Permission denied');
    }
    
    // Use Redis WATCH for optimistic locking
    const redisKey = prefixKey(`data:${normalizedPath}`);
    
    try {
      // Start transaction with WATCH
      await redis.watch(redisKey);
      
      // Get current data
      const currentData = await redis.get(redisKey);
      const currentValue = currentData ? JSON.parse(currentData) : null;
      
      // Apply update function
      const newValue = await updateFn(currentValue);
      
      // Execute transaction
      const multi = redis.multi();
      
      if (newValue === null) {
        // Delete the key
        multi.del(redisKey);
      } else {
        // Set the new value
        multi.set(redisKey, JSON.stringify(newValue));
      }
      
      // Update metadata
      const metadata = {
        updatedAt: new Date().toISOString(),
        updatedBy: user ? user.uid : 'system'
      };
      
      if (newValue === null) {
        multi.del(prefixKey(`meta:${normalizedPath}`));
      } else {
        multi.hmset(prefixKey(`meta:${normalizedPath}`), metadata);
      }
      
      // Execute multi commands as transaction
      const results = await multi.exec();
      
      // Check if transaction succeeded
      if (!results) {
        throw new Error('Transaction failed, please retry');
      }
      
      // Notify subscribers about the change
      socketService.emitPathChange(normalizedPath, newValue);
      
      return newValue;
    } catch (error) {
      console.error('Transaction failed:', error);
      throw new Error('Transaction failed');
    } finally {
      // Always unwatch to release locks
      await redis.unwatch();
    }
  }

  /**
   * Query data at a path with filtering
   * @param {string} path - The data path
   * @param {Object} filters - Query filters
   * @param {Object} user - User object for permissions
   * @returns {Promise<Object>} Query results
   */
  async queryData(path, filters, user) {
    // Normalize path
    const normalizedPath = this.normalizePath(path);
    
    // Check read permission
    const hasPermission = await securityRules.canRead(normalizedPath, user);
    if (!hasPermission) {
      throw new Error('Permission denied');
    }
    
    // Get child paths
    const pathPrefix = normalizedPath ? `${normalizedPath}/` : '';
    const pattern = prefixKey(`data:${pathPrefix}*`);
    const keys = await redis.keys(pattern);
    
    // Filter to direct children only
    const childKeys = keys.filter(key => {
      const path = key.replace(prefixKey('data:'), '');
      const relativePath = path.substring(pathPrefix.length);
      return !relativePath.includes('/');
    });
    
    // Create result object
    const result = {};
    
    // Get and filter data
    for (const key of childKeys) {
      const path = key.replace(prefixKey('data:'), '');
      const childKey = path.split('/').pop();
      
      // Check permission
      const hasPermission = await securityRules.canRead(path, user);
      if (!hasPermission) continue;
      
      const data = await redis.get(key);
      if (!data) continue;
      
      const value = JSON.parse(data);
      
      // Apply filtering conditions
      let includeNode = true;
      
      if (filters.where) {
        for (const [field, condition] of Object.entries(filters.where)) {
          const fieldValue = value[field];
          
          // Apply condition
          if (typeof condition === 'object') {
            // Complex condition
            if (condition.equalTo !== undefined && fieldValue !== condition.equalTo) {
              includeNode = false;
            }
            if (condition.notEqualTo !== undefined && fieldValue === condition.notEqualTo) {
              includeNode = false;
            }
            if (condition.lessThan !== undefined && fieldValue >= condition.lessThan) {
              includeNode = false;
            }
            if (condition.greaterThan !== undefined && fieldValue <= condition.greaterThan) {
              includeNode = false;
            }
            // Add more conditions as needed
          } else {
            // Simple equality
            if (fieldValue !== condition) {
              includeNode = false;
            }
          }
        }
      }
      
      // Include node if it passes all conditions
      if (includeNode) {
        result[childKey] = value;
      }
    }
    
    // Apply ordering
    if (filters.orderBy && Object.keys(result).length > 0) {
      const [field, direction] = filters.orderBy.split(':');
      const sortDir = direction === 'desc' ? -1 : 1;
      
      const sortedEntries = Object.entries(result).sort(([, a], [, b]) => {
        if (a[field] < b[field]) return -1 * sortDir;
        if (a[field] > b[field]) return 1 * sortDir;
        return 0;
      });
      
      // Convert back to object
      const orderedResult = Object.fromEntries(sortedEntries);
      
      // Apply limit
      if (filters.limit && typeof filters.limit === 'number') {
        const limitedEntries = Object.entries(orderedResult).slice(0, filters.limit);
        return Object.fromEntries(limitedEntries);
      }
      
      return orderedResult;
    }
    
    // Apply limit
    if (filters.limit && typeof filters.limit === 'number') {
      const limitedEntries = Object.entries(result).slice(0, filters.limit);
      return Object.fromEntries(limitedEntries);
    }
    
    return result;
  }

  // Utility functions

  /**
   * Normalize a path by removing leading/trailing slashes
   * @param {string} path - The path to normalize
   * @returns {string} Normalized path
   */
  normalizePath(path) {
    if (!path) return '';
    return path.replace(/^\/+|\/+$/g, '');
  }

  /**
   * Escape special characters in string for use in RegExp
   * @param {string} string - String to escape
   * @returns {string} Escaped string
   */
  escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Generate a unique key for push operations
   * @returns {string} Push key
   */
  generatePushKey() {
    // Firebase-like push key
    const PUSH_CHARS = '-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz';
    let id = '';
    
    // Timestamp part - 8 characters
    let timestamp = new Date().getTime();
    for (let i = 7; i >= 0; i--) {
      id += PUSH_CHARS.charAt(timestamp % 64);
      timestamp = Math.floor(timestamp / 64);
    }
    
    // Random part - 12 characters
    for (let i = 0; i < 12; i++) {
      id += PUSH_CHARS.charAt(Math.floor(Math.random() * 64));
    }
    
    return id;
  }

  /**
   * Deep merge objects
   * @param {Object} target - Target object
   * @param {Object} source - Source object
   * @returns {Object} Merged object
   */
  mergeObjects(target, source) {
    if (typeof target !== 'object' || target === null) {
      return source;
    }
    
    const output = { ...target };
    
    if (typeof source === 'object' && source !== null) {
      Object.keys(source).forEach(key => {
        if (typeof source[key] === 'object' && source[key] !== null && 
            typeof output[key] === 'object' && output[key] !== null) {
          output[key] = this.mergeObjects(output[key], source[key]);
        } else {
          output[key] = source[key];
        }
      });
    }
    
    return output;
  }

  /**
   * Get database stats for monitoring and AI
   * @returns {Promise<Object>} Database statistics
   */
  async getDatabaseStats() {
    try {
      // Get all data keys
      const dataKeys = await redis.keys(prefixKey('data:*'));
      const totalNodes = dataKeys.length;
      
      // Get distinct paths (top-level)
      const topLevelPaths = new Set();
      dataKeys.forEach(key => {
        const path = key.replace(prefixKey('data:'), '');
        const topLevel = path.split('/')[0];
        if (topLevel) {
          topLevelPaths.add(topLevel);
        }
      });
      
      // Get recent updates from metadata
      const metaKeys = await redis.keys(prefixKey('meta:*'));
      const recentUpdates = [];
      
      // Get the 5 most recently updated paths
      for (let i = 0; i < Math.min(5, metaKeys.length); i++) {
        const metaKey = metaKeys[i];
        const path = metaKey.replace(prefixKey('meta:'), '');
        const metadata = await redis.hgetall(metaKey);
        
        if (metadata && metadata.updatedAt) {
          recentUpdates.push({
            path,
            updatedAt: metadata.updatedAt,
            updatedBy: metadata.updatedBy || 'unknown'
          });
        }
      }
      
      // Sort by updatedAt
      recentUpdates.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      
      return {
        totalNodes,
        totalPaths: topLevelPaths.size,
        recentUpdates: recentUpdates.slice(0, 5)
      };
    } catch (error) {
      console.error('Error getting database stats:', error);
      return { totalNodes: 0, totalPaths: 0, recentUpdates: [] };
    }
  }
}

module.exports = new DatabaseService();
EOF

# Create AI Service with Redis
cat > server/services/aiService.js << 'EOF'
// server/services/aiService.js
const { Configuration, OpenAIApi } = require('openai');
const { redis, prefixKey } = require('./redisClient');
const databaseService = require('./databaseService');
const securityRules = require('./securityRules');

class AIService {
  constructor() {
    this.openai = null;
    this.systemPrompt = `You are DatabaseGPT, an AI assistant for the LightRail.dev database platform. 
You help users interact with their Redis-based database using natural language. You can:
1. Analyze database structure and provide insights
2. Generate database queries based on user requests
3. Monitor database performance and health
4. Check for security vulnerabilities
5. Help with data compliance
6. Explain database concepts in simple terms

When responding to user queries:
- If a user asks for data, convert their question to a database query
- If you need to fetch data, indicate exactly what path to query
- For monitoring questions, check relevant metrics
- For security questions, analyze access patterns and rules
- Always explain what you're doing in simple terms
- Never make up information about the database structure or content`;
    
    this.MAX_CONVERSATION_LENGTH = 10;
    this.setupOpenAI();
  }

  setupOpenAI() {
    // Only initialize if API key is provided
    if (process.env.OPENAI_API_KEY) {
      const configuration = new Configuration({
        apiKey: process.env.OPENAI_API_KEY,
      });
      this.openai = new OpenAIApi(configuration);
      console.log('AI service initialized with OpenAI');
    } else {
      console.warn('OPENAI_API_KEY not provided. AI service will be limited.');
    }
  }

  /**
   * Process a user message and generate an AI response
   * @param {string} message - User message
   * @param {Array} conversation - Previous conversation history
   * @param {Object} user - Authenticated user
   * @returns {Promise<Object>} AI response
   */
  async processMessage(message, conversation = [], user) {
    // Ensure conversation doesn't exceed max length
    if (conversation.length > this.MAX_CONVERSATION_LENGTH * 2) {
      conversation = conversation.slice(-this.MAX_CONVERSATION_LENGTH * 2);
    }
    
    // Generate database context
    const dbContext = await this.generateDatabaseContext(user);
    
    // Prepare messages for AI
    const messages = [
      { role: 'system', content: this.systemPrompt + '\n\n' + dbContext },
      ...conversation,
      { role: 'user', content: message }
    ];
    
    try {
      // If OpenAI is configured, use it
      if (this.openai) {
        const response = await this.openai.createChatCompletion({
          model: "gpt-4-turbo-preview", // Use the latest model
          messages: messages,
          temperature: 0.3, // More precise responses
          max_tokens: 2000
        });
        
        const aiMessage = response.data.choices[0].message.content;
        
        // Process any database operations requested by the AI
        const processedMessage = await this.processOperations(aiMessage, user);
        
        return {
          message: processedMessage,
          needsAuth: this.responseNeedsAuth(processedMessage),
          type: 'ai'
        };
      } 
      // Fallback for when OpenAI is not configured
      else {
        return this.fallbackAIResponse(message, dbContext, user);
      }
    } catch (error) {
      console.error('Error in AI service:', error);
      return {
        message: `I encountered an error processing your request. Please try again or rephrase your question. ${error.message}`,
        type: 'error'
      };
    }
  }

  /**
   * Generate database context information
   * @param {Object} user - Authenticated user
   * @returns {Promise<string>} Database context
   */
  async generateDatabaseContext(user) {
    try {
      let context = "CURRENT DATABASE CONTEXT (Redis-based):\n";
      
      // Get top-level paths that the user has access to
      const topLevelPaths = await this.getAccessibleTopLevelPaths(user);
      context += `Available top-level paths: ${topLevelPaths.join(', ')}\n\n`;
      
      // Get a sample of recent data updates
      const recentUpdates = await this.getRecentDataUpdates(user);
      if (recentUpdates.length > 0) {
        context += "Recent data updates:\n";
        recentUpdates.forEach(update => {
          context += `- Path "${update.path}" updated at ${update.updatedAt} by ${update.updatedBy}\n`;
        });
        context += "\n";
      }
      
      // Add security rules summary
      const rulesSummary = await this.getSecurityRulesSummary();
      context += `Security rules summary: ${rulesSummary}\n\n`;
      
      // Add database statistics
      const stats = await databaseService.getDatabaseStats();
      context += `Database statistics: ${stats.totalNodes} total nodes, ${stats.totalPaths} unique paths\n\n`;
      
      return context;
    } catch (error) {
      console.error('Error generating database context:', error);
      return "Could not generate full database context.";
    }
  }

  /**
   * Get accessible top-level paths for the user
   * @param {Object} user - Authenticated user
   * @returns {Promise<Array>} List of accessible paths
   */
  async getAccessibleTopLevelPaths(user) {
    // Get all top-level paths from Redis
    const pattern = prefixKey('data:*');
    const keys = await redis.keys(pattern);
    
    // Extract the top-level paths
    const topLevelPaths = new Set();
    keys.forEach(key => {
      const path = key.replace(prefixKey('data:'), '');
      const topLevel = path.split('/')[0];
      if (topLevel) {
        topLevelPaths.add(topLevel);
      }
    });
    
    // Filter to only include paths the user can access
    const accessiblePaths = [];
    for (const path of topLevelPaths) {
      const hasAccess = await securityRules.canRead(path, user);
      if (hasAccess) {
        accessiblePaths.push(path);
      }
    }
    
    return accessiblePaths;
  }

  /**
   * Get recent data updates
   * @param {Object} user - Authenticated user
   * @returns {Promise<Array>} Recent updates
   */
  async getRecentDataUpdates(user) {
    // Get all metadata keys
    const pattern = prefixKey('meta:*');
    const keys = await redis.keys(pattern);
    
    // Get metadata for each key
    const updates = [];
    for (const key of keys.slice(0, 10)) { // Limit to 10 keys to check
      const path = key.replace(prefixKey('meta:'), '');
      const metadata = await redis.hgetall(key);
      
      if (metadata && metadata.updatedAt) {
        updates.push({
          path,
          updatedAt: metadata.updatedAt,
          updatedBy: metadata.updatedBy || 'unknown'
        });
      }
    }
    
    // Sort by updatedAt
    updates.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    
    // Filter to only include paths the user can access
    const accessibleUpdates = [];
    for (const update of updates.slice(0, 5)) { // Limit to 5 most recent
      const hasAccess = await securityRules.canRead(update.path, user);
      if (hasAccess) {
        accessibleUpdates.push(update);
      }
    }
    
    return accessibleUpdates;
  }

  /**
   * Get security rules summary
   * @returns {Promise<string>} Rules summary
   */
  async getSecurityRulesSummary() {
    try {
      // Initialize rules if not already
      if (!securityRules.rulesLoaded) {
        await securityRules.init();
      }
      
      // Get a simplified summary of the rules
      const rules = securityRules.rules;
      if (!rules || !rules.rules) {
        return "No security rules configured.";
      }
      
      // Count number of rules
      const countRules = (obj) => {
        let count = 0;
        for (const key of Object.keys(obj)) {
          if (key.startsWith('.')) {
            count++;
          } else if (typeof obj[key] === 'object') {
            count += countRules(obj[key]);
          }
        }
        return count;
      };
      
      const ruleCount = countRules(rules.rules);
      
      // Check if there are public read/write rules
      const hasPublicRead = rules.rules['.read'] === true;
      const hasPublicWrite = rules.rules['.write'] === true;
      
      let summary = `${ruleCount} rules configured. `;
      if (hasPublicRead) summary += "Public read access is enabled. ";
      if (hasPublicWrite) summary += "Public write access is enabled. ";
      if (!hasPublicRead && !hasPublicWrite) summary += "No public access configured. ";
      
      return summary;
    } catch (error) {
      console.error('Error getting security rules summary:', error);
      return "Could not retrieve security rules summary.";
    }
  }

  /**
   * Process database operations requested by the AI
   * @param {string} message - AI message
   * @param {Object} user - Authenticated user
   * @returns {Promise<string>} Processed message
   */
  async processOperations(message, user) {
    let processedMessage = message;
    
    // Look for database query tags
    const queryRegex = /\[QUERY:(.*?)\]/g;
    const queries = [...message.matchAll(queryRegex)];
    
    for (const match of queries) {
      const queryPath = match[1].trim();
      try {
        // Check if user has permission
        const hasPermission = await securityRules.canRead(queryPath, user);
        if (!hasPermission) {
          processedMessage = processedMessage.replace(
            match[0],
            `[Permission denied: You don't have access to read from ${queryPath}]`
          );
          continue;
        }
        
        // Execute the query
        const data = await databaseService.getData(queryPath, user);
        
        // Format the result
        const formattedData = JSON.stringify(data, null, 2);
        const replacement = `\`\`\`json\n${formattedData}\n\`\`\``;
        
        // Replace the query tag with the result
        processedMessage = processedMessage.replace(match[0], replacement);
      } catch (error) {
        console.error(`Error processing query ${queryPath}:`, error);
        processedMessage = processedMessage.replace(
          match[0],
          `[Error querying ${queryPath}: ${error.message}]`
        );
      }
    }
    
    // Process other operation types (write, update, etc.)
    // Similar code would be added for other operations
    
    return processedMessage;
  }

  /**
   * Check if response indicates authentication is needed
   * @param {string} message - Response message
   * @returns {boolean} Whether auth is needed
   */
  responseNeedsAuth(message) {
    return message.includes('[Permission denied') || 
           message.includes('authentication required') ||
           message.includes('You need to be logged in');
  }

  /**
   * Fallback AI response when OpenAI is not configured
   * @param {string} message - User message
   * @param {string} dbContext - Database context
   * @param {Object} user - Authenticated user
   * @returns {Promise<Object>} AI response
   */
  async fallbackAIResponse(message, dbContext, user) {
    // Simple keyword-based response system
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('list') && lowerMessage.includes('data')) {
      // List available data
      const paths = await this.getAccessibleTopLevelPaths(user);
      return {
        message: `Here are the top-level data paths available to you: ${paths.join(', ')}`,
        type: 'ai'
      };
    } else if (lowerMessage.includes('show') || lowerMessage.includes('get')) {
      // Try to extract a path
      const pathMatch = message.match(/["']([^"']+)["']/) || message.match(/\b(\w+\/\w+)\b/) || message.match(/\b(\w+)\b/);
      if (pathMatch) {
        const path = pathMatch[1];
        try {
          const hasPermission = await securityRules.canRead(path, user);
          if (!hasPermission) {
            return {
              message: `Sorry, you don't have permission to read from '${path}'.`,
              type: 'ai',
              needsAuth: true
            };
          }
          
          const data = await databaseService.getData(path, user);
          return {
            message: `Here's the data at '${path}':\n\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\``,
            type: 'ai'
          };
        } catch (error) {
          return {
            message: `I had trouble retrieving data from '${path}': ${error.message}`,
            type: 'error'
          };
        }
      }
    } else if (lowerMessage.includes('security') || lowerMessage.includes('rules')) {
      // Provide security rules info
      const summary = await this.getSecurityRulesSummary();
      return {
        message: `Security Rules Summary: ${summary}`,
        type: 'ai'
      };
    } else if (lowerMessage.includes('stats') || lowerMessage.includes('statistics')) {
      // Provide database stats
      const stats = await databaseService.getDatabaseStats();
      return {
        message: `Database Statistics:\n- ${stats.totalNodes} total data nodes\n- ${stats.totalPaths} unique paths`,
        type: 'ai'
      };
    }
    
    // Default response
    return {
      message: "I understand you're asking about the Redis database, but I need more specific information. Try asking about listing data, viewing specific paths, security rules, or database statistics.",
      type: 'ai'
    };
  }
}

module.exports = new AIService();
EOF

# Create User Model for Redis
cat > server/models/User.js << 'EOF'
// server/models/User.js
const { redis, prefixKey } = require('../services/redisClient');
const { v4: uuidv4 } = require('uuid');

class User {
  /**
   * Find a user by ID
   * @param {string} uid - User ID
   * @returns {Promise<Object|null>} User object or null
   */
  static async findOne(query) {
    try {
      // If we have a uid, use it directly
      if (query.uid) {
        const userData = await redis.hgetall(prefixKey(`user:${query.uid}`));
        if (!userData || Object.keys(userData).length === 0) {
          return null;
        }
        
        return User.mapRedisToUser(userData, query.uid);
      }
      
      // If we have an email, we need to look up the uid first
      if (query.email) {
        const email = query.email.toLowerCase();
        const uid = await redis.get(prefixKey(`email:${email}`));
        
        if (!uid) {
          return null;
        }
        
        const userData = await redis.hgetall(prefixKey(`user:${uid}`));
        if (!userData || Object.keys(userData).length === 0) {
          return null;
        }
        
        return User.mapRedisToUser(userData, uid);
      }
      
      return null;
    } catch (error) {
      console.error('Error finding user:', error);
      return null;
    }
  }
  
  /**
   * Create a new user
   * @param {Object} userData - User data
   * @returns {Promise<Object>} Created user
   */
  static async create(userData) {
    try {
      // Generate uid if not provided
      const uid = userData.uid || uuidv4();
      
      // Store user data
      const userKey = prefixKey(`user:${uid}`);
      
      // Prepare user data for storage
      const redisData = {
        email: userData.email.toLowerCase(),
        password: userData.password,
        displayName: userData.displayName || '',
        photoURL: userData.photoURL || '',
        phoneNumber: userData.phoneNumber || '',
        role: userData.role || 'user',
        disabled: userData.disabled ? '1' : '0',
        emailVerified: userData.emailVerified ? '1' : '0',
        createdAt: userData.createdAt || new Date().toISOString(),
        updatedAt: userData.updatedAt || new Date().toISOString()
      };
      
      // Add optional fields if they exist
      if (userData.emailVerificationToken) {
        redisData.emailVerificationToken = userData.emailVerificationToken;
      }
      
      if (userData.emailVerificationExpires) {
        redisData.emailVerificationExpires = userData.emailVerificationExpires.toISOString();
      }
      
      if (userData.passwordResetToken) {
        redisData.passwordResetToken = userData.passwordResetToken;
      }
      
      if (userData.passwordResetExpires) {
        redisData.passwordResetExpires = userData.passwordResetExpires.toISOString();
      }
      
      if (userData.refreshToken) {
        redisData.refreshToken = userData.refreshToken;
      }
      
      if (userData.lastLoginAt) {
        redisData.lastLoginAt = userData.lastLoginAt.toISOString();
      }
      
      if (userData.passwordUpdatedAt) {
        redisData.passwordUpdatedAt = userData.passwordUpdatedAt.toISOString();
      }
      
      // Store user data
      await redis.hmset(userKey, redisData);
      
      // Create email index
      await redis.set(prefixKey(`email:${userData.email.toLowerCase()}`), uid);
      
      // Return user object
      return User.mapRedisToUser(redisData, uid);
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }
  
  /**
   * Update a user
   * @param {Object} query - Query to find user
   * @param {Object} update - Data to update
   * @returns {Promise<Object|null>} Updated user or null
   */
  static async findOneAndUpdate(query, update) {
    try {
      // Find user first
      const user = await User.findOne(query);
      
      if (!user) {
        return null;
      }
      
      // Prepare data to update
      const updateData = {};
      
      // Only update fields that are provided
      if (update.displayName !== undefined) updateData.displayName = update.displayName;
      if (update.photoURL !== undefined) updateData.photoURL = update.photoURL;
      if (update.phoneNumber !== undefined) updateData.phoneNumber = update.phoneNumber;
      if (update.password !== undefined) updateData.password = update.password;
      if (update.role !== undefined) updateData.role = update.role;
      if (update.disabled !== undefined) updateData.disabled = update.disabled ? '1' : '0';
      if (update.emailVerified !== undefined) updateData.emailVerified = update.emailVerified ? '1' : '0';
      if (update.emailVerificationToken !== undefined) updateData.emailVerificationToken = update.emailVerificationToken;
      if (update.emailVerificationExpires !== undefined) updateData.emailVerificationExpires = update.emailVerificationExpires.toISOString();
      if (update.passwordResetToken !== undefined) updateData.passwordResetToken = update.passwordResetToken;
      if (update.passwordResetExpires !== undefined) updateData.passwordResetExpires = update.passwordResetExpires.toISOString();
      if (update.refreshToken !== undefined) updateData.refreshToken = update.refreshToken;
      if (update.lastLoginAt !== undefined) updateData.lastLoginAt = update.lastLoginAt.toISOString();
      if (update.passwordUpdatedAt !== undefined) updateData.passwordUpdatedAt = update.passwordUpdatedAt.toISOString();
      
      // Always update updatedAt
      updateData.updatedAt = new Date().toISOString();
      
      // If email is being updated, we need to update the index
      if (update.email !== undefined && update.email !== user.email) {
        // Delete old email index
        await redis.del(prefixKey(`email:${user.email.toLowerCase()}`));
        
        // Create new email index
        await redis.set(prefixKey(`email:${update.email.toLowerCase()}`), user.uid);
        
        // Update email in user data
        updateData.email = update.email.toLowerCase();
      }
      
      // Update user data if there are fields to update
      if (Object.keys(updateData).length > 0) {
        await redis.hmset(prefixKey(`user:${user.uid}`), updateData);
      }
      
      // Get updated user
      return User.findOne({ uid: user.uid });
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }
  
  /**
   * Delete a user
   * @param {Object} query - Query to find user
   * @returns {Promise<Object>} Delete result
   */
  static async deleteOne(query) {
    try {
      // Find user first
      const user = await User.findOne(query);
      
      if (!user) {
        return { deletedCount: 0 };
      }
      
      // Delete email index
      await redis.del(prefixKey(`email:${user.email.toLowerCase()}`));
      
      // Delete user data
      await redis.del(prefixKey(`user:${user.uid}`));
      
      return { deletedCount: 1 };
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }
  
  /**
   * Map Redis data to user object
   * @param {Object} redisData - Data from Redis
   * @param {string} uid - User ID
   * @returns {Object} User object
   */
  static mapRedisToUser(redisData, uid) {
    const user = {
      uid,
      email: redisData.email,
      password: redisData.password,
      displayName: redisData.displayName,
      photoURL: redisData.photoURL,
      phoneNumber: redisData.phoneNumber,
      role: redisData.role || 'user',
      disabled: redisData.disabled === '1',
      emailVerified: redisData.emailVerified === '1',
      createdAt: redisData.createdAt,
      updatedAt: redisData.updatedAt,
      
      // Optional fields
      refreshToken: redisData.refreshToken,
      emailVerificationToken: redisData.emailVerificationToken,
      passwordResetToken: redisData.passwordResetToken
    };
    
    // Add date fields if they exist
    if (redisData.emailVerificationExpires) {
      user.emailVerificationExpires = new Date(redisData.emailVerificationExpires);
    }
    
    if (redisData.passwordResetExpires) {
      user.passwordResetExpires = new Date(redisData.passwordResetExpires);
    }
    
    if (redisData.lastLoginAt) {
      user.lastLoginAt = new Date(redisData.lastLoginAt);
    }
    
    if (redisData.passwordUpdatedAt) {
      user.passwordUpdatedAt = new Date(redisData.passwordUpdatedAt);
    }
    
    // Add methods for compatibility with Mongoose
    user.toObject = function() {
      return { ...this };
    };
    
    user.save = async function() {
      return User.findOneAndUpdate({ uid: this.uid }, this);
    };
    
    return user;
  }
}

module.exports = User;
EOF

# Create basic client React components
mkdir -p client/src/components
cat > client/src/components/DatabaseChat.jsx << 'EOF'
// client/src/components/DatabaseChat.jsx
import React, { useState, useRef, useEffect } from 'react';

const DatabaseChat = ({ compact = false }) => {
  const [messages, setMessages] = useState([
    { content: "Hello! I'm your database assistant. How can I help you with your Redis-based database today?", type: 'assistant' }
  ]);
  const [inputValue, setInputValue] = useState('');
  
  const handleSendMessage = () => {
    if (!inputValue.trim()) return;
    
    setMessages(prev => [...prev, 
      { content: inputValue, type: 'user' },
      { content: "This is a stub implementation. The real AI assistant would respond here with information about your Redis database.", type: 'assistant' }
    ]);
    setInputValue('');
  };
  
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, index) => (
          <div key={index} className={`${msg.type === 'user' ? 'text-right' : ''}`}>
            <div className={`inline-block rounded-lg px-4 py-2 ${
              msg.type === 'user' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-800'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
      </div>
      
      <div className="p-4 border-t">
        <div className="flex">
          <input
            type="text"
            className="flex-1 border rounded-l px-4 py-2"
            placeholder="Ask about your Redis database..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          />
          <button
            className="bg-indigo-600 text-white px-4 py-2 rounded-r"
            onClick={handleSendMessage}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default DatabaseChat;
EOF

# Create React app index files
mkdir -p client/src
cat > client/src/index.jsx << 'EOF'
// client/src/index.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
EOF

cat > client/src/App.jsx << 'EOF'
// client/src/App.jsx
import React from 'react';
import DatabaseChat from './components/DatabaseChat';

function App() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="w-full max-w-4xl h-[600px] bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="bg-indigo-600 p-4 text-white">
          <h1 className="text-2xl font-bold">LightRail.dev AI Assistant</h1>
          <p>Ask questions about your Redis database in natural language</p>
        </div>
        <DatabaseChat />
      </div>
    </div>
  );
}

export default App;
EOF

# Create initial database rules file
mkdir -p config
cat > config/database-rules.json << 'EOF'
{
  "rules": {
    ".read": false,
    ".write": false,
    "users": {
      "$uid": {
        ".read": "auth !== null && auth.uid === $uid",
        ".write": "auth !== null && auth.uid === $uid"
      }
    },
    "public": {
      ".read": true,
      ".write": "auth !== null"
    }
  }
}
EOF

# Create uploads directory
mkdir -p uploads

# Initialize git repository
git init
git add .
git commit -m "Initial commit of LightRail.dev with Redis and GenAI capabilities"

echo ""
echo "✅ LightRail.dev project with Redis has been successfully created!"
echo ""
echo "To start the application:"
echo "1. Install dependencies:"
echo "   npm run install:all"
echo ""
echo "2. Start the development server:"
echo "   npm run dev:full"
echo ""
echo "Or with Docker:"
echo "   docker-compose up -d"
echo ""
echo "Open your browser to http://localhost:3000"
echo ""
echo "For full AI functionality, add your OpenAI API key to the .env file."
EOF

echo "Setup script with Redis created. Run it with these commands:"
echo "chmod +x setup-lightrail-redis.sh"
echo "./setup-lightrail-redis.sh"