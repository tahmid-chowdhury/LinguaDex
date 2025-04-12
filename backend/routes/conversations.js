const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');

// Middleware to verify JWT token
const verifyToken = require('../middleware/auth');

module.exports = function(client) {
  // Apply auth middleware to all routes
  router.use(verifyToken);
  
  // Get all conversations for a user
  router.get('/', async (req, res) => {
    try {
      const username = req.user.username;
      
      // Get conversation IDs
      const conversationIds = await client.sMembers(`user:${username}:conversations`);
      
      if (!conversationIds || conversationIds.length === 0) {
        return res.json([]);
      }
      
      // Get conversation summaries
      const conversations = [];
      for (const id of conversationIds) {
        const convoJson = await client.hGet('conversations', id);
        if (convoJson) {
          const conversation = JSON.parse(convoJson);
          // Return summary data, not all messages
          conversations.push({
            id: conversation.id,
            topic: conversation.topic,
            createdAt: conversation.createdAt,
            updatedAt: conversation.updatedAt,
            messageCount: conversation.messages.length
          });
        }
      }
      
      // Sort by most recent
      conversations.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      
      res.json(conversations);
    } catch (err) {
      console.error('Get conversations error:', err);
      res.status(500).json({ error: 'Failed to get conversations' });
    }
  });
  
  // Get a single conversation by id
  router.get('/:id', async (req, res) => {
    try {
      const username = req.user.username;
      const conversationId = req.params.id;
      
      // Check if conversation belongs to user
      const isMember = await client.sIsMember(`user:${username}:conversations`, conversationId);
      if (!isMember) {
        return res.status(404).json({ error: 'Conversation not found' });
      }
      
      // Get conversation
      const convoJson = await client.hGet('conversations', conversationId);
      if (!convoJson) {
        return res.status(404).json({ error: 'Conversation not found' });
      }
      
      res.json(JSON.parse(convoJson));
    } catch (err) {
      console.error('Get conversation error:', err);
      res.status(500).json({ error: 'Failed to get conversation' });
    }
  });
  
  // Create a new conversation
  router.post('/', async (req, res) => {
    try {
      const username = req.user.username;
      const { topic } = req.body;
      
      // Create conversation
      const conversationId = uuidv4();
      const conversation = {
        id: conversationId,
        username,
        topic: topic || 'General Conversation',
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Save to Redis
      await client.hSet('conversations', conversationId, JSON.stringify(conversation));
      await client.sAdd(`user:${username}:conversations`, conversationId);
      
      res.status(201).json(conversation);
    } catch (err) {
      console.error('Create conversation error:', err);
      res.status(500).json({ error: 'Failed to create conversation' });
    }
  });
  
  // Add a message to a conversation (or create a new one)
  router.post('/message', async (req, res) => {
    try {
      const username = req.user.username;
      const { message, conversationId, topic } = req.body;
      
      let conversation;
      
      // If conversation ID is provided, use existing conversation
      if (conversationId) {
        const convoJson = await client.hGet('conversations', conversationId);
        if (!convoJson) {
          return res.status(404).json({ error: 'Conversation not found' });
        }
        
        conversation = JSON.parse(convoJson);
        
        // Verify user owns this conversation
        if (conversation.username !== username) {
          return res.status(403).json({ error: 'Not authorized to access this conversation' });
        }
      } else {
        // Create a new conversation
        const newConversationId = uuidv4();
        conversation = {
          id: newConversationId,
          username,
          topic: topic || 'General Conversation',
          messages: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        // Add to user's conversations
        await client.sAdd(`user:${username}:conversations`, newConversationId);
      }
      
      // Add user message
      const userMessage = {
        id: conversation.messages.length,
        sender: 'user',
        content: message,
        timestamp: new Date().toISOString()
      };
      
      conversation.messages.push(userMessage);
      
      // In a real app, you would call an AI service here
      // For now, we'll create a mock AI response
      const aiResponse = {
        id: conversation.messages.length,
        sender: 'ai',
        content: generateAIResponse(message, conversation.topic),
        translation: generateTranslation(message),
        timestamp: new Date().toISOString()
      };
      
      conversation.messages.push(aiResponse);
      conversation.updatedAt = new Date().toISOString();
      
      // Save updated conversation
      await client.hSet('conversations', conversation.id, JSON.stringify(conversation));
      
      // Generate some mock feedback
      const feedback = {
        fluency: Math.random().toFixed(2),
        grammar: {
          structures: ['Simple Present', 'Question Formation'],
          issues: message.length > 15 ? ['Subject-verb agreement'] : []
        },
        vocabulary: {
          level: 'B1',
          suggestions: ['eloquent', 'articulate']
        }
      };
      
      res.json({
        conversationId: conversation.id,
        message: aiResponse,
        feedback
      });
    } catch (err) {
      console.error('Send message error:', err);
      res.status(500).json({ error: 'Failed to send message' });
    }
  });
  
  return router;
};

// Helper function to generate AI responses
function generateAIResponse(message, topic) {
  const responses = [
    `That's an interesting point about ${topic}.`,
    `I understand what you're saying about ${topic}.`,
    `Tell me more about ${topic}.`,
    `I'd like to know your thoughts on ${topic}.`,
    `${topic} is a fascinating subject, isn't it?`
  ];
  
  // Simple echo for demonstration
  if (message.endsWith('?')) {
    return `You asked: "${message}" That's a good question about ${topic}.`;
  } else {
    return responses[Math.floor(Math.random() * responses.length)];
  }
}

// Helper function to generate a mock translation
function generateTranslation(message) {
  return `[Translation: ${message}]`;
}