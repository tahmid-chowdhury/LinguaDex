import React, { useState, useEffect } from 'react';
import { activityService } from '../services/api';

const Activities = () => {
  const [activityType, setActivityType] = useState('conversation');
  const [topic, setTopic] = useState('');
  const [activity, setActivity] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [answers, setAnswers] = useState({});
  const [results, setResults] = useState(null);
  const [showingAnswers, setShowingAnswers] = useState(false);

  const generateActivity = async () => {
    setLoading(true);
    setError('');
    setActivity(null);
    setResults(null);
    setShowingAnswers(false);
    
    try {
      const data = await activityService.generateActivity(activityType, topic);
      setActivity(data);
      
      // Initialize answers for fill-in-blanks
      if (data.type === 'fill-in-blanks') {
        const initialAnswers = {};
        data.answers.forEach((_, index) => {
          initialAnswers[index] = '';
        });
        setAnswers(initialAnswers);
      }
    } catch (err) {
      setError('Failed to generate activity. Please try again.');
      console.error('Error generating activity:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (index, value) => {
    setAnswers({ ...answers, [index]: value });
  };

  const checkAnswers = () => {
    if (!activity || activity.type !== 'fill-in-blanks') return;
    
    const correctCount = activity.answers.filter((answer, index) => 
      answers[index].trim().toLowerCase() === answer.toLowerCase()
    ).length;
    
    setResults({
      correct: correctCount,
      total: activity.answers.length,
      percentage: Math.round((correctCount / activity.answers.length) * 100)
    });
  };

  const showAnswers = () => {
    if (!activity || activity.type !== 'fill-in-blanks') return;
    
    const correctAnswers = {};
    activity.answers.forEach((answer, index) => {
      correctAnswers[index] = answer;
    });
    
    setAnswers(correctAnswers);
    setShowingAnswers(true);
  };

  // Render blank inputs for fill-in-blanks activity
  const renderTextWithBlanks = () => {
    if (!activity || activity.type !== 'fill-in-blanks') return null;
    
    let blanksCount = 0;
    const textSegments = activity.text.split('______');
    
    return textSegments.map((segment, index) => {
      if (index === textSegments.length - 1) {
        return <span key={index}>{segment}</span>;
      }
      
      const currentBlankIndex = blanksCount++;
      const isCorrect = results && answers[currentBlankIndex].trim().toLowerCase() === activity.answers[currentBlankIndex].toLowerCase();
      const isIncorrect = results && !isCorrect;
      
      return (
        <React.Fragment key={index}>
          {segment}
          <span className="blank-container">
            <input
              type="text"
              className={`blank-input ${isCorrect ? 'correct' : ''} ${isIncorrect ? 'incorrect' : ''} ${showingAnswers ? 'shown-answer' : ''}`}
              value={answers[currentBlankIndex] || ''}
              onChange={(e) => handleInputChange(currentBlankIndex, e.target.value)}
              disabled={showingAnswers}
            />
            {isCorrect && <span className="feedback-icon">✓</span>}
            {isIncorrect && <span className="feedback-icon">✗</span>}
          </span>
        </React.Fragment>
      );
    });
  };

  return (
    <div className="activities-container">
      <h1 className="text-2xl font-bold mb-6">Practice Activities</h1>
      
      <div className="activity-generator">
        <h2 className="text-xl font-semibold mb-4">Generate New Activity</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label htmlFor="activity-type" className="block text-gray-700 font-medium mb-2">
              Activity Type
            </label>
            <select
              id="activity-type"
              value={activityType}
              onChange={(e) => setActivityType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="conversation">Conversation Practice</option>
              <option value="fill-in-blanks">Fill in the Blanks</option>
              <option value="reading">Reading Comprehension</option>
            </select>
          </div>
          
          <div>
            <label htmlFor="activity-topic" className="block text-gray-700 font-medium mb-2">
              Topic (Optional)
            </label>
            <input
              type="text"
              id="activity-topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Travel, Food, Daily Routine"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
        </div>
        
        <button
          onClick={generateActivity}
          disabled={loading}
          className="btn btn-primary w-full md:w-auto"
        >
          {loading ? 'Generating...' : 'Generate Activity'}
        </button>
      </div>
      
      <div className="activity-display mt-6">
        {error && (
          <div className="error-message">
            <p>{error}</p>
            <button onClick={generateActivity} className="btn btn-primary mt-2">
              Try Again
            </button>
          </div>
        )}
        
        {loading && (
          <div className="loading-indicator">
            <div className="spinner"></div>
            <p>Generating your personalized activity...</p>
          </div>
        )}
        
        {activity && activity.type === 'conversation' && (
          <div className="activity-card conversation-activity">
            <h2 className="text-xl font-semibold mb-2">{activity.title}</h2>
            <p className="activity-description mb-4">{activity.description}</p>
            
            <div className="scenario-box bg-blue-50 p-4 rounded-lg mb-4">
              <h3 className="font-semibold mb-2">Scenario</h3>
              <p>{activity.scenario}</p>
            </div>
            
            {activity.key_vocabulary && activity.key_vocabulary.length > 0 && (
              <div className="vocabulary-box bg-gray-50 p-4 rounded-lg mb-4">
                <h3 className="font-semibold mb-2">Key Vocabulary</h3>
                <ul className="vocab-list list-disc pl-5">
                  {activity.key_vocabulary.map((word, index) => (
                    <li key={index}>{word}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {activity.key_phrases && activity.key_phrases.length > 0 && (
              <div className="phrases-box bg-gray-50 p-4 rounded-lg mb-4">
                <h3 className="font-semibold mb-2">Useful Phrases</h3>
                <ul className="phrase-list list-disc pl-5">
                  {activity.key_phrases.map((phrase, index) => (
                    <li key={index}>{phrase}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {activity.questions && activity.questions.length > 0 && (
              <div className="questions-box bg-gray-50 p-4 rounded-lg mb-4">
                <h3 className="font-semibold mb-2">Conversation Starters</h3>
                <ul className="question-list list-disc pl-5">
                  {activity.questions.map((question, index) => (
                    <li key={index}>{question}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {activity.hints && activity.hints.length > 0 && (
              <div className="hints-box bg-yellow-50 p-4 rounded-lg mb-4">
                <h3 className="font-semibold mb-2">Helpful Hints</h3>
                <ul className="hint-list list-disc pl-5">
                  {activity.hints.map((hint, index) => (
                    <li key={index}>{hint}</li>
                  ))}
                </ul>
              </div>
            )}
            
            <div className="activity-footer mt-6">
              <a 
                href={`/conversation?topic=${encodeURIComponent(activity.title)}`} 
                className="btn btn-primary"
              >
                Start Conversation
              </a>
            </div>
          </div>
        )}
        
        {activity && activity.type === 'fill-in-blanks' && (
          <div className="activity-card fill-in-blanks-activity">
            <h2 className="text-xl font-semibold mb-2">{activity.title}</h2>
            <p className="activity-description mb-4">{activity.description}</p>
            
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                checkAnswers();
              }}
              className="mb-4"
            >
              <div className="text-with-blanks bg-gray-50 p-4 rounded-lg mb-4">
                {renderTextWithBlanks()}
              </div>
              
              {activity.hints && activity.hints.length > 0 && (
                <div className="hints-box bg-yellow-50 p-4 rounded-lg mb-4">
                  <h3 className="font-semibold mb-2">Hints</h3>
                  <ul className="hint-list list-disc pl-5">
                    {activity.hints.map((hint, index) => (
                      <li key={index}>{hint}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              <div className="activity-footer flex flex-wrap gap-2">
                <button type="submit" className="btn btn-primary" disabled={showingAnswers}>
                  Check Answers
                </button>
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={showAnswers}
                  disabled={showingAnswers}
                >
                  Show Answers
                </button>
              </div>
            </form>
            
            {results && (
              <div className="results-container bg-white p-4 rounded-lg shadow">
                <h3 className="text-lg font-semibold mb-2">Results</h3>
                <p>You got {results.correct} out of {results.total} correct!</p>
                <div className="score-meter bg-gray-200 h-2 rounded-full overflow-hidden mt-2">
                  <div 
                    className="score-fill bg-blue-500 h-full rounded-full" 
                    style={{ width: `${results.percentage}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        )}
        
        {activity && activity.type === 'reading' && (
          <div className="activity-card reading-activity">
            <h2 className="text-xl font-semibold mb-2">{activity.title}</h2>
            <p className="activity-description mb-4">{activity.description}</p>
            
            <div className="reading-text bg-gray-50 p-4 rounded-lg mb-4">
              {activity.text}
            </div>
            
            {activity.vocabulary && activity.vocabulary.length > 0 && (
              <div className="vocabulary-box bg-gray-50 p-4 rounded-lg mb-4">
                <h3 className="font-semibold mb-2">Key Vocabulary</h3>
                <ul className="vocab-list list-none">
                  {activity.vocabulary.map((v, index) => (
                    <li key={index} className="mb-2">
                      <strong>{v.word}</strong>: {v.definition || ''}
                      {v.example && <p className="text-gray-600 text-sm italic mt-1">"{v.example}"</p>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {activity.questions && activity.questions.length > 0 && (
              <div className="questions-box bg-gray-50 p-4 rounded-lg mb-4">
                <h3 className="font-semibold mb-2">Comprehension Questions</h3>
                <ol className="question-list list-decimal pl-5">
                  {activity.questions.map((q, index) => (
                    <li key={index} className="mb-2">{q}</li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Activities;