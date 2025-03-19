// server/services/databaseService.js
const { redis, prefixKey } = require('./redisClient');
const securityRules = require('./securityRules');

class DatabaseService {
  /**
   * Get data from a specific path
   * @param {string} path - Data path
   * @param {Object} user - Authenticated user
   * @returns {Promise<Object>} Data at path
   */
  async getData(path, user) {
    try {
      // Check security rules
      const canRead = await securityRules.canRead(path, user);
      if (!canRead) {
        throw new Error('Permission denied');
      }
      
      // Get data from Redis
      const data = await redis.get(prefixKey(`data:${path}`));
      
      // If data doesn't exist, check if it's a path with children
      if (!data) {
        return await this.getChildData(path, user);
      }
      
      // Parse JSON data
      try {
        return JSON.parse(data);
      } catch (error) {
        return data;
      }
    } catch (error) {
      console.error(`Error getting data at path ${path}:`, error);
      throw error;
    }
  }
  
  /**
   * Get child data for a path
   * @param {string} path - Parent path
   * @param {Object} user - Authenticated user
   * @returns {Promise<Object>} Child data
   */
  async getChildData(path, user) {
    try {
      // Normalize path
      const normalizedPath = path.endsWith('/') ? path : `${path}/`;
      
      // Get all keys that start with this path
      const pattern = prefixKey(`data:${normalizedPath}*`);
      const keys = await redis.keys(pattern);
      
      if (keys.length === 0) {
        return null;
      }
      
      // Build object from child paths
      const result = {};
      
      for (const key of keys) {
        // Extract child path
        const childPath = key.replace(prefixKey('data:'), '');
        
        // Check security rules for this child
        const canRead = await securityRules.canRead(childPath, user);
        if (!canRead) {
          continue;
        }
        
        // Get data
        const data = await redis.get(key);
        
        // Parse data
        let parsedData;
        try {
          parsedData = JSON.parse(data);
        } catch (error) {
          parsedData = data;
        }
        
        // Add to result
        const pathParts = childPath.split('/');
        let current = result;
        
        for (let i = 0; i < pathParts.length - 1; i++) {
          const part = pathParts[i];
          if (!current[part]) {
            current[part] = {};
          }
          current = current[part];
        }
        
        current[pathParts[pathParts.length - 1]] = parsedData;
      }
      
      return result;
    } catch (error) {
      console.error(`Error getting child data for path ${path}:`, error);
      throw error;
    }
  }
  
  /**
   * Set data at a specific path
   * @param {string} path - Data path
   * @param {*} data - Data to set
   * @param {Object} user - Authenticated user
   * @returns {Promise<Object>} Operation result
   */
  async setData(path, data, user) {
    try {
      // Check security rules
      const canWrite = await securityRules.canWrite(path, user);
      if (!canWrite) {
        throw new Error('Permission denied');
      }
      
      // Convert data to JSON string
      const jsonData = typeof data === 'string' ? data : JSON.stringify(data);
      
      // Set data in Redis
      await redis.set(prefixKey(`data:${path}`), jsonData);
      
      // Update metadata
      await this.updateMetadata(path, user);
      
      // Emit change event
      this.emitChange(path, data, user);
      
      return { success: true, path };
    } catch (error) {
      console.error(`Error setting data at path ${path}:`, error);
      throw error;
    }
  }
  
