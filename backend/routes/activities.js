const express = require('express');
const router = express.Router();

// Middleware to verify JWT token
const verifyToken = require('../middleware/auth');

module.exports = function(client) {
  // Apply auth middleware to all routes
  router.use(verifyToken);
  
  // Get available activity types
  router.get('/types', async (req, res) => {
    try {
      // These would typically come from a database
      const activityTypes = [
        {
          id: 'flashcards',
          name: 'Flashcards',
          description: 'Practice vocabulary with flashcards',
          icon: 'card'
        },
        {
          id: 'conversation',
          name: 'Conversation Practice',
          description: 'Practice speaking with AI conversation partner',
          icon: 'chat'
        },
        {
          id: 'fill-blanks',
          name: 'Fill in the Blanks',
          description: 'Complete sentences with appropriate words',
          icon: 'edit'
        },
        {
          id: 'matching',
          name: 'Word Matching',
          description: 'Match words with their translations',
          icon: 'connection'
        },
        {
          id: 'listening',
          name: 'Listening Comprehension',
          description: 'Listen to audio and answer questions',
          icon: 'headphones'
        }
      ];
      
      res.json(activityTypes);
    } catch (err) {
      console.error('Get activity types error:', err);
      res.status(500).json({ error: 'Failed to get activity types' });
    }
  });
  
  // Generate a specific activity
  router.get('/generate', async (req, res) => {
    try {
      const username = req.user.username;
      const { type, level, topic } = req.query;
      
      if (!type) {
        return res.status(400).json({ error: 'Activity type is required' });
      }
      
      // Get user's target language for context
      const userJson = await client.hGet('users', username);
      if (!userJson) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      const user = JSON.parse(userJson);
      const targetLanguage = user.targetLanguage || 'Spanish'; // Default
      
      // Get user's vocabulary for vocabulary-based exercises
      const vocabKeys = await client.sMembers(`user:${username}:vocabulary_keys`);
      
      let words = [];
      if (vocabKeys && vocabKeys.length > 0) {
        for (const word of vocabKeys) {
          const vocabJson = await client.hGet(`user:${username}:vocabulary`, word);
          if (vocabJson) {
            words.push(JSON.parse(vocabJson));
          }
        }
      }
      
      // Generate activity based on type
      let activity;
      
      switch(type) {
        case 'flashcards':
          activity = generateFlashcardsActivity(words, level, targetLanguage);
          break;
          
        case 'conversation':
          activity = generateConversationActivity(topic, level, targetLanguage);
          break;
          
        case 'fill-blanks':
          activity = generateFillBlanksActivity(words, level, topic, targetLanguage);
          break;
          
        case 'matching':
          activity = generateMatchingActivity(words, level, targetLanguage);
          break;
          
        case 'listening':
          activity = generateListeningActivity(level, topic, targetLanguage);
          break;
          
        default:
          return res.status(400).json({ error: 'Invalid activity type' });
      }
      
      res.json(activity);
    } catch (err) {
      console.error('Generate activity error:', err);
      res.status(500).json({ error: 'Failed to generate activity' });
    }
  });
  
  // Save activity result
  router.post('/result', async (req, res) => {
    try {
      const username = req.user.username;
      const { type, score, details } = req.body;
      
      if (!type || score === undefined) {
        return res.status(400).json({ error: 'Activity type and score are required' });
      }
      
      // Create activity result
      const result = {
        username,
        type,
        score,
        details: details || {},
        timestamp: new Date().toISOString()
      };
      
      // Save to Redis
      const resultKey = `user:${username}:activity:${Date.now()}`;
      await client.set(resultKey, JSON.stringify(result));
      
      // Add to user's activity history
      await client.lPush(`user:${username}:activities`, resultKey);
      await client.lTrim(`user:${username}:activities`, 0, 99); // Keep last 100
      
      // Update user's overall stats
      let statsJson = await client.hGet(`user:${username}:stats`, 'activities');
      let stats = statsJson ? JSON.parse(statsJson) : {
        total: 0,
        byType: {}
      };
      
      stats.total++;
      stats.byType[type] = (stats.byType[type] || 0) + 1;
      
      await client.hSet(`user:${username}:stats`, 'activities', JSON.stringify(stats));
      
      res.json({ success: true, result });
    } catch (err) {
      console.error('Save activity result error:', err);
      res.status(500).json({ error: 'Failed to save activity result' });
    }
  });
  
  return router;
};

// Helper functions to generate different activity types

