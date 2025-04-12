import React, { useEffect, useState } from 'react';
import { authService } from '../../services/api';

function Dashboard() {
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    // Get current user information
    const userData = authService.getCurrentUser();
    if (userData) {
      setUser(userData);
    }
  }, []);
  
  // Function to handle logout
  const handleLogout = () => {
    authService.logout();
    window.location.href = '/';
  };

  // Mock data - in a real app, this would be fetched from an API
  const stats = {
    dailyStreak: 7,
    wordsLearned: 128,
    minutesPracticed: 45,
  };

  const level = {
    current: 4,
    progress: 65, // percentage
  };

  const practiceOptions = [
    { icon: '💬', title: 'Conversation', link: '/conversation' },
    { icon: '📝', title: 'Writing', link: '/activities?type=writing' },
    { icon: '🎧', title: 'Listening', link: '/activities?type=listening' },
    { icon: '📖', title: 'Reading', link: '/activities?type=reading' }
  ];

  const suggestedTopics = [
    { title: 'Daily Routine', link: '/conversation?topic=daily-routine' },
    { title: 'Food & Restaurants', link: '/conversation?topic=food' },
    { title: 'Travel Plans', link: '/conversation?topic=travel' }
  ];

  const recentVocabulary = [
    { word: 'hola', translation: 'hello', proficiency: 85 },
    { word: 'gracias', translation: 'thank you', proficiency: 75 },
    { word: 'por favor', translation: 'please', proficiency: 60 }
  ];

  const recentConversations = [
    { topic: 'Weather and Seasons', date: '2023-11-15', link: '/conversation/1' },
    { topic: 'Family and Friends', date: '2023-11-12', link: '/conversation/2' }
  ];

  const recommendations = [
    { 
      icon: '📚', 
      text: 'Try practicing vocabulary from your "Food" collection - your recall is dropping',
      link: '/vocabulary?collection=food'
    },
    {
      icon: '🎯',
      text: 'You\'re making good progress with past tense verbs - ready for a challenge?',
      link: '/activities?focus=past-tense'
    }
  ];
  
  // Format date for display
  const today = new Date();
  const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const formattedDate = today.toLocaleDateString('en-US', dateOptions);

  return (
    <>
      <header className="bg-white shadow-sm">
        <div className="flex justify-between items-center px-8 py-4">
          <h1 className="text-2xl font-semibold text-gray-800">Dashboard</h1>
          <div className="flex items-center">
            {user && (
              <span className="text-gray-600 mr-4">
                Hello, {user.username}
              </span>
            )}
            <span className="text-gray-500 mr-4">{formattedDate}</span>
            <button 
              onClick={handleLogout}
              className="px-4 py-1 text-sm bg-red-50 text-red-700 rounded-md hover:bg-red-100"
            >
              Logout
            </button>
          </div>
        </div>
      </header>
      
      <main className="p-8 overflow-y-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Summary Card */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4">Your Summary</h2>
            
            <div className="flex justify-between mb-6">
              <div className="text-center">
                <span className="block text-2xl font-bold text-blue-500">{stats.dailyStreak}</span>
                <span className="text-sm text-gray-500">Day Streak</span>
              </div>
              <div className="text-center">
                <span className="block text-2xl font-bold text-blue-500">{stats.wordsLearned}</span>
                <span className="text-sm text-gray-500">Words Learned</span>
              </div>
              <div className="text-center">
                <span className="block text-2xl font-bold text-blue-500">{stats.minutesPracticed}</span>
                <span className="text-sm text-gray-500">Minutes Today</span>
              </div>
            </div>
            
            <div className="mt-4">
              <div className="flex justify-between mb-2">
                <span>Level {level.current}</span>
                <span>{level.progress}%</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full">
                <div 
                  className="h-full bg-blue-500 rounded-full" 
                  style={{ width: `${level.progress}%` }}
                ></div>
              </div>
            </div>
          </div>
          
          {/* Practice Options Card */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4">Practice Now</h2>
            <div className="grid grid-cols-2 gap-4">
              {practiceOptions.map((option, index) => (
                <a 
                  key={index}
                  href={option.link}
                  className="flex flex-col items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition transform hover:-translate-y-1"
                >
                  <span className="text-2xl mb-2">{option.icon}</span>
                  <span className="text-sm">{option.title}</span>
                </a>
              ))}
            </div>
          </div>
          
          {/* Suggested Topics Card */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4">Conversation Topics</h2>
            <ul className="space-y-2">
              {suggestedTopics.map((topic, index) => (
                <li key={index}>
                  <a 
                    href={topic.link}
                    className="block p-3 bg-gray-50 rounded-md hover:bg-gray-100 transition"
                  >
                    {topic.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          
          {/* Recent Vocabulary Card */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4">Recent Vocabulary</h2>
            <div className="space-y-3">
              {recentVocabulary.map((word, index) => (
                <div key={index} className="p-3 bg-gray-50 rounded-md">
                  <div className="font-medium">{word.word}</div>
                  <div className="text-sm text-gray-500 mb-1">{word.translation}</div>
                  <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${
                        word.proficiency > 70 ? 'bg-green-500' : 
                        word.proficiency > 40 ? 'bg-yellow-500' : 'bg-red-500'
                      }`} 
                      style={{ width: `${word.proficiency}%` }}
                    ></div>
                  </div>
                </div>
              ))}
              <a 
                href="/vocabulary" 
                className="block text-center text-blue-500 hover:text-blue-700 transition mt-4"
              >
                View all vocabulary
              </a>
            </div>
          </div>
          
          {/* Recent Conversations Card */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4">Recent Conversations</h2>
            <ul className="space-y-2">
              {recentConversations.map((conv, index) => (
                <li key={index}>
                  <a 
                    href={conv.link}
                    className="flex justify-between items-center p-3 bg-gray-50 rounded-md hover:bg-gray-100 transition"
                  >
                    <span>{conv.topic}</span>
                    <span className="text-xs text-gray-500">{conv.date}</span>
                  </a>
                </li>
              ))}
              <a 
                href="/conversation" 
                className="block text-center text-blue-500 hover:text-blue-700 transition mt-4"
              >
                Start a new conversation
              </a>
            </ul>
          </div>
          
          {/* Personalized Recommendations Card */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4">Recommendations</h2>
            <div className="space-y-4">
              {recommendations.map((rec, index) => (
                <a 
                  key={index}
                  href={rec.link}
                  className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                >
                  <span className="text-xl">{rec.icon}</span>
                  <span className="text-sm">{rec.text}</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

export default Dashboard;