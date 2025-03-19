// server/services/securityRules.js
const { redis, prefixKey } = require('./redisClient');
const fs = require('fs').promises;
const path = require('path');

class SecurityRules {
  constructor() {
    this.rules = null;
    this.rulesLoaded = false;
    this.rulesPath = path.join(process.cwd(), 'config', 'database-rules.json');
  }
  
  /**
   * Initialize security rules
   * @returns {Promise<void>}
   */
  async init() {
    try {
      // Try to load rules from Redis first
      const rulesJson = await redis.get(prefixKey('security:rules'));
      
      if (rulesJson) {
        this.rules = JSON.parse(rulesJson);
        this.rulesLoaded = true;
        console.log('Security rules loaded from Redis');
        return;
      }
      
      // If not in Redis, load from file
      await this.loadRulesFromFile();
      
      // Save to Redis for faster access next time
      await this.saveRulesToRedis();
      
      console.log('Security rules initialized');
    } catch (error) {
      console.error('Error initializing security rules:', error);
      
      // Set default rules if loading fails
      this.setDefaultRules();
    }
  }
  
  /**
   * Load rules from file
   * @returns {Promise<void>}
   */
  async loadRulesFromFile() {
    try {
      const data = await fs.readFile(this.rulesPath, 'utf8');
      this.rules = JSON.parse(data);
      this.rulesLoaded = true;
      console.log('Security rules loaded from file');
    } catch (error) {
      console.error('Error loading security rules from file:', error);
      throw error;
    }
  }
  
  /**
   * Save rules to Redis
   * @returns {Promise<void>}
   */
  async saveRulesToRedis() {
    try {
      await redis.set(prefixKey('security:rules'), JSON.stringify(this.rules));
      console.log('Security rules saved to Redis');
    } catch (error) {
      console.error('Error saving security rules to Redis:', error);
    }
  }
  
  /**
   * Set default rules
   */
  setDefaultRules() {
    this.rules = {
      rules: {
        '.read': false,
        '.write': false,
        'users': {
          '$uid': {
            '.read': 'auth !== null && auth.uid === $uid',
            '.write': 'auth !== null && auth.uid === $uid'
          }
        },
        'public': {
          '.read': true,
          '.write': 'auth !== null'
        }
      }
    };
    
    this.rulesLoaded = true;
    console.log('Default security rules set');
    
    // Save default rules to Redis
    this.saveRulesToRedis();
  }
  
  /**
   * Update security rules
   * @param {Object} rules - New rules
   * @returns {Promise<void>}
   */
  async updateRules(rules) {
    try {
      // Validate rules
      if (!rules || !rules.rules) {
        throw new Error('Invalid rules format');
      }
      
      // Update rules
      this.rules = rules;
      
      // Save to Redis
      await this.saveRulesToRedis();
      
      // Save to file
      await fs.writeFile(this.rulesPath, JSON.stringify(rules, null, 2), 'utf8');
      
      console.log('Security rules updated');
    } catch (error) {
      console.error('Error updating security rules:', error);
      throw error;
    }
  }
  
  /**
   * Check if a user can read from a path
   * @param {string} path - Data path
   * @param {Object} user - Authenticated user
   * @returns {Promise<boolean>} Whether user can read
   */
  async canRead(path, user) {
    try {
      // Make sure rules are loaded
      if (!this.rulesLoaded) {
        await this.init();
      }
      
      // Normalize path
      const normalizedPath = path.startsWith('/') ? path.substring(1) : path;
      
      // Split path into parts
      const pathParts = normalizedPath.split('/');
      
      // Start at the root of the rules
      let currentRules = this.rules.rules;
      let currentPath = '';
      
      // Check for root read permission
      if (this.evaluateRule(currentRules['.read'], user, {}, {})) {
        return true;
      }
      
      // Traverse the path and check permissions at each level
      for (let i = 0; i < pathParts.length; i++) {
        const part = pathParts[i];
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        
        // Check if there's a rule for this exact path
        if (currentRules[part]) {
          currentRules = currentRules[part];
          
          // Check for read permission at this level
          if (currentRules['.read'] && this.evaluateRule(currentRules['.read'], user, { $path: currentPath }, {})) {
            return true;
          }
        } 
        // Check for wildcard rules
        else if (currentRules['$uid'] || currentRules['$id'] || currentRules['*']) {
          const wildcardKey = currentRules['$uid'] ? '$uid' : (currentRules['$id'] ? '$id' : '*');
          currentRules = currentRules[wildcardKey];
          
          // Check for read permission with the wildcard
          if (currentRules['.read']) {
            const wildcardVars = { [wildcardKey]: part, $path: currentPath };
            if (this.evaluateRule(currentRules['.read'], user, wildcardVars, {})) {
              return true;
            }
          }
        } 
        // No matching rule found
        else {
          return false;
        }
      }
      
      // If we've traversed the entire path and haven't found a permission, deny access
      return false;
    } catch (error) {
      console.error(`Error checking read permission for path ${path}:`, error);
      return false;
    }
  }
  