  /**
   * Update data at a specific path
   * @param {string} path - Data path
   * @param {*} data - Data to update
   * @param {Object} user - Authenticated user
   * @returns {Promise<Object>} Operation result
   */
  async updateData(path, data, user) {
    try {
      // Check if data exists
      const exists = await redis.exists(prefixKey(`data:${path}`));
      
      if (!exists) {
        return this.setData(path, data, user);
      }
      
      // Check security rules
      const canWrite = await securityRules.canWrite(path, user);
      if (!canWrite) {
        throw new Error('Permission denied');
      }
      
      // Get existing data
      const existingData = await this.getData(path, user);
      
      // Merge data
      let mergedData;
      
      if (typeof existingData === 'object' && existingData !== null && typeof data === 'object' && data !== null) {
        mergedData = { ...existingData, ...data };
      } else {
        mergedData = data;
      }
      
      // Convert data to JSON string
      const jsonData = typeof mergedData === 'string' ? mergedData : JSON.stringify(mergedData);
      
      // Set data in Redis
      await redis.set(prefixKey(`data:${path}`), jsonData);
      
      // Update metadata
      await this.updateMetadata(path, user);
      
      // Emit change event
      this.emitChange(path, mergedData, user);
      
      return { success: true, path };
    } catch (error) {
      console.error(`Error updating data at path ${path}:`, error);
      throw error;
    }
  }
  
  /**
   * Delete data at a specific path
   * @param {string} path - Data path
   * @param {Object} user - Authenticated user
   * @returns {Promise<Object>} Operation result
   */
  async deleteData(path, user) {
    try {
      // Check security rules
      const canWrite = await securityRules.canWrite(path, user);
      if (!canWrite) {
        throw new Error('Permission denied');
      }
      
      // Check if path has children
      const pattern = prefixKey(`data:${path}/*`);
      const childKeys = await redis.keys(pattern);
      
      if (childKeys.length > 0) {
        // Delete all child keys
        for (const key of childKeys) {
          await redis.del(key);
          
          // Delete metadata for child
          const childPath = key.replace(prefixKey('data:'), '');
          await redis.del(prefixKey(`meta:${childPath}`));
        }
      }
      
      // Delete data
      await redis.del(prefixKey(`data:${path}`));
      
      // Delete metadata
      await redis.del(prefixKey(`meta:${path}`));
      
      // Emit change event
      this.emitChange(path, null, user);
      
      return { success: true, path };
    } catch (error) {
      console.error(`Error deleting data at path ${path}:`, error);
      throw error;
    }
  }
  
  /**
   * Update metadata for a path
   * @param {string} path - Data path
   * @param {Object} user - Authenticated user
   * @returns {Promise<void>}
   */
  async updateMetadata(path, user) {
    try {
      const metaKey = prefixKey(`meta:${path}`);
      
      // Update metadata
      await redis.hmset(metaKey, {
        updatedAt: new Date().toISOString(),
        updatedBy: user ? user.uid : 'system'
      });
      
      // If metadata doesn't exist, set createdAt
      const exists = await redis.hexists(metaKey, 'createdAt');
      if (!exists) {
        await redis.hset(metaKey, 'createdAt', new Date().toISOString());
        await redis.hset(metaKey, 'createdBy', user ? user.uid : 'system');
      }
    } catch (error) {
      console.error(`Error updating metadata for path ${path}:`, error);
    }
  }
  
  /**
   * Emit change event for WebSocket
   * @param {string} path - Data path
   * @param {*} data - Updated data
   * @param {Object} user - Authenticated user
   */
  emitChange(path, data, user) {
    // This will be implemented by the socket service
    // We'll just log it for now
    console.log(`Data changed at path ${path}`);
    
    // In a real implementation, this would emit an event to connected clients
    // through the WebSocket service
  }
  
  /**
   * Get database statistics
   * @returns {Promise<Object>} Database statistics
   */
  async getDatabaseStats() {
    try {
      // Get all data keys
      const pattern = prefixKey('data:*');
      const keys = await redis.keys(pattern);
      
      // Count unique paths
      const paths = new Set();
      keys.forEach(key => {
        const path = key.replace(prefixKey('data:'), '');
        paths.add(path);
      });
      
      return {
        totalNodes: keys.length,
        totalPaths: paths.size
      };
    } catch (error) {
      console.error('Error getting database stats:', error);
      return {
        totalNodes: 0,
        totalPaths: 0
      };
    }
  }
}

module.exports = new DatabaseService();
