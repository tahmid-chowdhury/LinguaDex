import React, { useState, useRef, useEffect } from 'react';

function Conversation() {
  // State for messages
  const [messages, setMessages] = useState([
    { id: 1, sender: 'ai', content: 'Hola! ¿Cómo estás hoy?', translation: 'Hello! How are you today?', timestamp: '10:30 AM' },
    { id: 2, sender: 'user', content: 'Estoy bien, gracias. ¿Y tú?', timestamp: '10:31 AM' },
    { id: 3, sender: 'ai', content: 'Muy bien! ¿Qué quieres hablar hoy?', translation: 'Very well! What do you want to talk about today?', timestamp: '10:32 AM' },
  ]);
  
  // State for new message input
  const [newMessage, setNewMessage] = useState('');
  
  // State for insights panel
  const [insights, setInsights] = useState({
    fluency: 0.65,
    grammar: { structures: ['Present tense verbs', 'Basic greetings', 'Question formation'] },
    errors: [
      { original: 'Yo soy estudiar', correction: 'Yo estoy estudiando', explanation: 'Use "estar" for ongoing actions with gerund' }
    ],
    suggestions: [
      { type: 'vocabulary', item: 'estudiar', example: 'Me gusta estudiar español.' },
      { type: 'vocabulary', item: 'aprender', example: 'Quiero aprender más palabras.' }
    ]
  });
  
  // State for new vocabulary
  const [newVocabulary, setNewVocabulary] = useState([
    { word: 'hablar', level: 'A1', mastery: 0.4 },
    { word: 'querer', level: 'A1', mastery: 0.7 }
  ]);
  
  // State for translations visibility
  const [showTranslations, setShowTranslations] = useState(false);
  
  // State for romanization
  const [showRomanization, setShowRomanization] = useState(false);
  
  // Reference for message container to scroll to bottom
  const messagesEndRef = useRef(null);
  
  // Scroll to bottom whenever messages update
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  
  // Handle sending a new message
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    
    // Add user message
    const userMessage = {
      id: messages.length + 1,
      sender: 'user',
      content: newMessage,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    setMessages([...messages, userMessage]);
    setNewMessage('');
    
    // Simulate AI response after a delay
    setTimeout(() => {
      const aiMessage = {
        id: messages.length + 2,
        sender: 'ai',
        content: 'Lo siento, soy un componente de demostración y no puedo generar respuestas reales.',
        translation: 'Sorry, I am a demonstration component and cannot generate real responses.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      
      setMessages(prevMessages => [...prevMessages, aiMessage]);
      
      // Simulate updated insights
      setInsights(prev => ({
        ...prev,
        fluency: Math.min(1, prev.fluency + 0.05)
      }));
    }, 1000);
  };
  
  // Toggle translations visibility
  const toggleTranslations = () => {
    setShowTranslations(!showTranslations);
  };
  
  // Toggle romanization
  const toggleRomanization = () => {
    setShowRomanization(!showRomanization);
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <header className="bg-white shadow-sm">
        <div className="flex justify-between items-center px-8 py-4">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-semibold text-gray-800">Conversation</h1>
            <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm">General Practice</span>
          </div>
          <div className="flex gap-2">
            <button
              className="px-3 py-1 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 transition"
              onClick={toggleRomanization}
            >
              {showRomanization ? 'Hide Romanization' : 'Show Romanization'}
            </button>
            <button
              className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition"
              onClick={toggleTranslations}
            >
              {showTranslations ? 'Hide Translations' : 'Show Translations'}
            </button>
          </div>
        </div>
      </header>
      
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 flex flex-col">
          {/* Messages container */}
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="space-y-4 pb-4">
              {messages.map(message => (
                <div 
                  key={message.id} 
                  className={`flex flex-col max-w-[80%] p-3 rounded-lg ${
                    message.sender === 'user' 
                      ? 'self-end ml-auto bg-blue-500 text-white rounded-br-none' 
                      : 'self-start mr-auto bg-gray-100 text-gray-800 rounded-bl-none'
                  }`}
                >
                  <div className="message-content">
                    {showRomanization && message.sender === 'ai' ? (
                      <div>
                        <div className="font-medium">{message.content}</div>
                        <div className="text-sm italic text-gray-600 mt-1">
                          {'(romanized text would appear here)'}
                        </div>
                      </div>
                    ) : (
                      message.content
                    )}
                  </div>
                  
                  {message.sender === 'ai' && message.translation && showTranslations && (
                    <div className={`message-translation text-sm p-2 mt-2 rounded ${
                      message.sender === 'user' 
                        ? 'bg-blue-600 bg-opacity-50' 
                        : 'bg-gray-200'
                    }`}>
                      {message.translation}
                    </div>
                  )}
                  
                  <div className={`flex justify-between text-xs mt-1 ${
                    message.sender === 'user' ? 'text-blue-100' : 'text-gray-500'
                  }`}>
                    <span>{message.timestamp}</span>
                    {message.sender === 'ai' && !showTranslations && message.translation && (
                      <button className="hover:underline">Translate</button>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </div>
          
          {/* Message input */}
          <div className="p-4 bg-white shadow-md">
            <form onSubmit={handleSendMessage} className="flex flex-col">
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
                placeholder="Type your message here..."
                rows="2"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
                >
                  Send
                </button>
              </div>
            </form>
          </div>
        </div>
        
        {/* Insights sidebar */}
        <div className="w-80 bg-white border-l border-gray-200 p-6 overflow-y-auto">
          <div className="mb-8">
            <h3 className="text-lg font-medium mb-4 pb-2 border-b border-gray-200">Learning Insights</h3>
            
            {/* Fluency Score */}
            <div className="mb-4">
              <h4 className="font-medium mb-2">Fluency Score</h4>
              <div className={`h-2 bg-gray-200 rounded-full overflow-hidden mb-1 ${
                insights.fluency > 0.7 ? 'bg-green-100' : 
                insights.fluency > 0.4 ? 'bg-yellow-100' : 'bg-red-100'
              }`}>
                <div 
                  className={`h-full rounded-full ${
                    insights.fluency > 0.7 ? 'bg-green-500' : 
                    insights.fluency > 0.4 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${insights.fluency * 100}%` }}
                ></div>
              </div>
              <div className="text-right text-sm">{Math.round(insights.fluency * 100)}%</div>
            </div>
            
            {/* Grammar Structures */}
            <div className="mb-4">
              <h4 className="font-medium mb-2">Grammar Structures Used</h4>
              <ul className="text-sm space-y-1 pl-5 list-disc">
                {insights.grammar.structures.map((structure, index) => (
                  <li key={index}>{structure}</li>
                ))}
              </ul>
            </div>
            
            {/* Errors */}
            {insights.errors.length > 0 && (
              <div className="mb-4">
                <h4 className="font-medium mb-2">Corrections</h4>
                <ul className="text-sm space-y-3">
                  {insights.errors.map((error, index) => (
                    <li key={index} className="bg-gray-50 p-2 rounded">
                      <div className="text-red-500 line-through">{error.original}</div>
                      <div className="text-green-600 font-medium">{error.correction}</div>
                      <div className="text-gray-500 text-xs mt-1">{error.explanation}</div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          
          {/* New Vocabulary */}
          <div className="mb-8">
            <h3 className="text-lg font-medium mb-4 pb-2 border-b border-gray-200">New Vocabulary</h3>
            <div className="space-y-3">
              {newVocabulary.map((word, index) => {
                const masteryPercent = word.mastery * 100;
                let masteryClass = 'bg-red-500';
                if (word.mastery > 0.7) masteryClass = 'bg-green-500';
                else if (word.mastery > 0.4) masteryClass = 'bg-yellow-500';
                
                return (
                  <div key={index} className="grid grid-cols-3 gap-2 p-2 bg-gray-50 rounded">
                    <div className="font-medium">{word.word}</div>
                    <div className="text-xs text-gray-500 self-center">{word.level}</div>
                    <div className="h-1.5 bg-gray-200 rounded-full self-center">
                      <div 
                        className={`h-full rounded-full ${masteryClass}`}
                        style={{ width: `${masteryPercent}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* Suggested Responses */}
          <div>
            <h3 className="text-lg font-medium mb-4 pb-2 border-b border-gray-200">Suggested Responses</h3>
            <div className="space-y-3">
              {insights.suggestions.map((suggestion, index) => (
                <div key={index} className="p-2 bg-gray-50 rounded cursor-pointer hover:bg-gray-100">
                  <div className="font-medium">{suggestion.item}</div>
                  <div className="text-sm text-gray-500 italic">{suggestion.example}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Conversation;