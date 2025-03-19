// server/routes/ai.js
const express = require('express');
const router = express.Router();
const aiService = require('../services/aiService');
const { authenticateJWT, isAuthenticated, refreshUser, optionalAuth } = require('../middleware/auth');

/**
 * @route POST /api/ai/chat
 * @desc Process a chat message with AI
 * @access Private (with optional auth for public queries)
 */
router.post('/chat', optionalAuth, async (req, res) => {
  try {
    const { message, conversation = [] } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    // Process message with AI
    const response = await aiService.processMessage(message, conversation, req.user);
    
    // Check if response needs authentication
    if (response.needsAuth && !req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: response.message,
        needsAuth: true
      });
    }
    
    res.json(response);
  } catch (error) {
    console.error('AI chat error:', error);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
});

/**
 * @route GET /api/ai/database-context
 * @desc Get database context for AI
 * @access Private
 */
router.get('/database-context', authenticateJWT, isAuthenticated, refreshUser, async (req, res) => {
  try {
    // Generate database context
    const context = await aiService.generateDatabaseContext(req.user);
    
    res.json({ context });
  } catch (error) {
    console.error('Database context error:', error);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
});

/**
 * @route POST /api/ai/analyze-data
 * @desc Analyze data at a specific path
 * @access Private
 */
router.post('/analyze-data', authenticateJWT, isAuthenticated, refreshUser, async (req, res) => {
  try {
    const { path } = req.body;
    
    if (!path) {
      return res.status(400).json({ error: 'Path is required' });
    }
    
    // Create a custom message for analysis
    const message = `Analyze the data at path "${path}" and provide insights.`;
    
    // Process with AI
    const response = await aiService.processMessage(message, [], req.user);
    
    res.json(response);
  } catch (error) {
    console.error('Data analysis error:', error);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
});

/**
 * @route POST /api/ai/generate-query
 * @desc Generate a database query from natural language
 * @access Private
 */
router.post('/generate-query', authenticateJWT, isAuthenticated, refreshUser, async (req, res) => {
  try {
    const { question } = req.body;
    
    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }
    
    // Create a custom message for query generation
    const message = `Generate a database query for: "${question}"`;
    
    // Process with AI
    const response = await aiService.processMessage(message, [], req.user);
    
    res.json(response);
  } catch (error) {
    console.error('Query generation error:', error);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
});

/**
 * @route POST /api/ai/explain-rules
 * @desc Explain security rules in natural language
 * @access Private
 */
router.post('/explain-rules', authenticateJWT, isAuthenticated, refreshUser, async (req, res) => {
  try {
    // Create a custom message for rules explanation
    const message = "Explain the current security rules in simple terms.";
    
    // Process with AI
    const response = await aiService.processMessage(message, [], req.user);
    
    res.json(response);
  } catch (error) {
    console.error('Rules explanation error:', error);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
});

module.exports = router;
