import React, { useState } from 'react';

function Activities() {
  // State for activity generation
  const [activityType, setActivityType] = useState('conversation');
  const [activityTopic, setActivityTopic] = useState('daily routine');
  const [isLoading, setIsLoading] = useState(false);
  const [activity, setActivity] = useState(null);
  
  // Available activity types and topics
  const activityTypes = [
    { value: 'conversation', label: 'Conversation Practice' },
    { value: 'fill-in-blanks', label: 'Fill in the Blanks' },
    { value: 'reading', label: 'Reading Comprehension' },
    { value: 'writing', label: 'Writing Practice' },
  ];
  
  const topics = [
    'daily routine',
    'food and dining',
    'travel and directions',
    'shopping',
    'hobbies and interests',
    'family and relationships',
    'work and career',
    'health and wellness',
    'technology',
    'environment',
    'culture and traditions',
  ];
  
  // Generate activity
  const generateActivity = () => {
    setIsLoading(true);
    
    // Mock API call (replace with real API call later)
    setTimeout(() => {
      // Generate different mock activity based on type
      let generatedActivity;
      
      if (activityType === 'conversation') {
        generatedActivity = {
          type: 'conversation',
          title: `Conversation: ${activityTopic.charAt(0).toUpperCase() + activityTopic.slice(1)}`,
          description: `Practice having a conversation about ${activityTopic} in your target language.`,
          scenario: `You're talking with a friend about your ${activityTopic}. They're curious to learn more about your experience and preferences.`,
          keyVocabulary: [
            'hablar (to talk)',
            'preferir (to prefer)',
            'comentar (to comment)',
            'interesante (interesting)',
            'experiencia (experience)'
          ],
          keyPhrases: [
            'Me gusta mucho... (I really like...)',
            '¿Qué piensas sobre...? (What do you think about...?)',
            'En mi opinión... (In my opinion...)',
            'Normalmente, yo... (Normally, I...)'
          ],
          questions: [
            '¿Qué haces normalmente durante tu día? (What do you usually do during your day?)',
            '¿Cuál es tu parte favorita de tu rutina? (What is your favorite part of your routine?)',
            '¿Cómo podría mejorar mi rutina diaria? (How could I improve my daily routine?)'
          ],
          hints: [
            'Try to use the present tense for regular activities',
            'Use time expressions like "siempre" (always), "a veces" (sometimes)',
            'Practice asking follow-up questions'
          ]
        };
      } else if (activityType === 'fill-in-blanks') {
        generatedActivity = {
          type: 'fill-in-blanks',
          title: `Fill in the Blanks: ${activityTopic.charAt(0).toUpperCase() + activityTopic.slice(1)}`,
          description: `Complete the text about ${activityTopic} by filling in the missing words.`,
          text: 'Todos los días, me ______ a las 7 de la mañana. Primero, ______ una ducha y luego ______ el desayuno. A las 8:30, ______ al trabajo. Después del trabajo, me gusta ______ un poco antes de cenar.',
          answers: ['levanto', 'tomo', 'preparo', 'voy', 'descansar'],
          hints: [
            'Most of the missing words are verbs in the present tense',
            'Think about the daily routine vocabulary you have learned',
            'Pay attention to verb conjugation'
          ]
        };
      } else if (activityType === 'reading') {
        generatedActivity = {
          type: 'reading',
          title: `Reading: ${activityTopic.charAt(0).toUpperCase() + activityTopic.slice(1)}`,
          description: `Read the text about ${activityTopic} and answer the comprehension questions.`,
          text: 'La rutina diaria es importante para mantener un equilibrio saludable. Muchas personas comienzan su día con un buen desayuno, que les da energía para la mañana. Después, es común revisar correos electrónicos o noticias antes de comenzar a trabajar. Durante el día, es recomendable tomar pequeños descansos para mantenerse productivo. Al final del día, algunas personas prefieren hacer ejercicio, mientras otras disfrutan de tiempo tranquilo para relajarse.',
          vocabulary: [
            { word: 'rutina', definition: 'routine', example: 'Mi rutina diaria incluye ejercicio.' },
            { word: 'equilibrio', definition: 'balance', example: 'Es importante mantener un equilibrio entre trabajo y descanso.' },
            { word: 'descansos', definition: 'breaks', example: 'Tomo pequeños descansos durante el día.' },
            { word: 'productivo', definition: 'productive', example: 'Soy más productivo por la mañana.' }
          ],
          questions: [
            '¿Por qué es importante la rutina diaria según el texto?',
            '¿Qué recomendación se da para mantenerse productivo?',
            '¿Qué opciones menciona el texto para el final del día?',
            '¿Qué da energía para la mañana, según el texto?'
          ]
        };
      } else if (activityType === 'writing') {
        generatedActivity = {
          type: 'writing',
          title: `Writing: ${activityTopic.charAt(0).toUpperCase() + activityTopic.slice(1)}`,
          description: `Practice your writing skills by composing a short text about ${activityTopic}.`,
          prompt: `Write a short paragraph describing your ideal ${activityTopic}. Include at least 5 sentences and try to use vocabulary you've learned recently.`,
          vocabularySuggestions: [
            'describir (to describe)',
            'ideal (ideal)',
            'incluir (to include)',
            'imaginar (to imagine)',
            'perfecto/a (perfect)'
          ],
          grammarFocus: 'Try to use the conditional tense (would) and the future tense when appropriate.',
          lengthGuideline: '50-100 words',
          exampleStarting: `Mi ${activityTopic} ideal sería...`
        };
      }
      
      setActivity(generatedActivity);
      setIsLoading(false);
    }, 1500); // Simulate loading delay
  };
  
  // Render specific activity components based on type
  const renderActivityContent = () => {
    if (!activity) return null;
    
    switch (activity.type) {
      case 'conversation':
        return <ConversationActivity activity={activity} />;
      case 'fill-in-blanks':
        return <FillInBlanksActivity activity={activity} />;
      case 'reading':
        return <ReadingActivity activity={activity} />;
      case 'writing':
        return <WritingActivity activity={activity} />;
      default:
        return <p>Unsupported activity type</p>;
    }
  };
  
  return (
    <>
      <header className="bg-white shadow-sm">
        <div className="px-8 py-4">
          <h1 className="text-2xl font-semibold text-gray-800">Practice Activities</h1>
          <p className="text-gray-500 mt-1">Improve your language skills with interactive exercises</p>
        </div>
      </header>
      
      <div className="p-8">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h2 className="text-lg font-medium mb-4">Generate a New Activity</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="activity-type" className="block text-sm font-medium text-gray-700 mb-1">
                Activity Type
              </label>
              <select
                id="activity-type"
                value={activityType}
                onChange={(e) => setActivityType(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {activityTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label htmlFor="activity-topic" className="block text-sm font-medium text-gray-700 mb-1">
                Topic
              </label>
              <select
                id="activity-topic"
                value={activityTopic}
                onChange={(e) => setActivityTopic(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {topics.map(topic => (
                  <option key={topic} value={topic}>{topic.charAt(0).toUpperCase() + topic.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>
          
          <button
            onClick={generateActivity}
            disabled={isLoading}
            className={`mt-4 px-4 py-2 ${
              isLoading ? 'bg-gray-400' : 'bg-blue-500 hover:bg-blue-600'
            } text-white rounded transition`}
          >
            {isLoading ? 'Generating...' : 'Generate Activity'}
          </button>
        </div>
        
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin"></div>
            <p className="mt-4 text-gray-600">Generating your personalized activity...</p>
          </div>
        ) : activity ? (
          <div className="bg-white rounded-lg shadow-sm p-6">
            {renderActivityContent()}
          </div>
        ) : null}
        
        <div className="mt-8 bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-medium mb-4">Suggested Activities</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <SuggestedActivity
              title="Basic Greetings"
              type="conversation"
              difficulty="Beginner"
              description="Practice common greetings and introductions"
            />
            <SuggestedActivity
              title="Restaurant Vocabulary"
              type="fill-in-blanks"
              difficulty="Intermediate"
              description="Complete sentences about ordering food and dining out"
            />
            <SuggestedActivity
              title="Travel Blog"
              type="reading"
              difficulty="Advanced"
              description="Read a blog post about traveling through Spain"
            />
          </div>
        </div>
      </div>
    </>
  );
}

// Sub-component for Conversation Activities
function ConversationActivity({ activity }) {
  return (
    <div className="activity-card conversation-activity">
      <h2 className="text-xl font-semibold mb-2">{activity.title}</h2>
      <p className="text-gray-600 mb-4">{activity.description}</p>
      
      <div className="bg-blue-50 p-4 rounded-md mb-4">
        <h3 className="font-medium text-blue-800 mb-2">Scenario</h3>
        <p>{activity.scenario}</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="bg-gray-50 p-4 rounded-md">
          <h3 className="font-medium mb-2">Key Vocabulary</h3>
          <ul className="list-disc pl-5 space-y-1">
            {activity.keyVocabulary.map((word, index) => (
              <li key={index}>{word}</li>
            ))}
          </ul>
        </div>
        
        <div className="bg-gray-50 p-4 rounded-md">
          <h3 className="font-medium mb-2">Useful Phrases</h3>
          <ul className="list-disc pl-5 space-y-1">
            {activity.keyPhrases.map((phrase, index) => (
              <li key={index}>{phrase}</li>
            ))}
          </ul>
        </div>
      </div>
      
      <div className="bg-gray-50 p-4 rounded-md mb-4">
        <h3 className="font-medium mb-2">Conversation Starters</h3>
        <ul className="list-disc pl-5 space-y-1">
          {activity.questions.map((question, index) => (
            <li key={index}>{question}</li>
          ))}
        </ul>
      </div>
      
      {activity.hints && (
        <div className="bg-yellow-50 p-4 rounded-md mb-4">
          <h3 className="font-medium text-yellow-800 mb-2">Helpful Hints</h3>
          <ul className="list-disc pl-5 space-y-1">
            {activity.hints.map((hint, index) => (
              <li key={index}>{hint}</li>
            ))}
          </ul>
        </div>
      )}
      
      <div className="mt-6">
        <a 
          href={`/conversation?topic=${encodeURIComponent(activity.title)}`}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
        >
          Start Conversation
        </a>
      </div>
    </div>
  );
}

// Sub-component for Fill-in-Blanks Activities
function FillInBlanksActivity({ activity }) {
  const [userAnswers, setUserAnswers] = useState(Array(activity.answers.length).fill(''));
  const [results, setResults] = useState(null);
  const [showAnswers, setShowAnswers] = useState(false);
  
  const handleInputChange = (index, value) => {
    const newAnswers = [...userAnswers];
    newAnswers[index] = value;
    setUserAnswers(newAnswers);
  };
  
  const checkAnswers = (e) => {
    e.preventDefault();
    
    let correctCount = 0;
    const answerResults = userAnswers.map((answer, index) => {
      const isCorrect = answer.toLowerCase().trim() === activity.answers[index].toLowerCase();
      if (isCorrect) correctCount++;
      return isCorrect;
    });
    
    setResults({
      answerResults,
      correctCount,
      total: activity.answers.length
    });
  };
  
  // Replace blanks with input fields
  const renderTextWithBlanks = () => {
    let textParts = activity.text.split('______');
    let result = [];
    
    textParts.forEach((part, index) => {
      result.push(<span key={`text-${index}`}>{part}</span>);
      
      if (index < activity.answers.length) {
        const answerClass = results ? 
          (results.answerResults[index] ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50') : 
          'border-blue-300 bg-blue-50';
          
        result.push(
          <span key={`blank-${index}`} className="inline-block mx-1">
            <input
              type="text"
              value={showAnswers ? activity.answers[index] : userAnswers[index]}
              onChange={(e) => handleInputChange(index, e.target.value)}
              disabled={showAnswers}
              className={`w-32 text-center py-1 border-b-2 rounded ${answerClass} focus:outline-none`}
            />
            {results && (
              <span className="ml-1">
                {results.answerResults[index] ? '✓' : '✗'}
              </span>
            )}
          </span>
        );
      }
    });
    
    return result;
  };
  
  return (
    <div className="activity-card fill-in-blanks-activity">
      <h2 className="text-xl font-semibold mb-2">{activity.title}</h2>
      <p className="text-gray-600 mb-4">{activity.description}</p>
      
      <form onSubmit={checkAnswers} className="mb-4">
        <div className="bg-gray-50 p-6 rounded-md mb-4 text-lg leading-relaxed">
          {renderTextWithBlanks()}
        </div>
        
        {activity.hints && (
          <div className="bg-yellow-50 p-4 rounded-md mb-4">
            <h3 className="font-medium text-yellow-800 mb-2">Hints</h3>
            <ul className="list-disc pl-5 space-y-1">
              {activity.hints.map((hint, index) => (
                <li key={index}>{hint}</li>
              ))}
            </ul>
          </div>
        )}
        
        <div className="flex space-x-3 mt-6">
          <button
            type="submit"
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
            disabled={showAnswers}
          >
            Check Answers
          </button>
          <button
            type="button"
            onClick={() => setShowAnswers(true)}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition"
          >
            Show Answers
          </button>
        </div>
      </form>
      
      {results && (
        <div className="bg-blue-50 p-4 rounded-md">
          <h3 className="font-medium text-blue-800 mb-2">Results</h3>
          <p>You got {results.correctCount} out of {results.total} correct!</p>
          <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2 mb-1">
            <div 
              className="bg-blue-600 h-2.5 rounded-full" 
              style={{ width: `${(results.correctCount / results.total) * 100}%` }}
            ></div>
          </div>
          {results.correctCount === results.total ? (
            <p className="text-green-600 mt-2">Great job! Perfect score!</p>
          ) : results.correctCount >= results.total / 2 ? (
            <p className="text-blue-600 mt-2">Good work! Try again to get them all.</p>
          ) : (
            <p className="text-yellow-600 mt-2">Keep practicing! Review the vocabulary.</p>
          )}
        </div>
      )}
    </div>
  );
}

// Sub-component for Reading Activities
function ReadingActivity({ activity }) {
  return (
    <div className="activity-card reading-activity">
      <h2 className="text-xl font-semibold mb-2">{activity.title}</h2>
      <p className="text-gray-600 mb-4">{activity.description}</p>
      
      <div className="bg-gray-50 p-6 rounded-md mb-4 text-lg leading-relaxed">
        {activity.text}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-md">
          <h3 className="font-medium text-blue-800 mb-3">Key Vocabulary</h3>
          <ul className="space-y-3">
            {activity.vocabulary.map((item, index) => (
              <li key={index} className="pb-2 border-b border-blue-100 last:border-0">
                <strong className="font-medium">{item.word}:</strong> {item.definition}
                {item.example && (
                  <p className="text-sm text-blue-700 mt-1 italic">"{item.example}"</p>
                )}
              </li>
            ))}
          </ul>
        </div>
        
        <div className="bg-indigo-50 p-4 rounded-md">
          <h3 className="font-medium text-indigo-800 mb-3">Comprehension Questions</h3>
          <ol className="list-decimal pl-5 space-y-2">
            {activity.questions.map((question, index) => (
              <li key={index}>{question}</li>
            ))}
          </ol>
        </div>
      </div>
      
      <div className="bg-gray-50 p-4 rounded-md">
        <h3 className="font-medium mb-3">Your Notes</h3>
        <textarea
          placeholder="Type your notes or answers to the questions here..."
          className="w-full h-32 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        ></textarea>
      </div>
    </div>
  );
}

// Sub-component for Writing Activities
function WritingActivity({ activity }) {
  return (
    <div className="activity-card writing-activity">
      <h2 className="text-xl font-semibold mb-2">{activity.title}</h2>
      <p className="text-gray-600 mb-4">{activity.description}</p>
      
      <div className="bg-purple-50 p-4 rounded-md mb-4">
        <h3 className="font-medium text-purple-800 mb-2">Writing Prompt</h3>
        <p>{activity.prompt}</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="bg-gray-50 p-4 rounded-md">
          <h3 className="font-medium mb-2">Vocabulary Suggestions</h3>
          <ul className="list-disc pl-5 space-y-1">
            {activity.vocabularySuggestions.map((word, index) => (
              <li key={index}>{word}</li>
            ))}
          </ul>
        </div>
        
        <div className="bg-gray-50 p-4 rounded-md">
          <h3 className="font-medium mb-2">Guidelines</h3>
          <p><strong>Grammar Focus:</strong> {activity.grammarFocus}</p>
          <p className="mt-2"><strong>Length:</strong> {activity.lengthGuideline}</p>
          <p className="mt-2"><strong>Example Starting:</strong> "{activity.exampleStarting}"</p>
        </div>
      </div>
      
      <div className="mt-4">
        <label htmlFor="writing-response" className="block text-sm font-medium text-gray-700 mb-1">
          Your Response
        </label>
        <textarea
          id="writing-response"
          placeholder="Write your response here..."
          className="w-full h-48 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        ></textarea>
      </div>
      
      <div className="flex justify-end mt-4">
        <button className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition">
          Save and Submit
        </button>
      </div>
    </div>
  );
}

// Suggested Activity Card Component
function SuggestedActivity({ title, type, difficulty, description }) {
  return (
    <div className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-medium">{title}</h3>
        <span className={`px-2 py-1 text-xs rounded-full ${
          difficulty === 'Beginner' ? 'bg-green-100 text-green-800' :
          difficulty === 'Intermediate' ? 'bg-yellow-100 text-yellow-800' : 
          'bg-red-100 text-red-800'
        }`}>
          {difficulty}
        </span>
      </div>
      <p className="text-sm text-gray-600 mb-3">{description}</p>
      <div className="flex items-center text-sm text-gray-500">
        <span className="inline-flex items-center">
          {type === 'conversation' && (
            <><span className="mr-1">💬</span> Conversation</>
          )}
          {type === 'fill-in-blanks' && (
            <><span className="mr-1">✏️</span> Fill-in-Blanks</>
          )}
          {type === 'reading' && (
            <><span className="mr-1">📚</span> Reading</>
          )}
        </span>
      </div>
    </div>
  );
}

export default Activities;