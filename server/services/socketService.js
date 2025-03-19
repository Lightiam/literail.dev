// server/services/socketService.js
const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const { redis, prefixKey } = require('./redisClient');
const securityRules = require('./securityRules');

class SocketService {
  constructor() {
    this.io = null;
    this.connections = new Map();
    this.subscriptions = new Map();
  }
  
  /**
   * Initialize Socket.IO server
   * @param {Object} server - HTTP server
   */
  init(server) {
    this.io = socketIo(server, {
      cors: {
        origin: process.env.CORS_ORIGIN || '*',
        methods: ['GET', 'POST'],
        credentials: true
      }
    });
    
    console.log('Socket.IO initialized');
    
    this.setupConnectionHandlers();
    this.setupRedisSubscriber();
  }
  
  /**
   * Set up connection handlers
   */
  setupConnectionHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`Socket connected: ${socket.id}`);
      
      // Store socket connection
      this.connections.set(socket.id, {
        socket,
        user: null,
        authenticated: false
      });
      
      // Handle authentication
      socket.on('authenticate', (token) => this.handleAuthentication(socket, token));
      
      // Handle subscriptions
      socket.on('subscribe', (path) => this.handleSubscribe(socket, path));
      socket.on('unsubscribe', (path) => this.handleUnsubscribe(socket, path));
      
      // Handle disconnection
      socket.on('disconnect', () => this.handleDisconnect(socket));
    });
  }
  
  /**
   * Handle socket authentication
   * @param {Object} socket - Socket.IO socket
   * @param {string} token - JWT token
   */
  handleAuthentication(socket, token) {
    try {
      // Verify token
      const user = jwt.verify(token, process.env.JWT_SECRET);
      
      // Update connection info
      const connection = this.connections.get(socket.id);
      if (connection) {
        connection.user = user;
        connection.authenticated = true;
        this.connections.set(socket.id, connection);
      }
      
      console.log(`Socket authenticated: ${socket.id} (User: ${user.uid})`);
      
      // Notify client
      socket.emit('authenticated', { success: true });
      
      // Refresh subscriptions with new authentication
      this.refreshSubscriptions(socket);
    } catch (error) {
      console.error(`Socket authentication error: ${socket.id}`, error);
      socket.emit('authenticated', { success: false, error: 'Invalid token' });
    }
  }
  
  /**
   * Handle subscription request
   * @param {Object} socket - Socket.IO socket
   * @param {string} path - Data path to subscribe to
   */
  async handleSubscribe(socket, path) {
    try {
      // Get connection info
      const connection = this.connections.get(socket.id);
      if (!connection) {
        socket.emit('subscribe_error', { path, error: 'Connection not found' });
        return;
      }
      
      // Check security rules
      const canRead = await securityRules.canRead(path, connection.user);
      if (!canRead) {
        socket.emit('subscribe_error', { path, error: 'Permission denied' });
        return;
      }
      
      // Add to subscriptions
      let pathSubscribers = this.subscriptions.get(path) || new Set();
      pathSubscribers.add(socket.id);
      this.subscriptions.set(path, pathSubscribers);
      
      // Add to socket's subscriptions
      socket.join(path);
      
      console.log(`Socket ${socket.id} subscribed to ${path}`);
      
      // Send initial data
      this.sendInitialData(socket, path);
    } catch (error) {
      console.error(`Subscription error for path ${path}:`, error);
      socket.emit('subscribe_error', { path, error: error.message });
    }
  }
  
  /**
   * Handle unsubscribe request
   * @param {Object} socket - Socket.IO socket
   * @param {string} path - Data path to unsubscribe from
   */
  handleUnsubscribe(socket, path) {
    try {
      // Remove from subscriptions
      const pathSubscribers = this.subscriptions.get(path);
      if (pathSubscribers) {
        pathSubscribers.delete(socket.id);
        if (pathSubscribers.size === 0) {
          this.subscriptions.delete(path);
        } else {
          this.subscriptions.set(path, pathSubscribers);
        }
      }
      
      // Remove from socket's subscriptions
      socket.leave(path);
      
      console.log(`Socket ${socket.id} unsubscribed from ${path}`);
      socket.emit('unsubscribed', { path });
    } catch (error) {
      console.error(`Unsubscribe error for path ${path}:`, error);
      socket.emit('unsubscribe_error', { path, error: error.message });
    }
  }
  
  /**
   * Handle socket disconnection
   * @param {Object} socket - Socket.IO socket
   */
  handleDisconnect(socket) {
    console.log(`Socket disconnected: ${socket.id}`);
    
    // Remove from connections
    this.connections.delete(socket.id);
    
    // Remove from all subscriptions
    for (const [path, subscribers] of this.subscriptions.entries()) {
      if (subscribers.has(socket.id)) {
        subscribers.delete(socket.id);
        if (subscribers.size === 0) {
          this.subscriptions.delete(path);
        } else {
          this.subscriptions.set(path, subscribers);
        }
      }
    }
  }
  
  /**
   * Refresh subscriptions after authentication
   * @param {Object} socket - Socket.IO socket
   */
  refreshSubscriptions(socket) {
    // Get all rooms the socket is in
    const rooms = Array.from(socket.rooms).filter(room => room !== socket.id);
    
    // Re-subscribe to each path
    rooms.forEach(path => {
      socket.leave(path);
      this.handleSubscribe(socket, path);
    });
  }
  
  /**
   * Send initial data for a subscription
   * @param {Object} socket - Socket.IO socket
   * @param {string} path - Data path
   */
  async sendInitialData(socket, path) {
    try {
      // Get connection info
      const connection = this.connections.get(socket.id);
      if (!connection) {
        return;
      }
      
      // Get data from Redis
      const data = await redis.get(prefixKey(`data:${path}`));
      
      if (data) {
        // Parse data
        let parsedData;
        try {
          parsedData = JSON.parse(data);
        } catch (error) {
          parsedData = data;
        }
        
        // Send data to client
        socket.emit('data_update', {
          path,
          data: parsedData
        });
      } else {
        // Check if it's a path with children
        const pattern = prefixKey(`data:${path}/*`);
        const keys = await redis.keys(pattern);
        
        if (keys.length > 0) {
          // Build object from child paths
          const result = {};
          
          for (const key of keys) {
            // Extract child path
            const childPath = key.replace(prefixKey('data:'), '');
            
            // Check security rules for this child
            const canRead = await securityRules.canRead(childPath, connection.user);
            if (!canRead) {
              continue;
            }
            
            // Get data
            const childData = await redis.get(key);
            
            // Parse data
            let parsedChildData;
            try {
              parsedChildData = JSON.parse(childData);
            } catch (error) {
              parsedChildData = childData;
            }
            
            // Add to result
            const pathParts = childPath.replace(`${path}/`, '').split('/');
            let current = result;
            
            for (let i = 0; i < pathParts.length - 1; i++) {
              const part = pathParts[i];
              if (!current[part]) {
                current[part] = {};
              }
              current = current[part];
            }
            
            current[pathParts[pathParts.length - 1]] = parsedChildData;
          }
          
          // Send data to client
          socket.emit('data_update', {
            path,
            data: result
          });
        } else {
          // No data found
          socket.emit('data_update', {
            path,
            data: null
          });
        }
      }
    } catch (error) {
      console.error(`Error sending initial data for path ${path}:`, error);
    }
  }
  
  /**
   * Set up Redis subscriber for data changes
   */
  setupRedisSubscriber() {
    // Create a separate Redis client for pub/sub
    const subscriber = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    
    // Subscribe to data change channel
    subscriber.subscribe(prefixKey('data_change'));
    
    // Handle messages
    subscriber.on('message', (channel, message) => {
      if (channel === prefixKey('data_change')) {
        try {
          const { path, data, timestamp } = JSON.parse(message);
          this.notifySubscribers(path, data);
        } catch (error) {
          console.error('Error processing Redis message:', error);
        }
      }
    });
    
    console.log('Redis subscriber initialized');
  }
  
  /**
   * Notify subscribers of data changes
   * @param {string} path - Data path
   * @param {*} data - Updated data
   */
  notifySubscribers(path, data) {
    // Find all paths that might be affected
    const affectedPaths = [path];
    
    // Add parent paths
    let currentPath = path;
    while (currentPath.includes('/')) {
      currentPath = currentPath.substring(0, currentPath.lastIndexOf('/'));
      affectedPaths.push(currentPath);
    }
    
    // Notify subscribers for each affected path
    affectedPaths.forEach(affectedPath => {
      // Get subscribers for this path
      const subscribers = this.subscriptions.get(affectedPath);
      
      if (subscribers && subscribers.size > 0) {
        // Emit to room
        this.io.to(affectedPath).emit('data_update', {
          path: affectedPath,
          data
        });
        
        console.log(`Notified ${subscribers.size} subscribers for path ${affectedPath}`);
      }
    });
  }
  
  /**
   * Publish data change to Redis
   * @param {string} path - Data path
   * @param {*} data - Updated data
   * @param {Object} user - User who made the change
   */
  publishChange(path, data, user) {
    try {
      // Create a separate Redis client for publishing
      const publisher = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
      
      // Publish message
      publisher.publish(prefixKey('data_change'), JSON.stringify({
        path,
        data,
        timestamp: new Date().toISOString(),
        user: user ? user.uid : 'system'
      }));
      
      // Close publisher connection
      publisher.quit();
    } catch (error) {
      console.error(`Error publishing data change for path ${path}:`, error);
    }
  }
}

module.exports = new SocketService();
