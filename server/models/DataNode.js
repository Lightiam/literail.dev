// server/models/DataNode.js
const { redis, prefixKey } = require('../services/redisClient');
const { v4: uuidv4 } = require('uuid');

class DataNode {
  /**
   * Create a new data node
   * @param {string} path - Node path
   * @param {*} data - Node data
   * @param {Object} metadata - Node metadata
   * @returns {Promise<Object>} Created node
   */
  static async create(path, data, metadata = {}) {
    try {
      // Generate node ID if not provided
      const nodeId = metadata.id || uuidv4();
      
      // Prepare data for storage
      const jsonData = typeof data === 'string' ? data : JSON.stringify(data);
      
      // Store data
      await redis.set(prefixKey(`data:${path}`), jsonData);
      
      // Prepare metadata
      const metaData = {
        id: nodeId,
        createdAt: metadata.createdAt || new Date().toISOString(),
        updatedAt: metadata.updatedAt || new Date().toISOString(),
        createdBy: metadata.createdBy || 'system',
        updatedBy: metadata.updatedBy || 'system',
        ...metadata
      };
      
      // Store metadata
      await redis.hmset(prefixKey(`meta:${path}`), metaData);
      
      // Return node
      return {
        id: nodeId,
        path,
        data,
        ...metaData
      };
    } catch (error) {
      console.error(`Error creating data node at path ${path}:`, error);
      throw error;
    }
  }
  
  /**
   * Get a data node
   * @param {string} path - Node path
   * @returns {Promise<Object|null>} Node or null
   */
  static async get(path) {
    try {
      // Get data
      const data = await redis.get(prefixKey(`data:${path}`));
      
      if (!data) {
        return null;
      }
      
      // Get metadata
      const metadata = await redis.hgetall(prefixKey(`meta:${path}`));
      
      // Parse data
      let parsedData;
      try {
        parsedData = JSON.parse(data);
      } catch (error) {
        parsedData = data;
      }
      
      // Return node
      return {
        id: metadata.id || path,
        path,
        data: parsedData,
        ...metadata
      };
    } catch (error) {
      console.error(`Error getting data node at path ${path}:`, error);
      throw error;
    }
  }
  
  /**
   * Update a data node
   * @param {string} path - Node path
   * @param {*} data - New data
   * @param {Object} metadata - New metadata
   * @returns {Promise<Object>} Updated node
   */
  static async update(path, data, metadata = {}) {
    try {
      // Check if node exists
      const exists = await redis.exists(prefixKey(`data:${path}`));
      
      if (!exists) {
        return DataNode.create(path, data, metadata);
      }
      
      // Get existing metadata
      const existingMetadata = await redis.hgetall(prefixKey(`meta:${path}`));
      
      // Prepare data for storage
      const jsonData = typeof data === 'string' ? data : JSON.stringify(data);
      
      // Store data
      await redis.set(prefixKey(`data:${path}`), jsonData);
      
      // Prepare metadata
      const metaData = {
        updatedAt: new Date().toISOString(),
        updatedBy: metadata.updatedBy || 'system',
        ...metadata
      };
      
      // Store metadata
      await redis.hmset(prefixKey(`meta:${path}`), metaData);
      
      // Return node
      return {
        id: existingMetadata.id || path,
        path,
        data,
        ...existingMetadata,
        ...metaData
      };
    } catch (error) {
      console.error(`Error updating data node at path ${path}:`, error);
      throw error;
    }
  }
  
  /**
   * Delete a data node
   * @param {string} path - Node path
   * @returns {Promise<boolean>} Success
   */
  static async delete(path) {
    try {
      // Delete data
      await redis.del(prefixKey(`data:${path}`));
      
      // Delete metadata
      await redis.del(prefixKey(`meta:${path}`));
      
      return true;
    } catch (error) {
      console.error(`Error deleting data node at path ${path}:`, error);
      throw error;
    }
  }
  
  /**
   * List child nodes
   * @param {string} path - Parent path
   * @returns {Promise<Array>} Child nodes
   */
  static async list(path) {
    try {
      // Normalize path
      const normalizedPath = path.endsWith('/') ? path : `${path}/`;
      
      // Get all keys that start with this path
      const pattern = prefixKey(`data:${normalizedPath}*`);
      const keys = await redis.keys(pattern);
      
      if (keys.length === 0) {
        return [];
      }
      
      // Extract child paths
      const childPaths = keys.map(key => {
        const fullPath = key.replace(prefixKey('data:'), '');
        const relativePath = fullPath.replace(normalizedPath, '');
        const firstSegment = relativePath.split('/')[0];
        return `${normalizedPath}${firstSegment}`;
      });
      
      // Remove duplicates
      const uniquePaths = [...new Set(childPaths)];
      
      // Get nodes for each path
      const nodes = [];
      for (const childPath of uniquePaths) {
        const node = await DataNode.get(childPath);
        if (node) {
          nodes.push(node);
        }
      }
      
      return nodes;
    } catch (error) {
      console.error(`Error listing child nodes for path ${path}:`, error);
      throw error;
    }
  }
  
  /**
   * Search for nodes
   * @param {string} query - Search query
   * @param {string} basePath - Base path to search in
   * @returns {Promise<Array>} Matching nodes
   */
  static async search(query, basePath = '') {
    try {
      // Get all keys
      const pattern = prefixKey(`data:${basePath}*`);
      const keys = await redis.keys(pattern);
      
      if (keys.length === 0) {
        return [];
      }
      
      // Search in data and metadata
      const results = [];
      
      for (const key of keys) {
        const path = key.replace(prefixKey('data:'), '');
        
        // Get data
        const data = await redis.get(key);
        
        // Check if data contains query
        if (data && data.toLowerCase().includes(query.toLowerCase())) {
          const node = await DataNode.get(path);
          if (node) {
            results.push(node);
          }
          continue;
        }
        
        // Check metadata
        const metadata = await redis.hgetall(prefixKey(`meta:${path}`));
        
        if (metadata) {
          const metaString = JSON.stringify(metadata).toLowerCase();
          if (metaString.includes(query.toLowerCase())) {
            const node = await DataNode.get(path);
            if (node) {
              results.push(node);
            }
          }
        }
      }
      
      return results;
    } catch (error) {
      console.error(`Error searching for nodes with query ${query}:`, error);
      throw error;
    }
  }
  
  /**
   * Count nodes
   * @param {string} basePath - Base path to count in
   * @returns {Promise<number>} Node count
   */
  static async count(basePath = '') {
    try {
      // Get all keys
      const pattern = prefixKey(`data:${basePath}*`);
      const keys = await redis.keys(pattern);
      
      return keys.length;
    } catch (error) {
      console.error(`Error counting nodes in path ${basePath}:`, error);
      throw error;
    }
  }
}

module.exports = DataNode;
