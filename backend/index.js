const express = require('express');
const redis = require('redis');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const { promisify } = require('util');
const { v4: uuidv4 } = require('uuid');

// Express app setup
const app = express();
const port = process.env.PORT || 880;

// Redis client setup
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const client = redis.createClient({
  url: redisUrl
});

// Connect to Redis
(async () => {
  try {
    await client.connect();
    console.log('Connected to Redis');
  } catch (err) {
    console.error('Redis connection error:', err);
  }
})();

// Import auth routes
const authRoutes = require('./routes/auth')(client);

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../frontend/build')));

// Mount auth routes
app.use('/auth', authRoutes);

// Session management
const sessions = {};

// Helper functions for Redis
const getAsync = async (key) => {
  return await client.get(key);
};

const setAsync = async (key, value) => {
  return await client.set(key, value);
};

// API Routes

// Vocabulary Management
app.post('/api/add_vocabulary', async (req, res) => {
  try {
    const { sessionId } = req.headers;
    const { word, translation } = req.body;
    
    if (!sessionId || !sessions[sessionId]) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const { userId } = sessions[sessionId];
    
    // Create vocabulary entry
    const vocabId = uuidv4();
    const vocabData = {
      id: vocabId,
      word,
      translation,
      proficiency: 0,
      added_at: new Date().toISOString(),
      last_practiced: null
    };
    
    // Save to Redis
    await setAsync(`vocab:${userId}:${vocabId}`, JSON.stringify(vocabData));
    
    // Add to user's vocabulary list
    const vocabListKey = `vocablist:${userId}`;
    await client.sAdd(vocabListKey, vocabId);
    
    res.status(201).json({
      success: true,
      vocabulary: vocabData
    });
  } catch (error) {
    console.error('Add vocabulary error:', error);
    res.status(500).json({ error: 'Server error adding vocabulary' });
  }
});

app.get('/api/vocabulary', async (req, res) => {
  try {
    const { sessionId } = req.headers;
    
    if (!sessionId || !sessions[sessionId]) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const { userId } = sessions[sessionId];
    
    // Get user's vocabulary IDs
    const vocabListKey = `vocablist:${userId}`;
    const vocabIds = await client.sMembers(vocabListKey);
    
    // Get vocabulary items
    const vocabulary = [];
    for (const vocabId of vocabIds) {
      const vocabJson = await getAsync(`vocab:${userId}:${vocabId}`);
      if (vocabJson) {
        vocabulary.push(JSON.parse(vocabJson));
      }
    }
    
    res.status(200).json({ vocabulary });
  } catch (error) {
    console.error('Get vocabulary error:', error);
    res.status(500).json({ error: 'Server error getting vocabulary' });
  }
});

app.post('/api/update_vocabulary_proficiency', async (req, res) => {
  try {
    const { sessionId } = req.headers;
    const { word, change } = req.body;
    
    if (!sessionId || !sessions[sessionId]) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const { userId } = sessions[sessionId];
    
    // Find the vocabulary entry
    const vocabListKey = `vocablist:${userId}`;
    const vocabIds = await client.sMembers(vocabListKey);
    
    let updated = false;
    for (const vocabId of vocabIds) {
      const vocabJson = await getAsync(`vocab:${userId}:${vocabId}`);
      if (vocabJson) {
        const vocab = JSON.parse(vocabJson);
        if (vocab.word === word) {
          // Update proficiency
          vocab.proficiency = Math.max(0, Math.min(1, vocab.proficiency + parseFloat(change)));
          vocab.last_practiced = new Date().toISOString();
          
          // Save back to Redis
          await setAsync(`vocab:${userId}:${vocabId}`, JSON.stringify(vocab));
          updated = true;
          
          res.status(200).json({ 
            success: true, 
            word, 
            proficiency: vocab.proficiency 
          });
          break;
        }
      }
    }
    
    if (!updated) {
      res.status(404).json({ error: 'Vocabulary word not found' });
    }
  } catch (error) {
    console.error('Update vocabulary error:', error);
    res.status(500).json({ error: 'Server error updating vocabulary' });
  }
});

