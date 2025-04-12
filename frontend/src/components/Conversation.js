import React, { useState, useEffect, useRef } from 'react';
import { conversationService, vocabularyService } from '../services/api';
import { useLocation } from 'react-router-dom';

const Conversation = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [insights, setInsights] = useState(null);
  const [error, setError] = useState('');
  const messagesEndRef = useRef(null);
  const location = useLocation();
  
  // Get the topic from URL query parameters
  useEffect(() => {
    const query = new URLSearchParams(location.search);
    const topic = query.get('topic');
    if (topic) {
      setInput(`Let's talk about ${topic}`);
    }
  }, [location]);
  
  // Load existing conversation if we have an ID
  useEffect(() => {
    if (conversationId) {
      loadConversation(conversationId);
    }
  }, [conversationId]);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  const loadConversation = async (id) => {
    try {
      setLoading(true);
      const data = await conversationService.getConversation(id);
      setMessages(data.messages);
    } catch (err) {
      setError('Failed to load conversation');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    const userMessage = {
      id: messages.length,
      sender: 'user',
      content: input,
      timestamp: new Date().toISOString()
    };
    
    setMessages([...messages, userMessage]);
    setInput('');
    setLoading(true);
    
    try {
      // Determine if this is a new conversation or continuing one
      const query = new URLSearchParams(location.search);
      const topic = query.get('topic');
      
      const response = await conversationService.sendMessage(input, topic);
      
      // Add AI response to messages
      setMessages(prevMessages => [...prevMessages, {
        id: prevMessages.length,
        ...response.response
      }]);
      
      // Save conversation ID for future messages
      if (response.conversationId && !conversationId) {
        setConversationId(response.conversationId);
      }
      
      // Update insights
      if (response.insights) {
        setInsights(response.insights);
        
        // Add suggested vocabulary if available
        if (response.insights.suggestions) {
          response.insights.suggestions.forEach(async (suggestion) => {
            if (suggestion.type === 'vocabulary') {
              try {
                await vocabularyService.addVocabulary(
                  suggestion.item, 
                  '', // Translation will be filled in by user later
                  'A1', // Default level
                  ['suggested'] // Tag as suggested
                );
              } catch (err) {
                console.error('Failed to save suggested vocabulary', err);
              }
            }
          });
        }
      }
    } catch (err) {
      setError('Failed to send message');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  const toggleTranslation = (index) => {
    setMessages(prevMessages => {
      const updatedMessages = [...prevMessages];
      updatedMessages[index] = {
        ...updatedMessages[index],
        showTranslation: !updatedMessages[index].showTranslation
      };
      return updatedMessages;
    });
  };
  
  return (
    <div className="conversation-container">
      <div className="conversation-messages">
        {messages.map((message, index) => (
          <div 
            key={index} 
            className={`message ${message.sender === 'user' ? 'user-message' : 'ai-message'}`}
          >
            <div className="message-content">
              {message.content}
            </div>
            
            {message.sender === 'ai' && message.translation && (
              <>
                {message.showTranslation && (
                  <div className="message-translation">
                    {message.translation}
                  </div>
                )}
                <div className="message-meta">
                  <span className="message-time">
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </span>
                  <button 
                    className="translate-btn"
                    onClick={() => toggleTranslation(index)}
                  >
                    {message.showTranslation ? 'Hide' : 'Show'} Translation
                  </button>
                </div>
              </>
            )}
            
            {message.sender === 'user' && (
              <div className="message-meta">
                <span className="message-time">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </span>
              </div>
            )}
          </div>
        ))}
        
        {loading && (
          <div className="message ai-message">
            <div className="message-content">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
        
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      <div className="message-input-container">
        <form onSubmit={handleSubmit}>
          <textarea
            id="message-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message here..."
            disabled={loading}
          ></textarea>
          <div className="input-actions">
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={loading || !input.trim()}
            >
              Send
            </button>
          </div>
        </form>
      </div>
      
      {insights && (
        <div className="conversation-sidebar">
          <div className="sidebar-section">
            <h3>Fluency Analysis</h3>
            <div className="fluency-meter high">
              <div className="fluency-fill" style={{ width: `${insights.fluency * 100}%` }}></div>
              <span className="fluency-value">{Math.round(insights.fluency * 100)}%</span>
            </div>
          </div>
          
          {insights.grammar && insights.grammar.structures && (
            <div className="sidebar-section">
              <h3>Grammar Structures Used</h3>
              <ul className="grammar-list">
                {insights.grammar.structures.map((structure, index) => (
                  <li key={index}>{structure}</li>
                ))}
              </ul>
            </div>
          )}
          
          {insights.errors && insights.errors.length > 0 && (
            <div className="sidebar-section">
              <h3>Correction Suggestions</h3>
              <ul className="error-list">
                {insights.errors.map((error, index) => (
                  <li key={index}>
                    <span className="error-original">{error.original}</span>
                    <span className="error-correction">{error.correction}</span>
                    {error.explanation && (
                      <div className="error-explanation">{error.explanation}</div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {insights.suggestions && insights.suggestions.length > 0 && (
            <div className="sidebar-section">
              <h3>Vocabulary Suggestions</h3>
              <div className="vocabulary-list">
                {insights.suggestions
                  .filter(suggestion => suggestion.type === 'vocabulary')
                  .map((suggestion, index) => (
                    <div key={index} className="suggestion-item">
                      <div className="suggestion-word">{suggestion.item}</div>
                      <div className="suggestion-example">{suggestion.example}</div>
                    </div>
                  ))
                }
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Conversation;