function generateFlashcardsActivity(words, level, targetLanguage) {
  // Filter words by level if specified
  if (level && words.length > 0) {
    words = words.filter(word => !word.level || word.level.includes(level));
  }
  
  // Shuffle and take up to 10 words
  const shuffledWords = words.length > 0 
    ? words.sort(() => Math.random() - 0.5).slice(0, 10)
    : generateDummyWords(10, targetLanguage);
  
  return {
    type: 'flashcards',
    title: 'Vocabulary Practice',
    instructions: 'Review these flashcards to improve your vocabulary. Rate your knowledge of each term.',
    cards: shuffledWords.map(word => ({
      front: word.word,
      back: word.translation,
      audio: `/api/tts?text=${encodeURIComponent(word.word)}&lang=${targetLanguage}`
    }))
  };
}

function generateConversationActivity(topic, level, targetLanguage) {
  // Sample topics
  const topics = [
    'Daily Routine', 'Travel', 'Food and Cooking', 'Hobbies', 
    'Work and Career', 'Education', 'Family', 'Technology'
  ];
  
  const selectedTopic = topic || topics[Math.floor(Math.random() * topics.length)];
  
  // Generate conversation starters based on topic
  const starters = {
    'Daily Routine': [
      'What time do you usually wake up?',
      'What do you do first thing in the morning?',
      'Do you exercise regularly?'
    ],
    'Travel': [
      'Have you ever visited another country?',
      'What's your favorite place to go on vacation?',
      'Do you prefer beaches or mountains?'
    ],
    'Food and Cooking': [
      'What's your favorite dish to cook?',
      'Do you follow any special diet?',
      'What's a traditional food from your country?'
    ]
  };
  
  // Default starters if topic not in our list
  const defaultStarters = [
    'Tell me about yourself.',
    'What do you think about this topic?',
    'Can you share your experience with this?'
  ];
  
  return {
    type: 'conversation',
    title: `Conversation Practice: ${selectedTopic}`,
    description: `Practice your ${targetLanguage} conversation skills on the topic of ${selectedTopic}.`,
    level: level || 'B1',
    topic: selectedTopic,
    instructions: 'Engage in a conversation with the AI assistant. Try to use complete sentences and ask follow-up questions.',
    starters: starters[selectedTopic] || defaultStarters,
    vocabularySuggestions: generateTopicVocabulary(selectedTopic, targetLanguage, 5)
  };
}

function generateFillBlanksActivity(words, level, topic, targetLanguage) {
  // Sample sentences with blanks
  const sentences = [
    {
      text: "Yesterday, I ____ to the store to buy some groceries.",
      answer: "went",
      hint: "past tense of 'go'"
    },
    {
      text: "She ____ three languages fluently: English, Spanish, and French.",
      answer: "speaks",
      hint: "to talk in a language"
    },
    {
      text: "The restaurant is famous for its delicious ____ dishes.",
      answer: "traditional",
      hint: "relating to old customs"
    },
    {
      text: "I need to ____ my homework before I go out.",
      answer: "finish",
      hint: "to complete"
    },
    {
      text: "The ____ was beautiful, with mountains and a clear blue sky.",
      answer: "scenery",
      hint: "view of natural features"
    }
  ];
  
  // Take a random selection of sentences
  const shuffledSentences = sentences.sort(() => Math.random() - 0.5).slice(0, 5);
  
  return {
    type: 'fill-blanks',
    title: 'Fill in the Blanks',
    instructions: 'Complete each sentence by filling in the blank with the appropriate word.',
    level: level || 'B1',
    sentences: shuffledSentences
  };
}

function generateMatchingActivity(words, level, targetLanguage) {
  // Use user's vocabulary or generate dummy words if none available
  const vocabToUse = words.length >= 6 
    ? words.sort(() => Math.random() - 0.5).slice(0, 6)
    : generateDummyWords(6, targetLanguage);
    
  return {
    type: 'matching',
    title: 'Match Words and Definitions',
    instructions: 'Match each word with its correct definition.',
    level: level || 'B1',
    pairs: vocabToUse.map(word => ({
      word: word.word,
      match: word.translation
    }))
  };
}