// Activity Generation
app.get('/api/practice_activity', async (req, res) => {
  try {
    const { type, topic } = req.query;
    const { sessionId } = req.headers;
    
    if (!sessionId || !sessions[sessionId]) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const { targetLanguage } = sessions[sessionId];
    
    // Sample data for demonstration - in a real app, you'd generate this dynamically
    // or use an AI service
    
    let activityData;
    
    if (type === 'conversation') {
      activityData = {
        title: `Conversation about ${topic}`,
        description: `Practice your ${targetLanguage} conversation skills on the topic of ${topic}.`,
        scenario: `You're discussing ${topic} with a friend.`,
        key_vocabulary: ['word1', 'word2', 'word3'],
        key_phrases: ['phrase1', 'phrase2', 'phrase3'],
        questions: ['Question 1?', 'Question 2?', 'Question 3?'],
        hints: ['Hint 1', 'Hint 2', 'Hint 3']
      };
    } else if (type === 'fill-in-blanks') {
      activityData = {
        title: `Fill in the blanks: ${topic}`,
        description: `Complete the text by filling in the missing words.`,
        text: 'This is a ____ about ____ with some words missing.',
        answers: ['text', topic]
      };
    } else if (type === 'reading') {
      activityData = {
        title: `Reading about ${topic}`,
        description: `Improve your reading comprehension with this text about ${topic}.`,
        text: `This is a sample reading text about ${topic}. It would typically be longer and contain interesting information.`,
        vocabulary: [
          { word: 'word1', definition: 'definition1', example: 'example1' },
          { word: 'word2', definition: 'definition2', example: 'example2' }
        ],
        questions: ['Question 1?', 'Question 2?', 'Question 3?']
      };
    } else {
      return res.status(400).json({ error: 'Invalid activity type' });
    }
    
    res.status(200).json(activityData);
  } catch (error) {
    console.error('Activity generation error:', error);
    res.status(500).json({ error: 'Server error generating activity' });
  }
});

// Text-to-Speech API
app.post('/api/speak', async (req, res) => {
  try {
    const { text, language } = req.body;
    
    // For demonstration purposes - in a real app, you'd call a TTS service
    // like Google Cloud TTS, Amazon Polly, etc.
    
    // Mock response with a placeholder audio URL
    // In production, you'd generate the audio and provide a real URL
    const audioUrl = `/audio/tts-${Date.now()}.mp3`;
    
    res.status(200).json({ audio_url: audioUrl });
  } catch (error) {
    console.error('TTS error:', error);
    res.status(500).json({ error: 'Server error processing speech synthesis' });
  }
});

// Translation API
app.post('/api/translate', async (req, res) => {
  try {
    const { text, source_lang, target_lang } = req.body;
    
    // For demonstration purposes - in a real app, you'd call a translation service
    // like Google Translate, DeepL, etc.
    
    // Mock translation response
    res.status(200).json({ 
      translation: `[Translated: ${text}]`,
      source_language: source_lang,
      target_language: target_lang
    });
  } catch (error) {
    console.error('Translation error:', error);
    res.status(500).json({ error: 'Server error processing translation' });
  }
});

// Romanization API
app.post('/api/romanize', async (req, res) => {
  try {
    const { text, language } = req.body;
    
    // For demonstration purposes - in a real app, you'd use a proper
    // romanization service or library for the specific language
    
    // Mock romanization response
    res.status(200).json({ 
      romanized: `[Romanized: ${text}]`,
      language
    });
  } catch (error) {
    console.error('Romanization error:', error);
    res.status(500).json({ error: 'Server error processing romanization' });
  }
});

// Serve React frontend for any other route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/build/index.html'));
});

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