  /**
   * Check if a user can write to a path
   * @param {string} path - Data path
   * @param {Object} user - Authenticated user
   * @param {*} newData - New data being written
   * @param {*} oldData - Existing data at path
   * @returns {Promise<boolean>} Whether user can write
   */
  async canWrite(path, user, newData = {}, oldData = {}) {
    try {
      // Make sure rules are loaded
      if (!this.rulesLoaded) {
        await this.init();
      }
      
      // Normalize path
      const normalizedPath = path.startsWith('/') ? path.substring(1) : path;
      
      // Split path into parts
      const pathParts = normalizedPath.split('/');
      
      // Start at the root of the rules
      let currentRules = this.rules.rules;
      let currentPath = '';
      
      // Check for root write permission
      if (this.evaluateRule(currentRules['.write'], user, {}, { newData, oldData })) {
        return true;
      }
      
      // Traverse the path and check permissions at each level
      for (let i = 0; i < pathParts.length; i++) {
        const part = pathParts[i];
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        
        // Check if there's a rule for this exact path
        if (currentRules[part]) {
          currentRules = currentRules[part];
          
          // Check for write permission at this level
          if (currentRules['.write'] && this.evaluateRule(currentRules['.write'], user, { $path: currentPath }, { newData, oldData })) {
            return true;
          }
        } 
        // Check for wildcard rules
        else if (currentRules['$uid'] || currentRules['$id'] || currentRules['*']) {
          const wildcardKey = currentRules['$uid'] ? '$uid' : (currentRules['$id'] ? '$id' : '*');
          currentRules = currentRules[wildcardKey];
          
          // Check for write permission with the wildcard
          if (currentRules['.write']) {
            const wildcardVars = { [wildcardKey]: part, $path: currentPath };
            if (this.evaluateRule(currentRules['.write'], user, wildcardVars, { newData, oldData })) {
              return true;
            }
          }
        } 
        // No matching rule found
        else {
          return false;
        }
      }
      
      // If we've traversed the entire path and haven't found a permission, deny access
      return false;
    } catch (error) {
      console.error(`Error checking write permission for path ${path}:`, error);
      return false;
    }
  }
  
  /**
   * Evaluate a security rule
   * @param {*} rule - Rule to evaluate
   * @param {Object} auth - Authenticated user
   * @param {Object} variables - Path variables
   * @param {Object} data - Data context
   * @returns {boolean} Whether rule passes
   */
  evaluateRule(rule, auth, variables, data) {
    // If rule is not defined, deny access
    if (rule === undefined || rule === null) {
      return false;
    }
    
    // If rule is a boolean, return it directly
    if (typeof rule === 'boolean') {
      return rule;
    }
    
    // If rule is a string, evaluate it
    if (typeof rule === 'string') {
      try {
        // Create a safe evaluation context
        const context = {
          auth: auth || null,
          ...variables,
          ...data,
          // Add helper functions
          now: () => new Date().getTime(),
          root: data.root || {},
          exists: (path) => {
            // This is a simplified implementation
            return data.oldData && data.oldData[path] !== undefined;
          }
        };
        
        // Use Function constructor to evaluate the rule
        // This is a simplified approach and has security implications in a real system
        const evalFn = new Function(...Object.keys(context), `return ${rule};`);
        return evalFn(...Object.values(context));
      } catch (error) {
        console.error('Error evaluating security rule:', error);
        return false;
      }
    }
    
    // For any other type, deny access
    return false;
  }
}

module.exports = new SecurityRules();
