/**
 * API Client for Language Learning Companion
 * Handles all communication with the backend
 */

// Base API URL - change this in production
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

// Helper function for handling API responses
const handleResponse = async (response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw errorData.error || `Error: ${response.status} ${response.statusText}`;
  }
  return response.json();
};

// Auth token management
const getAuthToken = () => localStorage.getItem('authToken');

// Authentication service
export const authService = {
  login: async (username, password) => {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      throw error.error || `Failed to login: ${response.status} ${response.statusText}`;
    }
    
    const data = await response.json();
    localStorage.setItem('user', JSON.stringify(data.user));
    localStorage.setItem('token', data.token);
    return data.user;
  },
  
  register: async (userData) => {
    const response = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      throw error.error || `Failed to register: ${response.status} ${response.statusText}`;
    }
    
    const data = await response.json();
    localStorage.setItem('user', JSON.stringify(data.user));
    localStorage.setItem('token', data.token);
    return data.user;
  },
  
  logout: () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  },
  
  getCurrentUser: () => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },
  
  getToken: () => {
    return localStorage.getItem('token');
  },
  
  verifyToken: async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      return { authenticated: false, error: 'No authentication token found' };
    }
    
    try {
      const response = await fetch(`${API_URL}/api/auth/verify-token`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      // Handle non-OK responses
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        return { 
          authenticated: false, 
          error: errorData.error || `Server error: ${response.status}`
        };
      }
      
      const data = await response.json();
      
      if (!data.authenticated) {
        // Clear invalid credentials
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      }
      
      return data;
    } catch (error) {
      console.error('Token verification failed:', error);
      // Clear invalid credentials
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      return { 
        authenticated: false, 
        error: typeof error === 'object' && error !== null ? error.message : String(error)
      };
    }
  }
};

// Conversation service
export const conversationService = {
  // Get all conversations
  getAllConversations: async () => {
    const response = await fetch(`${API_URL}/api/conversations`, {
      headers: { 'Authorization': `Bearer ${getAuthToken()}` }
    });
    
    return handleResponse(response);
  },
  
  // Get single conversation
  getConversation: async (id) => {
    const response = await fetch(`${API_URL}/api/conversations/${id}`, {
      headers: { 'Authorization': `Bearer ${getAuthToken()}` }
    });
    
    return handleResponse(response);
  },
  
  // Send a new message
  sendMessage: async (message, topic = null) => {
    const payload = { message };
    if (topic) payload.topic = topic;
    
    const response = await fetch(`${API_URL}/api/conversations/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}` 
      },
      body: JSON.stringify(payload)
    });
    
    return handleResponse(response);
  },
  
  // Start new conversation with a topic
  startConversation: async (topic) => {
    const response = await fetch(`${API_URL}/api/conversations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}` 
      },
      body: JSON.stringify({ topic })
    });
    
    return handleResponse(response);
  }
};

// Vocabulary service
export const vocabularyService = {
  // Get all vocabulary for the user
  getAllVocabulary: async () => {
    const response = await fetch(`${API_URL}/api/vocabulary`, {
      headers: { 'Authorization': `Bearer ${getAuthToken()}` }
    });
    
    return handleResponse(response);
  },
  
  // Add new vocabulary
  addVocabulary: async (word, translation, level = 'A1', tags = []) => {
    const response = await fetch(`${API_URL}/api/vocabulary`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}` 
      },
      body: JSON.stringify({ word, translation, level, tags })
    });
    
    return handleResponse(response);
  },
  
  // Update proficiency level
  updateProficiency: async (word, change) => {
    const response = await fetch(`${API_URL}/api/vocabulary/proficiency`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}` 
      },
      body: JSON.stringify({ word, change })
    });
    
    return handleResponse(response);
  },
  
  // Get vocabulary flashcards
  getFlashcards: async (count = 10, filter = 'all') => {
    const response = await fetch(`${API_URL}/api/vocabulary/flashcards?count=${count}&filter=${filter}`, {
      headers: { 'Authorization': `Bearer ${getAuthToken()}` }
    });
    
    return handleResponse(response);
  },
  
  // Delete vocabulary
  deleteVocabulary: async (word) => {
    const response = await fetch(`${API_URL}/api/vocabulary/${encodeURIComponent(word)}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${getAuthToken()}` }
    });
    
    return handleResponse(response);
  }
};

// Activity service
export const activityService = {
  // Generate activity
  generateActivity: async (type, topic = '') => {
    const response = await fetch(
      `${API_URL}/api/activities/generate?type=${type}&topic=${encodeURIComponent(topic)}`, 
      {
        headers: { 'Authorization': `Bearer ${getAuthToken()}` }
      }
    );
    
    return handleResponse(response);
  },
  
  // Submit activity results
  submitResults: async (activityId, results) => {
    const response = await fetch(`${API_URL}/api/activities/${activityId}/results`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}` 
      },
      body: JSON.stringify({ results })
    });
    
    return handleResponse(response);
  }
};

// Romanization and TTS service
export const speechService = {
  // Get romanization
  getRomanization: async (text, language) => {
    const response = await fetch(`${API_URL}/api/romanize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}` 
      },
      body: JSON.stringify({ text, language })
    });
    
    return handleResponse(response);
  },
  
  // Get text-to-speech audio
  getTextToSpeech: async (text, language) => {
    const response = await fetch(`${API_URL}/api/speak`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}` 
      },
      body: JSON.stringify({ text, language })
    });
    
    return handleResponse(response);
  }
};

// Progress tracking service
export const progressService = {
  // Get user progress summary
  getProgressSummary: async () => {
    const response = await fetch(`${API_URL}/api/progress/summary`, {
      headers: { 'Authorization': `Bearer ${getAuthToken()}` }
    });
    
    return handleResponse(response);
  },
  
  // Get detailed progress data
  getProgressDetails: async (period = 'month') => {
    const response = await fetch(`${API_URL}/api/progress/details?period=${period}`, {
      headers: { 'Authorization': `Bearer ${getAuthToken()}` }
    });
    
    return handleResponse(response);
  }
};

// User preferences service
export const preferencesService = {
  // Get user preferences
  getPreferences: async () => {
    const response = await fetch(`${API_URL}/api/user/preferences`, {
      headers: { 'Authorization': `Bearer ${getAuthToken()}` }
    });
    
    return handleResponse(response);
  },
  
  // Update user preferences
  updatePreferences: async (preferences) => {
    const response = await fetch(`${API_URL}/api/user/preferences`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}` 
      },
      body: JSON.stringify({ preferences })
    });
    
    return handleResponse(response);
  }
};

// Export a default API object with all services
const api = {
  auth: authService,
  vocabulary: vocabularyService,
  conversation: conversationService,
  activity: activityService,
  speech: speechService,
  progress: progressService,
  preferences: preferencesService
};

export default api;