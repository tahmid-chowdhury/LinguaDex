const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');

// Middleware to verify JWT token
const verifyToken = require('../middleware/auth');

module.exports = function(client) {
  // Apply auth middleware to all routes
  router.use(verifyToken);
  
  // Get all vocabulary items for a user
  router.get('/', async (req, res) => {
    try {
      const username = req.user.username;
      
      // Get all vocabulary words for this user
      const vocabKeys = await client.sMembers(`user:${username}:vocabulary_keys`);
      
      if (!vocabKeys || vocabKeys.length === 0) {
        return res.json([]);
      }
      
      // Get details for each vocabulary word
      const vocabulary = [];
      for (const word of vocabKeys) {
        const vocabJson = await client.hGet(`user:${username}:vocabulary`, word);
        if (vocabJson) {
          vocabulary.push(JSON.parse(vocabJson));
        }
      }
      
      res.json(vocabulary);
    } catch (err) {
      console.error('Get vocabulary error:', err);
      res.status(500).json({ error: 'Failed to get vocabulary' });
    }
  });
  
  // Add new vocabulary word
  router.post('/', async (req, res) => {
    try {
      const username = req.user.username;
      const { word, translation, level = 'A1', tags = [] } = req.body;
      
      if (!word) {
        return res.status(400).json({ error: 'Word is required' });
      }
      
      // Create vocabulary item
      const vocabItem = {
        word,
        translation: translation || '',
        level,
        proficiency: 0.1, // Start with low proficiency
        dateAdded: new Date().toISOString(),
        lastReviewed: null,
        tags
      };
      
      // Save to Redis
      await client.hSet(`user:${username}:vocabulary`, word, JSON.stringify(vocabItem));
      await client.sAdd(`user:${username}:vocabulary_keys`, word);
      
      res.status(201).json(vocabItem);
    } catch (err) {
      console.error('Add vocabulary error:', err);
      res.status(500).json({ error: 'Failed to add vocabulary' });
    }
  });
  
  // Update word proficiency
  router.put('/proficiency', async (req, res) => {
    try {
      const username = req.user.username;
      const { word, change } = req.body;
      
      if (!word) {
        return res.status(400).json({ error: 'Word is required' });
      }
      
      // Get existing word data
      const vocabJson = await client.hGet(`user:${username}:vocabulary`, word);
      if (!vocabJson) {
        return res.status(404).json({ error: 'Word not found' });
      }
      
      const vocab = JSON.parse(vocabJson);
      
      // Update proficiency (ensuring it stays between 0 and 1)
      vocab.proficiency = Math.min(1, Math.max(0, vocab.proficiency + parseFloat(change)));
      vocab.lastReviewed = new Date().toISOString();
      
      // Save updated item back to Redis
      await client.hSet(`user:${username}:vocabulary`, word, JSON.stringify(vocab));
      
      res.json(vocab);
    } catch (err) {
      console.error('Update proficiency error:', err);
      res.status(500).json({ error: 'Failed to update proficiency' });
    }
  });
  
  // Get vocabulary flashcards for review
  router.get('/flashcards', async (req, res) => {
    try {
      const username = req.user.username;
      const count = parseInt(req.query.count) || 10;
      const filter = req.query.filter || 'all';
      
      // Get vocabulary keys
      const vocabKeys = await client.sMembers(`user:${username}:vocabulary_keys`);
      
      if (!vocabKeys || vocabKeys.length === 0) {
        return res.json([]);
      }
      
      // Get vocabulary items
      let flashcards = [];
      for (const word of vocabKeys) {
        const vocabJson = await client.hGet(`user:${username}:vocabulary`, word);
        if (vocabJson) {
          flashcards.push(JSON.parse(vocabJson));
        }
      }
      
      // Apply filter
      if (filter !== 'all') {
        if (filter === 'low') {
          flashcards = flashcards.filter(item => item.proficiency < 0.33);
        } else if (filter === 'medium') {
          flashcards = flashcards.filter(item => item.proficiency >= 0.33 && item.proficiency < 0.66);
        } else if (filter === 'high') {
          flashcards = flashcards.filter(item => item.proficiency >= 0.66);
        }
      }
      
      // Shuffle and limit
      flashcards = flashcards
        .sort(() => Math.random() - 0.5)
        .slice(0, count);
      
      res.json(flashcards);
    } catch (err) {
      console.error('Get flashcards error:', err);
      res.status(500).json({ error: 'Failed to get flashcards' });
    }
  });
  
  // Delete a vocabulary word
  router.delete('/:word', async (req, res) => {
    try {
      const username = req.user.username;
      const word = req.params.word;
      
      // Remove from vocabulary hash and set
      await client.hDel(`user:${username}:vocabulary`, word);
      await client.sRem(`user:${username}:vocabulary_keys`, word);
      
      res.json({ success: true });
    } catch (err) {
      console.error('Delete vocabulary error:', err);
      res.status(500).json({ error: 'Failed to delete vocabulary' });
    }
  });
  
  return router;
};