function generateListeningActivity(level, topic, targetLanguage) {
  // Sample listening excerpts
  const excerpts = [
    {
      text: "Today we're going to talk about healthy eating habits. It's important to include fruits and vegetables in your diet every day.",
      audio: "/audio/sample1.mp3",
      questions: [
        {
          question: "What is the topic of this excerpt?",
          options: ["Exercise", "Healthy eating", "Sleeping habits", "Meditation"],
          answer: 1
        },
        {
          question: "What should you include in your diet every day?",
          options: ["Meat", "Fruits and vegetables", "Dairy products", "Grains"],
          answer: 1
        }
      ]
    },
    {
      text: "The weather forecast for tomorrow shows a high chance of rain in the morning, but it should clear up by the afternoon.",
      audio: "/audio/sample2.mp3",
      questions: [
        {
          question: "What is being discussed?",
          options: ["Today's weather", "Tomorrow's weather", "Climate change", "Seasonal patterns"],
          answer: 1
        },
        {
          question: "When is it expected to rain?",
          options: ["All day", "In the morning", "In the afternoon", "In the evening"],
          answer: 1
        }
      ]
    }
  ];
  
  // Select a random excerpt
  const selectedExcerpt = excerpts[Math.floor(Math.random() * excerpts.length)];
  
  return {
    type: 'listening',
    title: 'Listening Comprehension',
    instructions: 'Listen to the audio clip and answer the questions.',
    level: level || 'B1',
    audioUrl: selectedExcerpt.audio,
    transcript: selectedExcerpt.text,
    showTranscript: false,
    questions: selectedExcerpt.questions
  };
}

// Helper function to generate dummy vocabulary words
function generateDummyWords(count, language) {
  const dummyWords = {
    'Spanish': [
      { word: 'casa', translation: 'house', level: 'A1' },
      { word: 'perro', translation: 'dog', level: 'A1' },
      { word: 'gato', translation: 'cat', level: 'A1' },
      { word: 'libro', translation: 'book', level: 'A1' },
      { word: 'agua', translation: 'water', level: 'A1' },
      { word: 'comida', translation: 'food', level: 'A1' },
      { word: 'amigo', translation: 'friend', level: 'A1' },
      { word: 'trabajo', translation: 'work', level: 'A2' },
      { word: 'tiempo', translation: 'time', level: 'A2' },
      { word: 'familia', translation: 'family', level: 'A1' }
    ],
    'French': [
      { word: 'maison', translation: 'house', level: 'A1' },
      { word: 'chien', translation: 'dog', level: 'A1' },
      { word: 'chat', translation: 'cat', level: 'A1' },
      { word: 'livre', translation: 'book', level: 'A1' },
      { word: 'eau', translation: 'water', level: 'A1' },
      { word: 'nourriture', translation: 'food', level: 'A1' },
      { word: 'ami', translation: 'friend', level: 'A1' },
      { word: 'travail', translation: 'work', level: 'A2' },
      { word: 'temps', translation: 'time', level: 'A2' },
      { word: 'famille', translation: 'family', level: 'A1' }
    ]
  };
  
  // Default to Spanish if language not found
  const words = dummyWords[language] || dummyWords['Spanish'];
  return words.slice(0, count);
}

// Helper function to generate vocabulary related to a topic
function generateTopicVocabulary(topic, language, count) {
  const topicVocabulary = {
    'Daily Routine': [
      { word: 'despertarse', translation: 'to wake up' },
      { word: 'ducharse', translation: 'to shower' },
      { word: 'desayunar', translation: 'to have breakfast' },
      { word: 'trabajar', translation: 'to work' },
      { word: 'almorzar', translation: 'to have lunch' }
    ],
    'Travel': [
      { word: 'viajar', translation: 'to travel' },
      { word: 'pasaporte', translation: 'passport' },
      { word: 'hotel', translation: 'hotel' },
      { word: 'vuelo', translation: 'flight' },
      { word: 'reservar', translation: 'to book' }
    ],
    'Food and Cooking': [
      { word: 'cocinar', translation: 'to cook' },
      { word: 'receta', translation: 'recipe' },
      { word: 'ingrediente', translation: 'ingredient' },
      { word: 'sabroso', translation: 'tasty' },
      { word: 'hornear', translation: 'to bake' }
    ]
  };
  
  // Default vocabulary if topic not found
  const defaultVocab = [
    { word: 'interesante', translation: 'interesting' },
    { word: 'importante', translation: 'important' },
    { word: 'difícil', translation: 'difficult' },
    { word: 'fácil', translation: 'easy' },
    { word: 'divertido', translation: 'fun' }
  ];
  
  const vocab = topicVocabulary[topic] || defaultVocab;
  return vocab.slice(0, count);
}